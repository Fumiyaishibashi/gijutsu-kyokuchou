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
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'us.anthropic.claude-sonnet-4-5-20250514-v1:0')

# AWSクライアント（遅延初期化）
s3_client = None
bedrock_runtime = None
dynamodb = None


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


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    S3イベントから画像を取得し、Bedrockで分析
    
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
        
        # Bedrockで分析
        result = analyze_with_bedrock(image_base64)
        logger.info(f"分析完了: {len(result.get('equipment', []))}個の機器を検出")
        
        # DynamoDBに結果を保存
        save_result_to_dynamodb(key, result)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': '分析完了',
                'imageKey': key,
                'equipmentCount': len(result.get('equipment', []))
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


def analyze_with_bedrock(image_base64: str) -> Dict[str, Any]:
    """
    Bedrockで画像を分析
    
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


def parse_bedrock_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Bedrock応答を解析してバリデーション
    
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
