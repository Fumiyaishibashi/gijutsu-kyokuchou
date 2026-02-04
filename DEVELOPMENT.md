# 技術局長 - 開発ガイド

## 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 実装済み機能（タスク11まで）

### ✅ バックエンド
- Lambda関数の実装（画像分析）
- AWS CDKインフラ定義
- ユニットテスト（13テスト合格）

### ✅ フロントエンド
- 画像入力モード切り替え（カメラ/アップロード）
- カメラキャプチャ機能
- ファイルアップロード機能（ドラッグ&ドロップ対応）
- 画像プレビュー
- API統合（署名付きURL、ステータスポーリング）
- オーバーレイ表示（バウンディングボックス、リスクレベル）
- 機器詳細モーダル
- ローディングインジケーター（レーダースキャン）
- エラーメッセージ表示
- HUDスタイルUI（ダークモード）

## コンポーネント一覧

### 画像入力コンポーネント

| コンポーネント | 説明 | 場所 |
|--------------|------|------|
| `ImageInputSelector` | モード切り替え | `app/components/ImageInputSelector.tsx` |
| `CameraCapture` | カメラ撮影 | `app/components/CameraCapture.tsx` |
| `FileUpload` | ファイルアップロード | `app/components/FileUpload.tsx` |
| `ImagePreview` | 画像プレビュー | `app/components/ImagePreview.tsx` |

### 分析結果表示コンポーネント

| コンポーネント | 説明 | 場所 |
|--------------|------|------|
| `OverlayRenderer` | バウンディングボックス描画 | `app/components/OverlayRenderer.tsx` |
| `EquipmentDetailModal` | 機器詳細モーダル | `app/components/EquipmentDetailModal.tsx` |
| `LoadingIndicator` | ローディング表示 | `app/components/LoadingIndicator.tsx` |
| `ErrorMessage` | エラー表示 | `app/components/ErrorMessage.tsx` |

### APIルート

| エンドポイント | 説明 | 場所 |
|--------------|------|------|
| `POST /api/upload-url` | S3署名付きURL生成 | `app/api/upload-url/route.ts` |
| `GET /api/analyze-status` | 分析ステータス確認 | `app/api/analyze-status/route.ts` |

## 動作確認

### カメラモード
1. 「📸 カメラ」ボタンをクリック
2. カメラ権限を許可
3. 撮影ボタン（青い丸）をクリック
4. プレビューで確認

### アップロードモード
1. 「📁 アップロード」ボタンをクリック
2. 画像をドラッグ&ドロップ、またはクリックして選択
3. プレビューで確認

### 対応形式
- JPEG
- PNG
- WEBP

### ファイルサイズ制限
- 最大10MB

## エラーハンドリング

以下のエラーが適切に表示されます：

- カメラアクセス拒否
- ファイルサイズ超過
- 非対応フォーマット

## AWS環境設定

### 前提条件
- AWSアカウント（ID: 727598134232）
- AWS CLIまたはCDKの認証情報設定
- Bedrock Claude 3.5 Sonnetへのアクセス権限

### 環境変数の設定

`.env.local`ファイルに以下を設定してください：

```bash
# AWS設定
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=727598134232
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# S3バケット名
S3_BUCKET_NAME=gijutsu-kyokuchou-cteam-images

# DynamoDBテーブル名
DYNAMODB_TABLE_NAME=gijutsu-kyokuchou-cteam-results

# Bedrock設定
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### CDKデプロイ手順

1. **CDKブートストラップ（初回のみ）**
```bash
cd infrastructure
npx cdk bootstrap aws://727598134232/us-east-1
```

2. **スタックのデプロイ**
```bash
cd infrastructure
npx cdk deploy
```

3. **デプロイ確認**
```bash
npx cdk list
```

### Lambda関数のデプロイ

Lambda関数は`infrastructure/lib/infrastructure-stack.ts`で定義されており、CDKデプロイ時に自動的にパッケージ化されます。

### Bedrockモデルアクセス許可

AWS Consoleで以下を確認：
1. Bedrock > Model access
2. Claude 3.5 Sonnetが有効化されていることを確認
3. 有効化されていない場合は、リクエストを送信

## 次のタスク

### タスク12: フロントエンド統合テスト
- エンドツーエンドテスト
- 実際の機器画像でテスト

### タスク13: AWS Amplify Hostingへのデプロイ
- Amplifyアプリ作成
- GitHubリポジトリ接続
- 環境変数設定

## トラブルシューティング

### カメラが起動しない
- ブラウザのカメラ権限を確認
- HTTPSまたはlocalhostで実行していることを確認
- アップロードモードを使用

### 画像が選択できない
- ファイル形式を確認（JPEG/PNG/WEBP）
- ファイルサイズを確認（10MB以下）

### 開発サーバーが起動しない
```bash
# node_modulesを再インストール
rm -rf node_modules
npm install
npm run dev
```

## デザインシステム

### カラーパレット

| 用途 | 色 | Tailwind |
|------|-----|----------|
| 背景 | Slate-950 | `bg-slate-950` |
| サーフェス | Slate-800 | `bg-slate-800/90` |
| テキスト | Slate-50 | `text-slate-50` |
| プライマリ | Sky-500 | `bg-sky-500` |

### リスクレベルカラー

| レベル | 色 | 用途 |
|--------|-----|------|
| SAFE | Emerald-500 (#10B981) | 安全 |
| WARNING | Amber-500 (#F59E0B) | 警告 |
| DANGER | Red-500 (#EF4444) | 危険 |
| UNKNOWN | Sky-500 (#0EA5E9) | 不明 |

## 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [react-webcam](https://www.npmjs.com/package/react-webcam)
- [技術局長 設計書](../.kiro/specs/gijutsu-kyokuchou/design.md)
