# AWS認証情報の取得ガイド

## 必要な情報

CDKデプロイとAmplify Hostingに必要な情報：

1. **AWS Access Key ID** - アクセスキーID（例: `AKIAIOSFODNN7EXAMPLE`）
2. **AWS Secret Access Key** - シークレットアクセスキー（例: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`）
3. **AWS Account ID** - アカウントID（既知: `727598134232`）
4. **AWS Region** - リージョン（既知: `us-east-1`）

## AWS Management Consoleでの取得手順

### ステップ1: AWS Management Consoleにログイン

1. https://console.aws.amazon.com/ にアクセス
2. **Hackathon2026_TeamC_Account** でログイン
   - ルートユーザーまたはIAMユーザーでログイン

### ステップ2: IAMサービスを開く

1. 上部の検索バーで「IAM」と入力
2. 「IAM」サービスをクリック

### ステップ3: アクセスキーの作成

#### 方法A: 既存のIAMユーザーを使用

1. 左メニューから「ユーザー」をクリック
2. 自分のユーザー名をクリック（例: `fumiya` または `teamc-user`）
3. 「セキュリティ認証情報」タブをクリック
4. 「アクセスキー」セクションまでスクロール
5. 「アクセスキーを作成」ボタンをクリック

#### 方法B: 新しいIAMユーザーを作成

1. 左メニューから「ユーザー」をクリック
2. 「ユーザーを作成」ボタンをクリック
3. ユーザー名を入力（例: `hackathon-deploy-user`）
4. 「次へ」をクリック
5. 「ポリシーを直接アタッチする」を選択
6. 以下のポリシーを選択:
   - ✅ `AdministratorAccess`（推奨：ハッカソン用）
   - または個別に:
     - ✅ `AmazonS3FullAccess`
     - ✅ `AmazonDynamoDBFullAccess`
     - ✅ `AWSLambda_FullAccess`
     - ✅ `IAMFullAccess`
     - ✅ `CloudFormationFullAccess`
     - ✅ `AmazonBedrockFullAccess`
7. 「次へ」→「ユーザーの作成」をクリック
8. ユーザーをクリックして「セキュリティ認証情報」タブへ
9. 「アクセスキーを作成」をクリック

### ステップ4: アクセスキーの用途を選択

1. 「ユースケース」で以下を選択:
   - ✅ **コマンドラインインターフェイス (CLI)**
2. 「上記のレコメンデーションを理解し、アクセスキーを作成します」にチェック
3. 「次へ」をクリック

### ステップ5: 説明タグを追加（オプション）

1. 説明タグを入力（例: `Hackathon 2026 Deployment`）
2. 「アクセスキーを作成」をクリック

### ステップ6: アクセスキーをコピー

⚠️ **重要**: この画面は一度しか表示されません！

1. **アクセスキーID**をコピー
   ```
   例: AKIAIOSFODNN7EXAMPLE
   ```

2. **シークレットアクセスキー**をコピー
   ```
   例: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```

3. 「.csvファイルをダウンロード」をクリック（バックアップ用）

4. 安全な場所に保存:
   - パスワードマネージャー
   - 暗号化されたファイル
   - ⚠️ GitHubにはコミットしない！

## AWS CLIでの設定

### 方法1: aws configure コマンド

```bash
aws configure

# 以下を入力:
AWS Access Key ID [None]: <コピーしたアクセスキーID>
AWS Secret Access Key [None]: <コピーしたシークレットアクセスキー>
Default region name [None]: us-east-1
Default output format [None]: json
```

### 方法2: 環境変数

```bash
export AWS_ACCESS_KEY_ID=<コピーしたアクセスキーID>
export AWS_SECRET_ACCESS_KEY=<コピーしたシークレットアクセスキー>
export AWS_DEFAULT_REGION=us-east-1
```

### 方法3: .env.localファイル

```bash
# gijutsu-kyokuchou/.env.local
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=727598134232
AWS_ACCESS_KEY_ID=<コピーしたアクセスキーID>
AWS_SECRET_ACCESS_KEY=<コピーしたシークレットアクセスキー>

S3_BUCKET_NAME=gijutsu-kyokuchou-cteam-images
DYNAMODB_TABLE_NAME=gijutsu-kyokuchou-cteam-results
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

## 認証情報の確認

```bash
# アカウントIDとユーザー情報を確認
aws sts get-caller-identity

# 期待される出力:
{
    "UserId": "AIDAI...",
    "Account": "727598134232",  # ← これが正しいか確認
    "Arn": "arn:aws:iam::727598134232:user/your-username"
}
```

## トラブルシューティング

### 問題1: アクセスキーが見つからない

**原因**: 既存のアクセスキーが削除された、または作成されていない

**解決方法**:
1. IAM → ユーザー → セキュリティ認証情報
2. 「アクセスキーを作成」をクリック
3. 新しいアクセスキーを作成

### 問題2: 権限エラー

**エラー**: `User: arn:aws:iam::727598134232:user/xxx is not authorized to perform: xxx`

**解決方法**:
1. IAM → ユーザー → 権限タブ
2. 必要なポリシーをアタッチ:
   - `AdministratorAccess`（推奨：ハッカソン用）
   - または個別のサービスポリシー

### 問題3: アカウントIDが異なる

**エラー**: `Could not assume role in target account`

**解決方法**:
```bash
# 現在のアカウントIDを確認
aws sts get-caller-identity

# Account が 727598134232 であることを確認
# 異なる場合は、正しいアカウントの認証情報を使用
```

### 問題4: シークレットアクセスキーを紛失

**原因**: シークレットアクセスキーは一度しか表示されない

**解決方法**:
1. 古いアクセスキーを削除
2. 新しいアクセスキーを作成
3. 新しい認証情報を設定

## セキュリティのベストプラクティス

### ✅ すべきこと

1. **アクセスキーを安全に保管**
   - パスワードマネージャーを使用
   - 暗号化されたファイルに保存

2. **定期的にローテーション**
   - 90日ごとにアクセスキーを更新

3. **最小権限の原則**
   - 必要な権限のみを付与

4. **MFA（多要素認証）を有効化**
   - IAM → ユーザー → セキュリティ認証情報 → MFA

### ❌ してはいけないこと

1. **GitHubにコミットしない**
   - `.env.local`は`.gitignore`に含まれている
   - 誤ってコミットした場合は即座にキーを削除

2. **公開しない**
   - Slackやメールで平文で送信しない
   - スクリーンショットに含めない

3. **ルートユーザーのアクセスキーを使用しない**
   - IAMユーザーを作成して使用

## 次のステップ

認証情報を取得したら：

1. ✅ **AWS CLIで設定**
   ```bash
   aws configure
   ```

2. ✅ **認証情報を確認**
   ```bash
   aws sts get-caller-identity
   ```

3. ✅ **CDKをデプロイ**
   ```bash
   cd infrastructure
   npx cdk bootstrap aws://727598134232/us-east-1
   npx cdk deploy
   ```

4. ✅ **Amplify Hostingをセットアップ**
   - AWS Console → Amplify Hosting
   - 環境変数に認証情報を設定

## 参考リンク

- [AWS IAM ユーザーガイド](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/)
- [アクセスキーの管理](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [AWS CLI の設定](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-configure-quickstart.html)

## クイックリファレンス

```bash
# 認証情報の設定
aws configure

# 認証情報の確認
aws sts get-caller-identity

# 認証情報のテスト
aws s3 ls

# CDKブートストラップ
cd infrastructure
npx cdk bootstrap aws://727598134232/us-east-1

# CDKデプロイ
npx cdk deploy
```
