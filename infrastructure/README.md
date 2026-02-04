# 技術局長 - インフラストラクチャ

AWS CDKを使用した「技術局長」アプリのインフラストラクチャ定義です。

## 構成リソース

- **S3バケット**: `gijutsu-kyokuchou-cteam-images`
  - 画像の一時保存（3日後に自動削除）
  - CORS設定済み
  - HTTPS通信のみ許可

- **DynamoDBテーブル**: `gijutsu-kyokuchou-cteam-results`
  - 分析結果の保存
  - TTL設定（3日後に自動削除）
  - PAY_PER_REQUESTビリングモード

- **Lambda関数**: `gijutsu-kyokuchou-cteam-analyzer`
  - Python 3.12ランタイム
  - Bedrock (Claude 3.5 Sonnet) による画像分析
  - S3イベントトリガー

## デプロイ前の準備

### 1. AWS認証情報の設定

```bash
# AWS CLIの設定
aws configure

# または環境変数で設定
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### 2. AWS Bedrockのモデルアクセス許可

AWS Bedrockコンソールで以下のモデルへのアクセスを有効化してください：
- **モデル**: Claude 3.5 Sonnet v2
- **モデルID**: `anthropic.claude-3-5-sonnet-20241022-v2:0`
- **リージョン**: us-east-1

手順：
1. AWS Bedrockコンソールを開く: https://console.aws.amazon.com/bedrock/
2. 左メニューから「Model access」を選択
3. 「Manage model access」をクリック
4. 「Anthropic」セクションで「Claude 3.5 Sonnet v2」にチェック
5. 「Save changes」をクリック

### 3. CDK Bootstrapの実行（初回のみ）

```bash
npx cdk bootstrap aws://727598134232/us-east-1
```

## デプロイ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ビルド

```bash
npm run build
```

### 3. テストの実行

```bash
npm test
```

### 4. スタックの合成（確認）

```bash
npx cdk synth
```

### 5. デプロイ

```bash
npx cdk deploy
```

デプロイ時に確認プロンプトが表示されます。`y`を入力して続行してください。

## デプロイ後の確認

デプロイが完了すると、以下の出力が表示されます：

```
Outputs:
GijutsuKyokuchouStack.BucketName = gijutsu-kyokuchou-cteam-images
GijutsuKyokuchouStack.TableName = gijutsu-kyokuchou-cteam-results
GijutsuKyokuchouStack.FunctionName = gijutsu-kyokuchou-cteam-analyzer
GijutsuKyokuchouStack.FunctionArn = arn:aws:lambda:us-east-1:727598134232:function:gijutsu-kyokuchou-cteam-analyzer
```

これらの値を`.env.local`ファイルに設定してください。

## スタックの削除

```bash
npx cdk destroy
```

⚠️ 注意: S3バケット内のオブジェクトは自動削除されます（`autoDeleteObjects: true`設定）。

## トラブルシューティング

### Bedrockアクセスエラー

```
AccessDeniedException: Could not access model
```

→ AWS Bedrockコンソールでモデルアクセスを有効化してください（上記「準備」セクション参照）

### S3バケット名の競合

```
BucketAlreadyExists: The requested bucket name is not available
```

→ S3バケット名はグローバルで一意である必要があります。`lib/infrastructure-stack.ts`でバケット名を変更してください。

### Lambda関数のタイムアウト

Lambda関数のタイムアウトは30秒に設定されています。Bedrock APIの応答が遅い場合は、`lib/infrastructure-stack.ts`で`timeout`を調整してください。

## 開発環境と本番環境

現在の設定は開発環境用です（`removalPolicy: DESTROY`、`autoDeleteObjects: true`）。

本番環境では以下の変更を推奨します：
- `removalPolicy: RETAIN`に変更
- `autoDeleteObjects: false`に変更
- CORS設定を特定のドメインに制限
- CloudWatch Logsの保持期間を調整

## 参考リンク

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [技術局長 設計書](../.kiro/specs/gijutsu-kyokuchou/design.md)
