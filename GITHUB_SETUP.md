# GitHubリポジトリのセットアップ

## 現在の状況

✅ **完了**:
- ローカルGitリポジトリの初期化
- すべてのコードのコミット
- リモートリポジトリの設定（`https://github.com/FumiyaIshibashi/gijutsu-kyokuchou.git`）

⏳ **残り**:
- GitHubでリポジトリを作成
- コードをプッシュ

## GitHubリポジトリの作成手順

### オプション1: GitHub Web UIで作成（推奨）

1. **GitHubにアクセス**
   - https://github.com にアクセス
   - FumiyaIshibashiアカウントでログイン

2. **新しいリポジトリを作成**
   - 右上の「+」アイコンをクリック
   - 「New repository」を選択

3. **リポジトリ設定**
   ```
   Repository name: gijutsu-kyokuchou
   Description: 放送機器安全確認アプリ - MBS Hackathon 2026 C班
   Visibility: Public または Private（お好みで）
   
   ⚠️ 重要: 以下のオプションはチェックしない
   □ Add a README file
   □ Add .gitignore
   □ Choose a license
   ```

4. **「Create repository」をクリック**

5. **既存のリポジトリをプッシュ**
   
   GitHubに表示される手順は無視して、以下を実行：
   
   ```bash
   cd gijutsu-kyokuchou
   git push -u origin main
   ```

### オプション2: GitHub CLIで作成

GitHub CLIがインストールされている場合：

```bash
# GitHub CLIのインストール（macOS）
brew install gh

# GitHubにログイン
gh auth login

# リポジトリを作成
cd gijutsu-kyokuchou
gh repo create gijutsu-kyokuchou --public --source=. --remote=origin --push

# または Private リポジトリとして作成
gh repo create gijutsu-kyokuchou --private --source=. --remote=origin --push
```

## プッシュ後の確認

### 1. GitHubでリポジトリを確認

https://github.com/FumiyaIshibashi/gijutsu-kyokuchou にアクセスして、以下を確認：

- ✅ すべてのファイルがアップロードされている
- ✅ README.mdが表示されている
- ✅ コミット履歴が表示されている

### 2. ローカルで確認

```bash
cd gijutsu-kyokuchou

# リモートリポジトリの確認
git remote -v
# 出力:
# origin  https://github.com/FumiyaIshibashi/gijutsu-kyokuchou.git (fetch)
# origin  https://github.com/FumiyaIshibashi/gijutsu-kyokuchou.git (push)

# ブランチの確認
git branch -vv
# 出力:
# * main 6043f38 [origin/main] GitHubリポジトリをFumiyaIshibashiアカウントに変更
```

## トラブルシューティング

### 問題1: 認証エラー

**エラー**: `Authentication failed`

**解決方法**:

#### オプションA: Personal Access Token（推奨）

1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 「Generate new token」をクリック
3. スコープを選択:
   - ✅ repo（すべて）
4. トークンをコピー
5. プッシュ時にパスワードの代わりにトークンを使用

#### オプションB: SSH認証

```bash
# SSH鍵を生成
ssh-keygen -t ed25519 -C "your_email@example.com"

# SSH鍵をGitHubに追加
cat ~/.ssh/id_ed25519.pub
# 出力された公開鍵をGitHub Settings → SSH and GPG keys に追加

# リモートURLをSSHに変更
git remote set-url origin git@github.com:FumiyaIshibashi/gijutsu-kyokuchou.git

# プッシュ
git push -u origin main
```

### 問題2: リポジトリ名が既に存在する

**エラー**: `Repository already exists`

**解決方法**:
- 既存のリポジトリを削除するか、別の名前を使用
- または既存のリポジトリを使用する場合は、そのリポジトリのURLを確認

### 問題3: ブランチ名が異なる

**エラー**: `src refspec main does not match any`

**解決方法**:
```bash
# 現在のブランチ名を確認
git branch

# mainブランチに変更
git branch -M main

# プッシュ
git push -u origin main
```

## 次のステップ

GitHubリポジトリの作成とプッシュが完了したら：

1. ✅ **Amplify Hostingのセットアップ**
   - [AMPLIFY_SETUP.md](AMPLIFY_SETUP.md)を参照
   - AWS Console → Amplify Hosting
   - GitHubリポジトリを接続

2. ✅ **CDKスタックのデプロイ**
   - [DEPLOYMENT.md](DEPLOYMENT.md)を参照
   - `cd infrastructure && npx cdk deploy`

3. ✅ **エンドツーエンドテスト**
   - デプロイされたアプリで動作確認

## 参考リンク

- [GitHub: Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [GitHub: About authentication](https://docs.github.com/en/authentication)
- [GitHub CLI Documentation](https://cli.github.com/manual/)

## クイックコマンド

```bash
# リポジトリ作成後、すぐにプッシュ
cd gijutsu-kyokuchou
git push -u origin main

# プッシュ成功を確認
git log --oneline -5

# GitHubでリポジトリを開く
open https://github.com/FumiyaIshibashi/gijutsu-kyokuchou
# または
gh repo view --web
```
