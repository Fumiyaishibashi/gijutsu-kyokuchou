# AWS Amplify Hosting セットアップガイド

## 前提条件

- AWSアカウント（ID: 727598134232）
- GitHubリポジトリへのアクセス権限
- AWS Amplify Consoleへのアクセス権限

## 1. Amplifyアプリの作成

### 1.1 AWS Amplify Consoleにアクセス

1. AWS Management Consoleにログイン
2. リージョンを **us-east-1** に設定
3. Amplify Hostingサービスを開く

### 1.2 新しいアプリを作成

1. 「新しいアプリ」→「ホストウェブアプリ」をクリック
2. GitHubを選択
3. リポジトリを選択: `FumiyaIshibashi/gijutsu-kyokuchou`
4. ブランチを選択: `main`
5. アプリ名: `gijutsu-kyokuchou-cteam`

### 1.3 ビルド設定の確認

Amplifyは自動的に`amplify.yml`を検出します。以下の内容が設定されていることを確認：

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

## 2. 環境変数の設定

### 2.1 Amplify Consoleで環境変数を追加

「アプリ設定」→「環境変数」で以下を追加：

| キー | 値 | 説明 |
|------|-----|------|
| `AWS_REGION` | `us-east-1` | AWSリージョン |
| `AWS_ACCOUNT_ID` | `727598134232` | AWSアカウントID |
| `AWS_ACCESS_KEY_ID` | `<your_access_key>` | AWSアクセスキー |
| `AWS_SECRET_ACCESS_KEY` | `<your_secret_key>` | AWSシークレットキー |
| `S3_BUCKET_NAME` | `gijutsu-kyokuchou-cteam-images` | S3バケット名 |
| `DYNAMODB_TABLE_NAME` | `gijutsu-kyokuchou-cteam-results` | DynamoDBテーブル名 |
| `BEDROCK_REGION` | `us-east-1` | Bedrockリージョン |
| `BEDROCK_MODEL_ID` | `anthropic.claude-3-5-sonnet-20241022-v2:0` | BedrockモデルID |

### 2.2 環境変数の確認

すべての環境変数が正しく設定されていることを確認してください。

## 3. ブランチ設定

### 3.1 開発環境（devブランチ）

1. 「アプリ設定」→「ブランチ」
2. 「ブランチを接続」をクリック
3. `dev`ブランチを選択
4. 環境変数を本番環境と同じに設定

### 3.2 本番環境（mainブランチ）

- `main`ブランチは既に接続されています
- 自動デプロイが有効になっています

## 4. デプロイの実行

### 4.1 初回デプロイ

1. 「保存してデプロイ」をクリック
2. ビルドプロセスを監視
3. デプロイ完了を待つ（約5-10分）

### 4.2 デプロイ状況の確認

以下のフェーズが順番に実行されます：

1. **Provision**: 環境のプロビジョニング
2. **Build**: アプリケーションのビルド
3. **Deploy**: アプリケーションのデプロイ
4. **Verify**: デプロイの検証

### 4.3 デプロイURL

デプロイが完了すると、以下のようなURLが発行されます：

- **本番環境**: `https://main.xxxxxx.amplifyapp.com`
- **開発環境**: `https://dev.xxxxxx.amplifyapp.com`

## 5. カスタムドメインの設定（オプション）

### 5.1 ドメインの追加

1. 「アプリ設定」→「ドメイン管理」
2. 「ドメインを追加」をクリック
3. ドメイン名を入力
4. DNS設定を更新

### 5.2 HTTPS証明書

Amplifyは自動的にSSL/TLS証明書を発行します。

## 6. 継続的デプロイの設定

### 6.1 自動デプロイ

- `main`ブランチへのプッシュで自動的にデプロイされます
- `dev`ブランチへのプッシュで開発環境が自動的にデプロイされます

### 6.2 プルリクエストプレビュー（オプション）

1. 「アプリ設定」→「プレビュー」
2. 「プレビューを有効化」をクリック
3. プルリクエストごとにプレビュー環境が作成されます

## 7. モニタリングとログ

### 7.1 ビルドログの確認

1. 「ビルド」タブをクリック
2. 各ビルドの詳細ログを確認

### 7.2 アクセスログ

1. 「モニタリング」タブをクリック
2. アクセス数、エラー率などを確認

## 8. トラブルシューティング

### ビルドエラー

**問題**: `npm ci`でエラーが発生
**解決**: `package-lock.json`が最新であることを確認

**問題**: `npm run build`でエラーが発生
**解決**: ローカルで`npm run build`を実行してエラーを確認

### 環境変数エラー

**問題**: 環境変数が読み込まれない
**解決**: 
1. 環境変数名が正しいか確認
2. 再デプロイを実行

### デプロイエラー

**問題**: デプロイが失敗する
**解決**:
1. ビルドログを確認
2. AWS IAM権限を確認
3. S3バケットとDynamoDBテーブルが存在することを確認

## 9. セキュリティ設定

### 9.1 アクセス制限（オプション）

開発環境へのアクセスを制限する場合：

1. 「アプリ設定」→「アクセス制御」
2. 基本認証を有効化
3. ユーザー名とパスワードを設定

### 9.2 環境変数の保護

機密情報（AWS認証情報）は環境変数として設定し、コードにハードコードしないでください。

## 10. コスト管理

### 10.1 Amplify Hostingの料金

- ビルド時間: $0.01/分
- ホスティング: $0.15/GB（転送量）
- 無料枠: 月1000ビルド分、15GB転送量

### 10.2 コスト最適化

- 不要なブランチのデプロイを削除
- キャッシュを有効化（`amplify.yml`で設定済み）

## 11. 次のステップ

1. ✅ Amplifyアプリを作成
2. ✅ 環境変数を設定
3. ✅ ブランチ設定
4. ⏳ デプロイを実行
5. ⏳ 動作確認

## 参考リンク

- [AWS Amplify Hosting ドキュメント](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)
- [Next.js on Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html)
- [環境変数の設定](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html)
