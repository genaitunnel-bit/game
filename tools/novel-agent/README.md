# novel-agent

画像（とその生成プロンプト）から、セリフと状況描写を含む約5分で読める短編小説を書くツールです。
セリフを生成するLLMには **Claude以外**（ローカルOllama上のモデル）を使用します。

## セットアップ

```bash
# Ollama をインストール後
ollama serve
ollama pull llama3.1   # 好きなモデルでOK（--model で切り替え可能）
```

## 使い方

```bash
# PNGに埋め込まれたStable Diffusion系メタデータから生成
node tools/novel-agent/index.js --image aicon/00013-2116136866.png --out story.md

# プロンプトを直接指定
node tools/novel-agent/index.js --prompt "廃教室、夕焼け、少女が窓辺に立つ" --title "放課後の約束" --out story.md

# npm scripts 経由
npm run novel -- --image aicon/00013-2116136866.png --out story.md
```

主なオプションは `--help` を参照してください。

## コンテンツフィルタ

プロンプト（画像メタデータ／`--prompt`／生成結果のいずれか）に、幼児体型を示すタグ（`loli` 等）と
性的なタグ（`nsfw` 等）が同時に含まれる場合、LLMへのリクエストを行わずに生成を中止します。
このリポジトリの `aicon/` フォルダには該当するテスト画像が含まれているため、そのまま渡すとブロックされます。
