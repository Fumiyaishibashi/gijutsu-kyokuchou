"""
Lambda関数のユニットテスト
"""

import json
import base64
import pytest
from unittest.mock import Mock, patch, MagicMock
from handler import (
    lambda_handler,
    extract_s3_info,
    get_image_from_s3,
    encode_image_to_base64,
    build_analysis_prompt,
    parse_bedrock_response,
    save_result_to_dynamodb
)


# テスト用のサンプルデータ
SAMPLE_S3_EVENT = {
    'Records': [{
        's3': {
            'bucket': {'name': 'test-bucket'},
            'object': {'key': 'uploads/test-image.jpg'}
        }
    }]
}

SAMPLE_IMAGE_BYTES = b'fake_image_data'

SAMPLE_BEDROCK_RESPONSE = {
    'content': [{
        'text': json.dumps({
            'equipment': [
                {
                    'name': 'ビデオスイッチャー',
                    'bbox': {'x': 10, 'y': 10, 'width': 30, 'height': 40},
                    'risk_level': 'SAFE',
                    'description': '安全に操作できます'
                }
            ]
        })
    }]
}


class TestExtractS3Info:
    """S3情報抽出のテスト"""
    
    def test_extract_s3_info_success(self):
        """正常なS3イベントから情報を抽出"""
        bucket, key = extract_s3_info(SAMPLE_S3_EVENT)
        assert bucket == 'test-bucket'
        assert key == 'uploads/test-image.jpg'


class TestEncodeImageToBase64:
    """Base64エンコーディングのテスト"""
    
    def test_encode_image_to_base64(self):
        """画像をBase64エンコード"""
        result = encode_image_to_base64(SAMPLE_IMAGE_BYTES)
        assert isinstance(result, str)
        assert len(result) > 0
        
        # デコードして元に戻せることを確認
        decoded = base64.b64decode(result)
        assert decoded == SAMPLE_IMAGE_BYTES


class TestBuildAnalysisPrompt:
    """プロンプト構築のテスト"""
    
    def test_build_analysis_prompt(self):
        """プロンプトが正しく構築される"""
        prompt = build_analysis_prompt()
        assert isinstance(prompt, str)
        assert 'JSON形式' in prompt
        assert 'SAFE' in prompt
        assert 'WARNING' in prompt
        assert 'DANGER' in prompt
        assert 'UNKNOWN' in prompt
        assert '悲観的' in prompt


class TestParsBedrockResponse:
    """Bedrock応答解析のテスト"""
    
    def test_parse_valid_response(self):
        """正常な応答を解析"""
        result = parse_bedrock_response(SAMPLE_BEDROCK_RESPONSE)
        assert 'equipment' in result
        assert len(result['equipment']) == 1
        assert result['equipment'][0]['name'] == 'ビデオスイッチャー'
        assert result['equipment'][0]['risk_level'] == 'SAFE'
    
    def test_parse_response_with_markdown(self):
        """マークダウンコードブロック付きの応答を解析"""
        response = {
            'content': [{
                'text': '```json\n' + json.dumps({
                    'equipment': [
                        {
                            'name': 'テスト機器',
                            'bbox': {'x': 0, 'y': 0, 'width': 10, 'height': 10},
                            'risk_level': 'WARNING',
                            'description': 'テスト'
                        }
                    ]
                }) + '\n```'
            }]
        }
        result = parse_bedrock_response(response)
        assert len(result['equipment']) == 1
        assert result['equipment'][0]['name'] == 'テスト機器'
    
    def test_parse_invalid_json(self):
        """不正なJSONの場合は空配列を返す"""
        response = {
            'content': [{
                'text': 'invalid json'
            }]
        }
        result = parse_bedrock_response(response)
        assert result == {'equipment': []}
    
    def test_parse_missing_fields(self):
        """必須フィールドが不足している機器はスキップ"""
        response = {
            'content': [{
                'text': json.dumps({
                    'equipment': [
                        {
                            'name': '正常な機器',
                            'bbox': {'x': 0, 'y': 0, 'width': 10, 'height': 10},
                            'risk_level': 'SAFE',
                            'description': 'OK'
                        },
                        {
                            'name': '不完全な機器'
                            # bboxが不足
                        }
                    ]
                })
            }]
        }
        result = parse_bedrock_response(response)
        assert len(result['equipment']) == 1
        assert result['equipment'][0]['name'] == '正常な機器'
    
    def test_parse_invalid_bbox_range(self):
        """座標が範囲外の機器はスキップ"""
        response = {
            'content': [{
                'text': json.dumps({
                    'equipment': [
                        {
                            'name': '範囲外の機器',
                            'bbox': {'x': -10, 'y': 0, 'width': 10, 'height': 10},
                            'risk_level': 'SAFE',
                            'description': 'NG'
                        }
                    ]
                })
            }]
        }
        result = parse_bedrock_response(response)
        assert len(result['equipment']) == 0
    
    def test_parse_invalid_risk_level(self):
        """不正なリスクレベルはUNKNOWNに修正"""
        response = {
            'content': [{
                'text': json.dumps({
                    'equipment': [
                        {
                            'name': 'テスト機器',
                            'bbox': {'x': 0, 'y': 0, 'width': 10, 'height': 10},
                            'risk_level': 'INVALID',
                            'description': 'テスト'
                        }
                    ]
                })
            }]
        }
        result = parse_bedrock_response(response)
        assert result['equipment'][0]['risk_level'] == 'UNKNOWN'
    
    def test_parse_long_description(self):
        """長すぎる説明は切り詰める"""
        long_desc = 'あ' * 150
        response = {
            'content': [{
                'text': json.dumps({
                    'equipment': [
                        {
                            'name': 'テスト機器',
                            'bbox': {'x': 0, 'y': 0, 'width': 10, 'height': 10},
                            'risk_level': 'SAFE',
                            'description': long_desc
                        }
                    ]
                })
            }]
        }
        result = parse_bedrock_response(response)
        assert len(result['equipment'][0]['description']) == 100


@patch('handler.get_s3_client')
class TestGetImageFromS3:
    """S3画像取得のテスト"""
    
    def test_get_image_success(self, mock_get_s3):
        """正常に画像を取得"""
        mock_s3 = MagicMock()
        mock_get_s3.return_value = mock_s3
        
        mock_response = {
            'Body': MagicMock()
        }
        mock_response['Body'].read.return_value = SAMPLE_IMAGE_BYTES
        mock_s3.get_object.return_value = mock_response
        
        result = get_image_from_s3('test-bucket', 'test-key')
        assert result == SAMPLE_IMAGE_BYTES
        mock_s3.get_object.assert_called_once_with(
            Bucket='test-bucket',
            Key='test-key'
        )


@patch('handler.get_dynamodb')
class TestSaveResultToDynamoDB:
    """DynamoDB保存のテスト"""
    
    def test_save_result_success(self, mock_get_dynamodb):
        """正常に結果を保存"""
        mock_db = MagicMock()
        mock_table = MagicMock()
        mock_get_dynamodb.return_value = mock_db
        mock_db.Table.return_value = mock_table
        
        result = {'equipment': []}
        save_result_to_dynamodb('test-key', result)
        
        mock_table.put_item.assert_called_once()
        call_args = mock_table.put_item.call_args[1]
        item = call_args['Item']
        
        assert item['imageKey'] == 'test-key'
        assert 'ttl' in item
        assert 'createdAt' in item
        assert item['status'] == 'completed'


@patch('handler.save_result_to_dynamodb')
@patch('handler.analyze_with_bedrock')
@patch('handler.get_image_from_s3')
class TestLambdaHandler:
    """Lambda関数全体のテスト"""
    
    def test_lambda_handler_success(self, mock_get_image, mock_analyze, mock_save):
        """正常なフロー"""
        mock_get_image.return_value = SAMPLE_IMAGE_BYTES
        mock_analyze.return_value = {'equipment': [{'name': 'test'}]}
        
        result = lambda_handler(SAMPLE_S3_EVENT, None)
        
        assert result['statusCode'] == 200
        body = json.loads(result['body'])
        assert body['message'] == '分析完了'
        assert 'imageKey' in body
        assert 'equipmentCount' in body


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
