# 情報戦略 ～Secret Hearts～ — ビルド手順

## 動作確認（開発時）

```bash
# 1. Node.js をインストール（https://nodejs.org/）
# 2. 依存パッケージをインストール
npm install

# 3. ゲームを起動
npm start
```

## Windows .exe ビルド

```bash
npm run build:win
```

`dist/` フォルダに `Setup.exe` が生成されます。

## Steam 公開手順（概略）

1. Steamworks Partner に登録（https://partner.steamgames.com/）
2. アプリを作成し App ID を取得
3. `package.json` の `appId` を Steam App ID に合わせる
4. `greenworks`（Steam SDK ラッパー）を追加して実績・クラウドセーブを実装
5. Steam Pipe でビルドをアップロード

## フォルダ構成

```
ninja ai/
├── index.html    ← ゲーム本体（HTML/CSS/JS 一体）
├── main.js       ← Electron ウィンドウ設定
├── package.json  ← プロジェクト設定・ビルド設定
└── assets/       ← icon.ico などをここに置く（要作成）
```

## キャラクター絵の追加方法

`index.html` の `.portrait-emoji` 部分を `<img>` タグに置き換えることで
実際のアニメ絵を組み込めます。

```html
<!-- 変更前 -->
<div class="portrait-emoji">${c.emoji}</div>

<!-- 変更後（例） -->
<img src="assets/chara_${c.id}.png" style="width:100%;height:100%;object-fit:cover">
```

## BGM / SE の追加

`<audio>` タグまたは Web Audio API で実装できます。
`index.html` の `<head>` 内に追加してください。
