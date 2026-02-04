# 技術局長 - 画像分析Lambda関数

AWS Bedrock (Claude 3.5 Sonnet) を使用して放送機器の画像を分析するLambda関数です。

## 機能

- S3イベントトリガーによる自動実行
- AWS Bedrock (Claude 3.5 Sonnet) による画像分析
- 悲観的AI戦略（不確実な場合は安全側に倒す）
- DynamoDBへの結果保存（TTL: 3日）
- 構造化ログ出力（CloudWatch Logs）

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `RESULTS_TABLE_NAME` | DynamoDBテーブル名 | - |
| `BEDROCK_REGION` | Bedrockリージョン | `us-east-1` |
| `BEDROCK_MODEL_ID` | Bedrockモデル ID | `anthropic.claude-3-5-sonnet-20241022-v2:0` |

## 依存関係

```bash
pip install -r requirements.txt
```

## テスト

### ユニットテストの実行

```bash
# 仮想環境の作成
python3 -m venv venv
source venv/bin/activate

# 依存関係のインストール
pip install -r requirements-dev.txt

# テストの実行
pytest -v

# カバレッジ付きテスト
pytest --cov=handler --cov-report=html
```

### テスト結果

```
13 passed in 0.15s
```

## 分析フロー

1. **S3イベント受信**: `uploads/`プレフィックスの画像がアップロードされるとトリガー
2. **画像取得**: S3から画像をダウンロード
3. **Base64エンコード**: 画像をBase64形式に変換
4. **Bedrock分析**: Claude 3.5 Sonnetで画像を分析
5. **応答解析**: JSON形式の応答をパースしてバリデーション
6. **結果保存**: DynamoDBに分析結果を保存

## 応答フォーマット

```json
{
  "equipment": [
    {
      "name": "ビデオスイッチャー",
      "bbox": {
        "x": 10,
        "y": 10,
        "width": 30,
        "height": 40
      },
      "risk_level": "SAFE",
      "description": "安全に操作できます"
    }
  ]
}
```

### リスクレベル

| レベル | 説明 | 色 |
|--------|------|-----|
| `SAFE` | 安全に触れる | 🟢 Emerald |
| `WARNING` | 確認が必要 | 🟡 Amber |
| `DANGER` | 触ると危険 | 🔴 Red |
| `UNKNOWN` | 識別不可 | 🔵 Sky |

## 悲観的AI戦略

本Lambda関数は「悲観的AI戦略」を採用しています：

- 機器の種類が不明な場合は `UNKNOWN` を返す
- ケーブルの種類が判断できない場合は `WARNING` を返す
- 少しでも不確実な場合は安全側に倒す
- 推測による誤った情報提供を避ける

## エラーハンドリング

| エラータイプ | HTTPステータス | メッセージ |
|------------|--------------|-----------|
| NoSuchKey | 404 | 画像が見つかりませんでした |
| AccessDenied | 403 | アクセスが拒否されました |
| Timeout | 504 | 分析がタイムアウトしました |
| その他 | 500 | 予期しないエラーが発生しました |

## ログ

CloudWatch Logsに以下の情報を出力：

- イベント受信ログ
- 画像取得ログ（サイズ含む）
- Bedrock API呼び出しログ
- 分析結果ログ（検出機器数）
- エラーログ（スタックトレース含む）

## パフォーマンス

- **タイムアウト**: 30秒
- **メモリ**: 1024MB
- **平均実行時間**: 5-10秒（画像サイズによる）

## デプロイ

CDKスタックによって自動デプロイされます。

```bash
cd ../../infrastructure
npx cdk deploy
```

## トラブルシューティング

### Bedrockアクセスエラー

```
AccessDeniedException: Could not access model
```

→ AWS Bedrockコンソールでモデルアクセスを有効化してください

### タイムアウトエラー

```
Task timed out after 30.00 seconds
```

→ CDKスタックで`timeout`を調整してください

### JSON解析エラー

```
JSONDecodeError: Expecting value
```

→ Bedrockの応答形式を確認してください。マークダウンコードブロックは自動除去されます。

## 参考リンク

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude 3.5 Sonnet Model Card](https://www.anthropic.com/claude)
- [技術局長 設計書](../../.kiro/specs/gijutsu-kyokuchou/design.md)
