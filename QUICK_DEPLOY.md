# クイックデプロイガイド

## 現在の状況

✅ **完了した作業**:
- フロントエンド実装（Next.js）
- バックエンド実装（Lambda関数）
- インフラストラクチャ定義（AWS CDK）
- Amplifyビルド設定（amplify.yml）
- デプロイドキュメント

⏳ **残りの作業**:
- GitHubリポジトリの作成
- AWS認証情報の設定
- CDKスタックのデプロイ
- Amplifyアプリの作成

## デプロイ手順（5ステップ）

### ステップ1: GitHubリポジトリの作成

1. GitHubにログイン（FumiyaIshibashiアカウント）
2. 新しいリポジトリを作成
   - Repository name: `gijutsu-kyokuchou`
   - Visibility: Public または Private
3. リポジトリをクローンせず、既存のコードをプッシュ

```bash
cd gijutsu-kyokuchou

# リモートリポジトリを設定（既に設定済み）
git remote -v

# リモートURLが正しいか確認
# origin  https://github.com/FumiyaIshibashi/gijutsu-kyokuchou.git (fetch)
# origin  https://github.com/FumiyaIshibashi/gijutsu-kyokuchou.git (push)

# プッシュ
git push -u origin main
```

### ステップ2: AWS認証情報の設定

#### オプション1: AWS CLIを使用（推奨）

```bash
# AWS CLIのインストール（macOS）
brew install awscli

# 認証情報の設定
aws configure
# AWS Access Key ID: <ターゲットアカウント727598134232のアクセスキー>
# AWS Secret Access Key: <シークレットキー>
# Default region name: us-east-1
# Default output format: json

# 認証情報の確認
aws sts get-caller-identity
# 出力されるAccountが727598134232であることを確認
```

#### オプション2: 環境変数を使用

```bash
export AWS_ACCESS_KEY_ID=<your_access_key>
export AWS_SECRET_ACCESS_KEY=<your_secret_key>
export AWS_DEFAULT_REGION=us-east-1
```

### ステップ3: CDKスタックのデプロイ

```bash
cd infrastructure

# ブートストラップ（初回のみ）
npx cdk bootstrap aws://727598134232/us-east-1

# デプロイ
npx cdk deploy

# 確認プロンプトで "y" を入力
```

**期待される出力**:
```
✅  GijutsuKyokuchouStack

Outputs:
GijutsuKyokuchouStack.BucketName = gijutsu-kyokuchou-cteam-images
GijutsuKyokuchouStack.TableName = gijutsu-kyokuchou-cteam-results
GijutsuKyokuchouStack.FunctionName = gijutsu-kyokuchou-cteam-analyzer
GijutsuKyokuchouStack.FunctionArn = arn:aws:lambda:us-east-1:727598134232:function:gijutsu-kyokuchou-cteam-analyzer
```

### ステップ4: Bedrockモデルアクセスの有効化

1. AWS Management Consoleにログイン
2. リージョンを **us-east-1** に設定
3. Bedrockサービスを開く
4. 左メニューから「Model access」を選択
5. 「Manage model access」をクリック
6. 「Claude 3.5 Sonnet」にチェックを入れる
7. 「Save changes」をクリック

### ステップ5: Amplify Hostingのセットアップ

#### 5.1 Amplifyアプリの作成

1. AWS Management Consoleで Amplify Hostingを開く
2. 「新しいアプリ」→「ホストウェブアプリ」をクリック
3. GitHubを選択
4. リポジトリを選択: `FumiyaIshibashi/gijutsu-kyokuchou`
5. ブランチを選択: `main`
6. アプリ名: `gijutsu-kyokuchou-cteam`
7. ビルド設定を確認（`amplify.yml`が自動検出される）

#### 5.2 環境変数の設定

「アプリ設定」→「環境変数」で以下を追加：

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

#### 5.3 デプロイの実行

1. 「保存してデプロイ」をクリック
2. ビルドプロセスを監視（約5-10分）
3. デプロイ完了を待つ

#### 5.4 デプロイURLの確認

デプロイが完了すると、以下のようなURLが発行されます：
```
https://main.xxxxxx.amplifyapp.com
```

## デプロイ確認

### 1. インフラストラクチャの確認

```bash
# S3バケットの確認
aws s3 ls | grep gijutsu-kyokuchou

# DynamoDBテーブルの確認
aws dynamodb list-tables | grep gijutsu-kyokuchou

# Lambda関数の確認
aws lambda list-functions | grep gijutsu-kyokuchou
```

### 2. アプリケーションの確認

1. Amplifyデプロイ URLにアクセス
2. 画像をアップロード
3. AI分析が実行されることを確認
4. オーバーレイが表示されることを確認

## トラブルシューティング

### 問題: AWS認証エラー

**症状**: `Could not assume role in target account`

**解決方法**:
- ターゲットアカウント（727598134232）のAWS認証情報を使用していることを確認
- `aws sts get-caller-identity`でアカウントIDを確認

### 問題: GitHubリポジトリが見つからない

**症状**: `Repository not found`

**解決方法**:
- GitHubでリポジトリが作成されていることを確認
- リポジトリ名が正しいことを確認
- アクセス権限があることを確認

### 問題: Amplifyビルドエラー

**症状**: `npm run build failed`

**解決方法**:
- ローカルで`npm run build`を実行して確認
- 環境変数が正しく設定されているか確認
- ビルドログを確認

## 所要時間

- ステップ1（GitHubリポジトリ作成）: 5分
- ステップ2（AWS認証情報設定）: 5分
- ステップ3（CDKデプロイ）: 10-15分
- ステップ4（Bedrockアクセス有効化）: 2分
- ステップ5（Amplifyセットアップ）: 10-15分

**合計**: 約30-45分

## 次のステップ

デプロイが完了したら：

1. ✅ 実際の機器画像でテスト
2. ✅ パフォーマンスの確認
3. ✅ エラーハンドリングの確認
4. ⏳ カスタムドメインの設定（オプション）
5. ⏳ モニタリングとアラートの設定

## サポート

詳細なドキュメント：
- [DEPLOYMENT.md](DEPLOYMENT.md) - 詳細なデプロイ手順
- [AMPLIFY_SETUP.md](AMPLIFY_SETUP.md) - Amplify設定の詳細
- [DEVELOPMENT.md](DEVELOPMENT.md) - 開発ガイド
- [README.md](README.md) - プロジェクト概要
