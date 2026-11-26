# エイム練習ゲーム

ブラウザで遊べるエイム練習ゲームです。

## ローカルで表示

リポジトリのルートで次のコマンドを実行します。

```bash
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` を開いてください。

## 公開方法

`main` ブランチへ変更をプッシュすると、GitHub Actions から GitHub Pages に自動デプロイされます。

初回はリポジトリの **Settings > Pages** で、**Build and deployment** の **Source** を **GitHub Actions** に設定してください。

## 共有ランキング

ランキングはリポジトリ直下の `leaderboard.json` を共通データとして使用します。

ゲーム終了後の「共有ランキングに記録」ボタンからGitHub Issueを作成すると、GitHub Actionsが記録を `leaderboard.json` に反映します。
Issueの作成にはGitHubへのログインが必要です。
