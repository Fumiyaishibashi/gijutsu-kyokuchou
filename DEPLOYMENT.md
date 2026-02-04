# デプロイガイド

## 概要

このドキュメントでは、「技術局長」アプリケーションをAWSにデプロイする手順を説明します。

## デプロイアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                   AWS Amplify Hosting                       │
│              (Next.js Frontend Hosting)                     │
│                  https://xxx.amplifyapp.com                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Infrastructure                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │      S3      │→ │    Lambda    │→ │   Bedrock    │     │
│  │   (Images)   │  │  (Analyzer)  │  │  (Claude)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                            │                                │
│                            ▼                                │
│                    ┌──────────────┐                         │
│                    │  DynamoDB    │                         │
│                    │  (Results)   │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## 前提条件

### 必須
- AWSアカウント（ID: 727598134232）
- AWS認証情報（アクセスキー、シークレットキー）
- Node.js 18以上
- Python 3.12以上
- Git

### 推奨
- AWS CLI（バージョン2以上）
- AWS CDK CLI（バージョン2以上）

## デプロイ手順

### ステップ1: AWS認証情報の設定

#### オプション1: AWS CLIを使用（推奨）

```bash
# AWS CLIのインストール（macOS）
brew install awscli

# 認証情報の設定
aws configure
# AWS Access Key ID: <your_access_key>
# AWS Secret Access Key: <your_secret_key>
# Default region name: us-east-1
# Default output format: json

# 認証情報の確認
aws sts get-caller-identity
```

#### オプション2: 環境変数を使用

```bash
export AWS_ACCESS_KEY_ID=<your_access_key>
export AWS_SECRET_ACCESS_KEY=<your_secret_key>
export AWS_DEFAULT_REGION=us-east-1
```

#### オプション3: .env.localファイルを使用

```bash
# .env.localファイルを編集
AWS_ACCESS_KEY_ID=<your_access_key>
AWS_SECRET_ACCESS_KEY=<your_secret_key>
```

### ステップ2: CDKブートストラップ（初回のみ）

```bash
cd infrastructure

# ブートストラップの実行
npx cdk bootstrap aws://727598134232/us-east-1

# 成功すると以下のリソースが作成されます：
# - CDKToolkit CloudFormationスタック
# - S3バケット（CDKアセット用）
# - IAMロール（デプロイ用）
```

### ステップ3: インフラストラクチャのデプロイ

```bash
cd infrastructure

# スタックの合成（確認）
npx cdk synth

# デプロイの実行
npx cdk deploy

# 確認プロンプトで "y" を入力
```

#### デプロイされるリソース

1. **S3バケット**: `gijutsu-kyokuchou-cteam-images`
   - 画像保存用
   - 3日後に自動削除（ライフサイクルポリシー）
   - CORS設定済み

2. **DynamoDBテーブル**: `gijutsu-kyokuchou-cteam-results`
   - 分析結果保存用
   - TTL設定（3日後に自動削除）
   - PAY_PER_REQUESTビリングモード

3. **Lambda関数**: `gijutsu-kyokuchou-cteam-analyzer`
   - Python 3.12ランタイム
   - Bedrock統合
   - S3イベントトリガー

4. **IAMロール**: Lambda実行ロール
   - S3読み取り権限
   - DynamoDB書き込み権限
   - Bedrock InvokeModel権限

### ステップ4: Bedrockモデルアクセスの有効化

```bash
# AWS Consoleで以下を実行：
# 1. Bedrockサービスを開く
# 2. 左メニューから "Model access" を選択
# 3. "Manage model access" をクリック
# 4. "Claude 3.5 Sonnet" にチェックを入れる
# 5. "Save changes" をクリック
```

### ステップ5: デプロイの確認

```bash
cd infrastructure

# スタックの確認
npx cdk list

# 出力の確認
npx cdk deploy --outputs-file outputs.json
cat outputs.json
```

#### 期待される出力

```json
{
  "GijutsuKyokuchouStack": {
    "BucketName": "gijutsu-kyokuchou-cteam-images",
    "TableName": "gijutsu-kyokuchou-cteam-results",
    "FunctionName": "gijutsu-kyokuchou-cteam-analyzer",
    "FunctionArn": "arn:aws:lambda:us-east-1:727598134232:function:gijutsu-kyokuchou-cteam-analyzer"
  }
}
```

### ステップ6: Lambda関数のテスト

```bash
# テスト画像をS3にアップロード
aws s3 cp test-image.jpg s3://gijutsu-kyokuchou-cteam-images/uploads/test-image.jpg

# Lambda関数のログを確認
aws logs tail /aws/lambda/gijutsu-kyokuchou-cteam-analyzer --follow

# DynamoDBの結果を確認
aws dynamodb get-item \
  --table-name gijutsu-kyokuchou-cteam-results \
  --key '{"imageKey": {"S": "uploads/test-image.jpg"}}'
```

### ステップ7: Amplify Hostingのセットアップ

詳細は[AMPLIFY_SETUP.md](AMPLIFY_SETUP.md)を参照してください。

#### 7.1 GitHubリポジトリへのプッシュ

```bash
# リモートリポジトリの確認
git remote -v

# リモートリポジトリが設定されていない場合
git remote add origin https://github.com/Mainichi-Broadcasting-System-Inc/gijutsu-kyokuchou.git

# プッシュ
git push -u origin main
```

#### 7.2 Amplify Consoleでアプリを作成

1. AWS Management Consoleにログイン
2. Amplify Hostingサービスを開く
3. 「新しいアプリ」→「ホストウェブアプリ」をクリック
4. GitHubを選択
5. リポジトリとブランチを選択
6. ビルド設定を確認（`amplify.yml`が自動検出される）
7. 環境変数を設定
8. 「保存してデプロイ」をクリック

#### 7.3 環境変数の設定

Amplify Consoleで以下の環境変数を設定：

```
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=727598134232
AWS_ACCESS_KEY_ID=<your_access_key>
AWS_SECRET_ACCESS_KEY=<your_secret_key>
S3_BUCKET_NAME=gijutsu-kyokuchou-cteam-images
DYNAMODB_TABLE_NAME=gijutsu-kyokuchou-cteam-results
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### ステップ8: デプロイの確認

#### 8.1 Amplifyデプロイの確認

1. Amplify Consoleでビルドログを確認
2. デプロイが完了したら、URLにアクセス
3. アプリが正常に表示されることを確認

#### 8.2 エンドツーエンドテスト

1. アプリにアクセス
2. 画像をアップロード
3. AI分析が実行されることを確認
4. オーバーレイが表示されることを確認

## トラブルシューティング

### 問題1: AWS認証エラー

**エラー**: `Could not assume role in target account`

**原因**: 現在のAWS認証情報がターゲットアカウント（727598134232）にアクセスできない

**解決方法**:
1. 正しいAWS認証情報を使用していることを確認
2. IAMユーザーに必要な権限があることを確認
3. AWS CLIで認証情報を再設定

```bash
aws configure
aws sts get-caller-identity
```

### 問題2: CDKブートストラップエラー

**エラー**: `This stack uses assets, so the toolkit stack must be deployed`

**解決方法**:
```bash
cd infrastructure
npx cdk bootstrap aws://727598134232/us-east-1
```

### 問題3: Lambda関数のデプロイエラー

**エラー**: `Failed to create Lambda function`

**原因**: Lambda関数のコードに問題がある、または権限が不足している

**解決方法**:
1. Lambda関数のユニットテストを実行
```bash
cd lambda/image_analyzer
python -m pytest
```

2. IAMロールの権限を確認

### 問題4: Bedrockアクセスエラー

**エラー**: `AccessDeniedException: You don't have access to the model`

**解決方法**:
1. AWS Consoleで Bedrock > Model access を開く
2. Claude 3.5 Sonnetへのアクセスをリクエスト
3. アクセスが承認されるまで待つ（通常は即座）

### 問題5: Amplifyビルドエラー

**エラー**: `npm run build failed`

**解決方法**:
1. ローカルでビルドを実行して確認
```bash
npm run build
```

2. 環境変数が正しく設定されているか確認
3. `amplify.yml`の設定を確認

## デプロイ後の確認事項

### チェックリスト

- [ ] CDKスタックが正常にデプロイされた
- [ ] S3バケットが作成された
- [ ] DynamoDBテーブルが作成された
- [ ] Lambda関数が作成された
- [ ] Bedrockモデルアクセスが有効化された
- [ ] Amplifyアプリが作成された
- [ ] 環境変数が設定された
- [ ] アプリが正常にビルドされた
- [ ] アプリにアクセスできる
- [ ] 画像アップロードが動作する
- [ ] AI分析が動作する
- [ ] オーバーレイが表示される

## モニタリング

### CloudWatch Logs

Lambda関数のログを確認：
```bash
aws logs tail /aws/lambda/gijutsu-kyokuchou-cteam-analyzer --follow
```

### CloudWatch Metrics

- Lambda関数の実行回数
- Lambda関数のエラー率
- Lambda関数の実行時間
- S3バケットのリクエスト数
- DynamoDBの読み取り/書き込みユニット

### コスト管理

AWS Cost Explorerで以下のサービスのコストを監視：
- Lambda
- S3
- DynamoDB
- Bedrock
- Amplify Hosting

## ロールバック手順

### インフラストラクチャのロールバック

```bash
cd infrastructure
npx cdk destroy
```

### Amplifyアプリの削除

1. Amplify Consoleを開く
2. アプリを選択
3. 「アクション」→「アプリを削除」

## 次のステップ

1. ✅ インフラストラクチャのデプロイ
2. ✅ Amplify Hostingのセットアップ
3. ⏳ カスタムドメインの設定
4. ⏳ 本番環境の最適化
5. ⏳ モニタリングとアラートの設定

## 参考リンク

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Amplify Hosting](https://docs.aws.amazon.com/amplify/)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [AWS Bedrock](https://docs.aws.amazon.com/bedrock/)
