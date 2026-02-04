# 技術局長 (Gijutsu Kyokuchou)

放送機器の安全確認を支援するAI搭載モバイルアプリケーション

**MBS Hackathon 2026 - C班**

## 📱 概要

「技術局長」は、若手放送技術者が機器やケーブルの理解不足により引き起こす可能性のある運用事故を防ぐためのアプリケーションです。スマートフォンまたはPCから機器の写真を撮影/アップロードすると、AWS Bedrock（Claude 3.5 Sonnet）が画像を分析し、検出された機器の周囲にリスクレベルに応じた色分けされたバウンディングボックスをオーバーレイ表示します。

### 主な機能

- 📸 **ハイブリッド入力**: カメラ撮影とファイルアップロードの両方に対応
- 🤖 **AI画像分析**: Claude 3.5 Sonnetによる高精度な機器識別
- 🎯 **ARオーバーレイ**: リスクレベルに応じた色分けされたバウンディングボックス表示
- 🔒 **安全第一**: 不確実な場合は「WARNING」を表示する悲観的AI戦略
- 💰 **コスト最適化**: S3ライフサイクルポリシーで3日後に画像を自動削除

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Camera     │  │   Upload     │  │   Overlay    │     │
│  │   Capture    │  │    Mode      │  │   Renderer   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      AWS Cloud                              │
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

## 🚀 クイックスタート

### 前提条件

- Node.js 18以上
- Python 3.12以上
- AWS CLI設定済み
- AWS Bedrockへのアクセス権限

### ローカル開発

#### 1. リポジトリのクローン

```bash
git clone https://github.com/FumiyaIshibashi/gijutsu-kyokuchou.git
cd gijutsu-kyokuchou
```

#### 2. 依存関係のインストール

```bash
# フロントエンド
npm install

# インフラストラクチャ
cd infrastructure
npm install
cd ..
```

#### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の内容を設定：

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

#### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

### 本番デプロイ

詳細なデプロイ手順は以下のドキュメントを参照してください：

- **クイックデプロイ**: [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - 5ステップで本番環境にデプロイ
- **詳細デプロイ**: [DEPLOYMENT.md](DEPLOYMENT.md) - 詳細なデプロイ手順とトラブルシューティング
- **Amplify設定**: [AMPLIFY_SETUP.md](AMPLIFY_SETUP.md) - AWS Amplify Hostingの設定

#### デプロイ概要

1. **GitHubリポジトリの作成**
2. **AWS認証情報の設定**
3. **CDKスタックのデプロイ**
   ```bash
   cd infrastructure
   npx cdk bootstrap aws://727598134232/us-east-1
   npx cdk deploy
   ```
4. **Bedrockモデルアクセスの有効化**
5. **Amplify Hostingのセットアップ**

所要時間: 約30-45分

## 📁 プロジェクト構成

```
gijutsu-kyokuchou/
├── app/                      # Next.js App Router
│   ├── api/                  # APIルート
│   │   ├── upload-url/       # S3署名付きURL生成
│   │   └── analyze-status/   # 分析ステータス確認
│   ├── components/           # Reactコンポーネント
│   └── page.tsx              # メインページ
├── infrastructure/           # AWS CDKインフラストラクチャ
│   ├── lib/                  # CDKスタック定義
│   └── test/                 # インフラテスト
├── lambda/                   # Lambda関数
│   └── image_analyzer/       # 画像分析関数
│       └── handler.py
├── .kiro/                    # プロジェクト仕様
│   ├── specs/
│   │   └── gijutsu-kyokuchou/
│   │       ├── requirements.md  # 要件定義
│   │       ├── design.md        # 設計書
│   │       └── tasks.md         # 実装タスク
│   └── steering/             # 開発ガイドライン
└── tmp/                      # 一時ファイル（Git管理外）
```

## 🎨 デザインコンセプト

**"Immersive Industrial HUD"**

プロフェッショナルなヘッドアップディスプレイ（HUD）を模したUIデザイン。

### カラーパレット

| 用途 | 色 | Tailwind |
|------|-----|----------|
| 危険 | 🔴 Red | `#EF4444` |
| 安全 | 🟢 Emerald | `#10B981` |
| 警告 | 🟡 Amber | `#F59E0B` |
| 情報 | 🔵 Sky | `#0EA5E9` |
| 背景 | ⚫ Slate-950 | `#020617` |

## 🧪 テスト

### インフラストラクチャテスト

```bash
cd infrastructure
npm test
```

### フロントエンドテスト（実装予定）

```bash
npm test
```

## 📚 ドキュメント

### 開発ドキュメント
- [開発ガイド](DEVELOPMENT.md) - ローカル開発環境のセットアップと使い方
- [要件定義書](.kiro/specs/gijutsu-kyokuchou/requirements.md) - 機能要件と非機能要件
- [設計書](.kiro/specs/gijutsu-kyokuchou/design.md) - システムアーキテクチャと設計
- [実装タスク](.kiro/specs/gijutsu-kyokuchou/tasks.md) - 実装タスクリスト

### デプロイドキュメント
- [クイックデプロイ](QUICK_DEPLOY.md) - 5ステップで本番環境にデプロイ（推奨）
- [詳細デプロイ](DEPLOYMENT.md) - 詳細なデプロイ手順とトラブルシューティング
- [Amplify設定](AMPLIFY_SETUP.md) - AWS Amplify Hostingの詳細設定
- [インフラREADME](infrastructure/README.md) - AWS CDKインフラストラクチャの詳細

## 🛠️ 開発ワークフロー

### Spec-Driven Development

本プロジェクトは仕様駆動開発（Spec-Driven Development）を採用しています：

1. **要件定義** → `requirements.md`
2. **設計** → `design.md`
3. **実装計画** → `tasks.md`
4. **実装** → コード

### Git コミットルール

- コミットメッセージは日本語で記述
- 簡潔な一行サマリー
- 例: `S3のライフサイクルポリシーを3日に設定`

## 🔐 セキュリティ

- HTTPS通信のみ
- S3パブリックアクセスブロック
- 署名付きURLによる安全なアップロード
- IAM最小権限の原則

## 💰 コスト最適化

- S3ライフサイクルポリシー（3日後に自動削除）
- DynamoDB TTL（3日後に自動削除）
- Lambda関数のタイムアウト最適化（30秒）
- PAY_PER_REQUESTビリングモード

## 🚧 今後の展開

### Phase 2: リアルタイム動画解析
- フレーム単位での解析
- ライブカメラフィード対応

### Phase 3: VR/AR統合
- スマートグラス対応
- 空間コンピューティング

### 機能拡張
- 特定機器のマニュアル統合（RAG）
- 多言語対応
- ユーザー認証（AWS Cognito）

## 👥 チーム

**MBS Hackathon 2026 - C班**

## 📄 ライセンス

Copyright © 2026 Mainichi Broadcasting System, Inc.

## 🙏 謝辞

- AWS Bedrock (Claude 3.5 Sonnet)
- Next.js
- AWS CDK
- Tailwind CSS
