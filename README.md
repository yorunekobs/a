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
