"""
技術局長 - 画像分析Lambda関数

S3イベントをトリガーとして画像を取得し、AWS Bedrockで分析する
"""

import json
import boto3
import base64
import os
import logging
import traceback
from typing import Dict, List, Any
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

# ロガーの設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 環境変数
RESULTS_TABLE_NAME = os.environ.get('RESULTS_TABLE_NAME')
BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'us.anthropic.claude-sonnet-4-5-20250929-v1:0')

# AWSクライアント（遅延初期化）
s3_client = None
bedrock_runtime = None
dynamodb = None
rekognition_client = None


def get_s3_client():
    """S3クライアントを取得（遅延初期化）"""
    global s3_client
    if s3_client is None:
        s3_client = boto3.client('s3')
    return s3_client


def get_bedrock_runtime():
    """Bedrock Runtimeクライアントを取得（遅延初期化）"""
    global bedrock_runtime
    if bedrock_runtime is None:
        bedrock_runtime = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
    return bedrock_runtime


def get_dynamodb():
    """DynamoDBリソースを取得（遅延初期化）"""
    global dynamodb
    if dynamodb is None:
        dynamodb = boto3.resource('dynamodb')
    return dynamodb


def get_rekognition_client():
    """Rekognitionクライアントを取得（遅延初期化）"""
    global rekognition_client
    if rekognition_client is None:
        rekognition_client = boto3.client('rekognition')
    return rekognition_client


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    S3イベントから画像を取得し、RekognitionとBedrockで分析
    
    Args:
        event: S3イベント通知
        context: Lambda実行コンテキスト
    
    Returns:
        分析結果のJSON
    """
    try:
        logger.info(f"イベント受信: {json.dumps(event)}")
        
        # S3イベントから画像情報を取得
        bucket, key = extract_s3_info(event)
        logger.info(f"画像取得: bucket={bucket}, key={key}")
        
        # S3から画像を取得
        image_bytes = get_image_from_s3(bucket, key)
        logger.info(f"画像サイズ: {len(image_bytes)} bytes")
        
        # 画像をBase64エンコード
        image_base64 = encode_image_to_base64(image_bytes)
        
        # Rekognitionで物体検出
        rekognition_result = detect_objects_with_rekognition(bucket, key)
        logger.info(f"Rekognition検出: {len(rekognition_result)}個の物体")
        
        # Claudeで機器識別とリスク判定
        claude_result = analyze_equipment_with_claude(image_base64, rekognition_result)
        logger.info(f"Claude識別: {len(claude_result.get('equipment', []))}個の機器")
        
        # 結果をマージ
        final_result = merge_results(rekognition_result, claude_result)
        logger.info(f"分析完了: {len(final_result.get('equipment', []))}個の機器を検出")
        
        # DynamoDBに結果を保存
        save_result_to_dynamodb(key, final_result)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': '分析完了',
                'imageKey': key,
                'equipmentCount': len(final_result.get('equipment', []))
            })
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        logger.error(f"AWS APIエラー: {error_code}", exc_info=True)
        
        if error_code == 'NoSuchKey':
            return error_response(404, '画像が見つかりませんでした')
        elif error_code == 'AccessDenied':
            return error_response(403, 'アクセスが拒否されました')
        else:
            return error_response(500, 'サーバーエラーが発生しました')
            
    except TimeoutError:
        logger.error("Bedrockタイムアウト", exc_info=True)
        return error_response(504, '分析がタイムアウトしました')
        
    except Exception as e:
        logger.error(f"予期しないエラー: {str(e)}", exc_info=True)
        logger.error(traceback.format_exc())
        return error_response(500, '予期しないエラーが発生しました')


def extract_s3_info(event: Dict[str, Any]) -> tuple:
    """
    S3イベントからバケット名とキーを抽出
    
    Args:
        event: S3イベント通知
    
    Returns:
        (bucket, key)のタプル
    """
    record = event['Records'][0]
    bucket = record['s3']['bucket']['name']
    key = record['s3']['object']['key']
    return bucket, key


def get_image_from_s3(bucket: str, key: str) -> bytes:
    """
    S3から画像を取得
    
    Args:
        bucket: S3バケット名
        key: S3オブジェクトキー
    
    Returns:
        画像のバイトデータ
    """
    try:
        s3 = get_s3_client()
        response = s3.get_object(Bucket=bucket, Key=key)
        return response['Body'].read()
    except ClientError as e:
        logger.error(f"S3画像取得エラー: {e}")
        raise


def encode_image_to_base64(image_bytes: bytes) -> str:
    """
    画像をBase64エンコード
    
    Args:
        image_bytes: 画像のバイトデータ
    
    Returns:
        Base64エンコードされた文字列
    """
    return base64.b64encode(image_bytes).decode('utf-8')


def detect_objects_with_rekognition(bucket: str, key: str) -> List[Dict[str, Any]]:
    """
    AWS Rekognitionで物体検出を実行
    
    Args:
        bucket: S3バケット名
        key: S3オブジェクトキー
    
    Returns:
        検出された物体のリスト（バウンディングボックス座標付き）
    """
    try:
        rekognition = get_rekognition_client()
        
        # アプローチC: 検出感度を上げる（MinConfidence=50, MaxLabels=30）
        response = rekognition.detect_labels(
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            MaxLabels=30,
            MinConfidence=50,
            Features=['GENERAL_LABELS']
        )
        
        detected_objects = []
        for label in response['Labels']:
            # Instancesがある場合のみ（バウンディングボックス付き）
            for instance in label.get('Instances', []):
                bbox = instance['BoundingBox']
                detected_objects.append({
                    'label': label['Name'],
                    'confidence': instance['Confidence'],
                    'bbox': {
                        'x': bbox['Left'] * 100,      # パーセンテージに変換
                        'y': bbox['Top'] * 100,
                        'width': bbox['Width'] * 100,
                        'height': bbox['Height'] * 100
                    }
                })
        
        logger.info(f"Rekognition検出: {len(detected_objects)}個の物体")
        return detected_objects
        
    except ClientError as e:
        logger.error(f"Rekognition APIエラー: {e}")
        raise
    except Exception as e:
        logger.error(f"Rekognition検出エラー: {e}")
        raise


def error_response(status_code: int, message: str) -> dict:
    """
    エラーレスポンスを生成
    
    Args:
        status_code: HTTPステータスコード
        message: エラーメッセージ
    
    Returns:
        エラーレスポンス
    """
    return {
        'statusCode': status_code,
        'body': json.dumps({
            'error': message
        })
    }


def build_analysis_prompt() -> str:
    """
    AI分析用のプロンプトを構築（悲観的AI戦略）
    
    Returns:
        分析プロンプト文字列
    """
    return """あなたは放送設備の専門家です。この画像に写っている放送機器を分析してください。

以下の情報をJSON形式で返してください：
{
  "equipment": [
    {
      "name": "機器名（日本語）",
      "bbox": {
        "x": X座標（パーセンテージ 0-100）,
        "y": Y座標（パーセンテージ 0-100）,
        "width": 幅（パーセンテージ 0-100）,
        "height": 高さ（パーセンテージ 0-100）
      },
      "risk_level": "SAFE | WARNING | DANGER | UNKNOWN",
      "description": "簡潔な説明（50文字以内、日本語）"
    }
  ]
}

リスクレベルの判定基準：
- DANGER: 高電圧機器、触ると危険なもの、本番系スイッチャー
- WARNING: 不明なケーブル、確認が必要なもの、識別できない機器
- SAFE: 安全に触れるもの、電源オフのもの、低電圧機器
- UNKNOWN: 機器を識別できない場合

重要な注意事項（悲観的AI戦略）：
1. 機器の種類が不明な場合は、推測せずに "UNKNOWN" を使用してください
2. ケーブルの種類が判断できない場合は、"WARNING" を使用し、説明に「不明なケーブル。触る前に確認してください」と記載してください
3. 少しでも不確実な場合は、安全側に倒して "WARNING" または "DANGER" を選択してください
4. バウンディングボックスの座標は、画像の左上を(0,0)、右下を(100,100)とするパーセンテージで表現してください
5. 説明は簡潔に、若手技術者が理解できる言葉で記載してください
6. 画像に機器が写っていない場合は、空の配列を返してください

JSON形式のみを返し、他の説明文は含めないでください。"""


def build_equipment_identification_prompt(detected_objects: List[Dict[str, Any]]) -> str:
    """
    機器識別用のプロンプトを構築（ハイブリッド方式）
    アプローチC: Rekognition検出分の識別 + Claude追加検出
    
    Args:
        detected_objects: Rekognitionで検出された物体リスト
    
    Returns:
        プロンプト文字列
    """
    objects_summary = "\n".join([
        f"- 物体{i}: {obj['label']} (信頼度: {obj['confidence']:.1f}%)"
        for i, obj in enumerate(detected_objects)
    ])
    
    return f"""あなたは放送設備の専門家です。

画像内に以下の物体が検出されました：
{objects_summary}

**タスク1: 検出された物体の評価**
上記の検出結果の中から「放送機器」に該当するものを選別してください。

**タスク2: 追加の機器検出**
画像全体を見て、上記のリストに含まれていない放送機器があれば、それも検出してください。

以下のJSON形式で返してください：

{{
  "equipment": [
    {{
      "source": "rekognition",
      "object_index": 物体のインデックス（0から始まる整数）,
      "name": "機器名（日本語）",
      "risk_level": "SAFE | WARNING | DANGER | UNKNOWN",
      "description": "簡潔な説明（50文字以内、日本語）"
    }},
    {{
      "source": "claude",
      "name": "機器名（日本語）",
      "bbox": {{
        "x": X座標（パーセンテージ 0-100）,
        "y": Y座標（パーセンテージ 0-100）,
        "width": 幅（パーセンテージ 0-100）,
        "height": 高さ（パーセンテージ 0-100）
      }},
      "risk_level": "SAFE | WARNING | DANGER | UNKNOWN",
      "description": "簡潔な説明（50文字以内、日本語）"
    }}
  ]
}}

リスクレベルの判定基準：
- DANGER: 高電圧機器、触ると危険なもの、本番系スイッチャー
- WARNING: 不明なケーブル、確認が必要なもの、識別できない機器
- SAFE: 安全に触れるもの、電源オフのもの、低電圧機器
- UNKNOWN: 機器を識別できない場合

重要な注意事項（悲観的AI戦略）：
1. **source="rekognition"**: 上記リストの物体が放送機器の場合のみ含める。放送機器でない物体（椅子、机、壁、床、人など）は除外
2. **source="claude"**: 上記リストに含まれていない放送機器を追加検出。座標も含める
3. 機器の種類が不明な場合は、推測せずに "UNKNOWN" を使用
4. ケーブルの種類が判断できない場合は、"WARNING" を使用
5. 少しでも不確実な場合は、安全側に倒して "WARNING" または "DANGER" を選択
6. バウンディングボックスの座標は、画像の左上を(0,0)、右下を(100,100)とするパーセンテージで表現

JSON形式のみを返し、他の説明文は含めないでください。"""


def analyze_with_bedrock(image_base64: str) -> Dict[str, Any]:
    """
    Bedrockで画像を分析（旧バージョン - 座標も含む）
    
    Args:
        image_base64: Base64エンコードされた画像
    
    Returns:
        分析結果の辞書
    """
    try:
        # プロンプトの構築
        prompt = build_analysis_prompt()
        
        # Bedrock APIコール
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        }
        
        logger.info("Bedrock APIを呼び出し中...")
        bedrock = get_bedrock_runtime()
        response = bedrock.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=json.dumps(body)
        )
        
        response_body = json.loads(response['body'].read())
        logger.info(f"Bedrock応答: {json.dumps(response_body)}")
        
        # 応答を解析
        return parse_bedrock_response(response_body)
        
    except ClientError as e:
        logger.error(f"Bedrock APIエラー: {e}")
        raise
    except Exception as e:
        logger.error(f"Bedrock分析エラー: {e}")
        raise


def analyze_equipment_with_claude(
    image_base64: str, 
    detected_objects: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Claudeで機器識別とリスク判定を実行（座標は使わない）
    
    Args:
        image_base64: Base64エンコードされた画像
        detected_objects: Rekognitionで検出された物体リスト
    
    Returns:
        機器情報（名前、説明、リスクレベル、object_index）
    """
    try:
        # プロンプトの構築
        prompt = build_equipment_identification_prompt(detected_objects)
        
        # Bedrock APIコール
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        }
        
        logger.info("Claude機器識別APIを呼び出し中...")
        bedrock = get_bedrock_runtime()
        response = bedrock.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=json.dumps(body)
        )
        
        response_body = json.loads(response['body'].read())
        logger.info(f"Claude応答: {json.dumps(response_body)}")
        
        # 応答を解析
        return parse_claude_equipment_response(response_body)
        
    except ClientError as e:
        logger.error(f"Claude APIエラー: {e}")
        raise
    except Exception as e:
        logger.error(f"Claude機器識別エラー: {e}")
        raise


def parse_bedrock_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Bedrock応答を解析してバリデーション（旧バージョン）
    
    Args:
        response: Bedrock API応答
    
    Returns:
        検証済みの分析結果
    """
    try:
        # テキストコンテンツを取得
        content = response['content'][0]['text']
        logger.info(f"Bedrockテキスト応答: {content}")
        
        # JSONを抽出（マークダウンコードブロックを除去）
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        # JSONをパース
        result = json.loads(content)
        
        # スキーマ検証
        if 'equipment' not in result:
            logger.warning("equipment配列が見つかりません")
            return {'equipment': []}
        
        validated_equipment = []
        for equipment in result['equipment']:
            # 必須フィールドの検証
            if not all(key in equipment for key in ['name', 'bbox', 'risk_level', 'description']):
                logger.warning(f"必須フィールドが不足: {equipment}")
                continue
            
            # バウンディングボックスの検証
            bbox = equipment['bbox']
            if not all(key in bbox for key in ['x', 'y', 'width', 'height']):
                logger.warning(f"バウンディングボックスが不正: {bbox}")
                continue
            
            # 座標範囲の検証（0-100）
            if not all(0 <= bbox[key] <= 100 for key in ['x', 'y', 'width', 'height']):
                logger.warning(f"座標が範囲外: {bbox}")
                continue
            
            # リスクレベルの検証
            if equipment['risk_level'] not in ['SAFE', 'WARNING', 'DANGER', 'UNKNOWN']:
                logger.warning(f"不正なリスクレベル: {equipment['risk_level']}")
                equipment['risk_level'] = 'UNKNOWN'
            
            # 説明の長さ検証（100文字以内）
            if len(equipment['description']) > 100:
                logger.warning(f"説明が長すぎます: {len(equipment['description'])}文字")
                equipment['description'] = equipment['description'][:97] + '...'
            
            validated_equipment.append(equipment)
        
        return {'equipment': validated_equipment}
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON解析エラー: {e}")
        logger.error(f"応答内容: {content}")
        return {'equipment': []}
    except Exception as e:
        logger.error(f"応答解析エラー: {e}")
        return {'equipment': []}


def parse_claude_equipment_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Claude機器識別応答を解析してバリデーション（ハイブリッド方式対応）
    
    Args:
        response: Claude API応答
    
    Returns:
        検証済みの機器識別結果
    """
    try:
        # テキストコンテンツを取得
        content = response['content'][0]['text']
        logger.info(f"Claudeテキスト応答: {content}")
        
        # JSONを抽出（マークダウンコードブロックを除去）
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        
        # JSONをパース
        result = json.loads(content)
        
        # スキーマ検証
        if 'equipment' not in result:
            logger.warning("equipment配列が見つかりません")
            return {'equipment': []}
        
        validated_equipment = []
        for equipment in result['equipment']:
            source = equipment.get('source', 'rekognition')  # デフォルトはrekognition
            
            if source == 'rekognition':
                # Rekognition検出分: object_indexが必須
                if not all(key in equipment for key in ['object_index', 'name', 'risk_level', 'description']):
                    logger.warning(f"必須フィールドが不足（rekognition）: {equipment}")
                    continue
                
                # object_indexの検証
                if not isinstance(equipment['object_index'], int) or equipment['object_index'] < 0:
                    logger.warning(f"不正なobject_index: {equipment['object_index']}")
                    continue
                
            elif source == 'claude':
                # Claude追加検出分: bboxが必須
                if not all(key in equipment for key in ['name', 'bbox', 'risk_level', 'description']):
                    logger.warning(f"必須フィールドが不足（claude）: {equipment}")
                    continue
                
                # バウンディングボックスの検証
                bbox = equipment['bbox']
                if not all(key in bbox for key in ['x', 'y', 'width', 'height']):
                    logger.warning(f"バウンディングボックスが不正: {bbox}")
                    continue
                
                # 座標範囲の検証（0-100）
                if not all(0 <= bbox[key] <= 100 for key in ['x', 'y', 'width', 'height']):
                    logger.warning(f"座標が範囲外: {bbox}")
                    continue
            else:
                logger.warning(f"不正なsource: {source}")
                continue
            
            # リスクレベルの検証
            if equipment['risk_level'] not in ['SAFE', 'WARNING', 'DANGER', 'UNKNOWN']:
                logger.warning(f"不正なリスクレベル: {equipment['risk_level']}")
                equipment['risk_level'] = 'UNKNOWN'
            
            # 説明の長さ検証（100文字以内）
            if len(equipment['description']) > 100:
                logger.warning(f"説明が長すぎます: {len(equipment['description'])}文字")
                equipment['description'] = equipment['description'][:97] + '...'
            
            validated_equipment.append(equipment)
        
        return {'equipment': validated_equipment}
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON解析エラー: {e}")
        logger.error(f"応答内容: {content}")
        return {'equipment': []}
    except Exception as e:
        logger.error(f"応答解析エラー: {e}")
        return {'equipment': []}


def save_result_to_dynamodb(image_key: str, result: Dict[str, Any]) -> None:
    """
    分析結果をDynamoDBに保存
    
    Args:
        image_key: S3オブジェクトキー
        result: 分析結果
    """
    try:
        db = get_dynamodb()
        table = db.Table(RESULTS_TABLE_NAME)
        
        # TTLを設定（3日後）
        ttl = int((datetime.now() + timedelta(days=3)).timestamp())
        
        item = {
            'imageKey': image_key,
            'result': json.dumps(result),
            'ttl': ttl,
            'createdAt': int(datetime.now().timestamp()),
            'status': 'completed'
        }
        
        table.put_item(Item=item)
        logger.info(f"DynamoDBに保存完了: {image_key}")
        
    except Exception as e:
        logger.error(f"DynamoDB保存エラー: {e}")
        raise


def merge_results(
    rekognition_result: List[Dict[str, Any]], 
    claude_result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    RekognitionとClaudeの結果をマージ（ハイブリッド方式）
    
    Args:
        rekognition_result: Rekognitionの検出結果（座標付き）
        claude_result: Claudeの識別結果（機器情報 + 追加検出）
    
    Returns:
        マージされた最終結果
    """
    equipment_list = []
    
    for equipment in claude_result.get('equipment', []):
        source = equipment.get('source', 'rekognition')
        
        if source == 'rekognition':
            # Rekognition検出分: Rekognitionの正確な座標を使用
            object_index = equipment.get('object_index')
            
            if object_index is not None and 0 <= object_index < len(rekognition_result):
                rekognition_obj = rekognition_result[object_index]
                
                equipment_list.append({
                    'name': equipment['name'],
                    'bbox': rekognition_obj['bbox'],  # Rekognitionの正確な座標
                    'risk_level': equipment['risk_level'],
                    'description': equipment['description'],
                    'confidence': rekognition_obj['confidence'],
                    'source': 'rekognition'
                })
            else:
                logger.warning(f"object_indexが範囲外: {object_index} (最大: {len(rekognition_result)-1})")
        
        elif source == 'claude':
            # Claude追加検出分: Claudeの座標を使用
            equipment_list.append({
                'name': equipment['name'],
                'bbox': equipment['bbox'],  # Claudeの推測座標
                'risk_level': equipment['risk_level'],
                'description': equipment['description'],
                'confidence': 75.0,  # Claude検出の仮想信頼度
                'source': 'claude'
            })
    
    logger.info(f"結果マージ完了: {len(equipment_list)}個の機器（Rekognition: {sum(1 for e in equipment_list if e['source'] == 'rekognition')}個, Claude: {sum(1 for e in equipment_list if e['source'] == 'claude')}個）")
    return {'equipment': equipment_list}
