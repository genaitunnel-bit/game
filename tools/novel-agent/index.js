#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const { extractPngPrompt } = require("./pngMeta");
const { checkPromptSafety } = require("./safety");
const { chatComplete } = require("./ollama");

const TECHNICAL_PARAMS_RE = /\n?Steps:\s*\d+.*$/s; // AUTOMATIC1111系のパラメータ行以降を除去

function parseArgs(argv) {
  const args = {
    model: process.env.OLLAMA_MODEL || "llama3.1",
    host: process.env.OLLAMA_HOST || "http://localhost:11434",
    chars: 2200,
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = () => argv[++i];
    switch (key) {
      case "--image":
        args.image = next();
        break;
      case "--prompt":
        args.prompt = next();
        break;
      case "--prompt-file":
        args.promptFile = next();
        break;
      case "--model":
        args.model = next();
        break;
      case "--host":
        args.host = next();
        break;
      case "--chars":
        args.chars = parseInt(next(), 10);
        break;
      case "--title":
        args.title = next();
        break;
      case "--out":
        args.out = next();
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`不明な引数です: ${key}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
novel-agent — 画像の生成プロンプトから約5分で読める小説（セリフ＋状況描写）を書くツール
セリフ生成LLMはローカルOllama（Claude以外）を使用します。

使い方:
  node tools/novel-agent/index.js --image <PNG画像パス> [オプション]
  node tools/novel-agent/index.js --prompt "<プロンプト本文>" [オプション]

オプション:
  --image <path>        生成プロンプトを埋め込んだPNG画像（Stable Diffusion系）
  --prompt <text>       直接プロンプト文字列を指定
  --prompt-file <path>  プロンプトをテキストファイルから読む
  --model <name>        Ollamaのモデル名 (デフォルト: llama3.1, 環境変数 OLLAMA_MODEL でも指定可)
  --host <url>          OllamaサーバーURL (デフォルト: http://localhost:11434)
  --chars <n>           目標文字数、5分黙読の目安 (デフォルト: 2200)
  --title <text>        小説のタイトル指定
  --out <path>          出力ファイルパス (省略時は標準出力のみ)

前提: ローカルでOllamaを起動し、モデルをpull済みであること
  $ ollama serve
  $ ollama pull llama3.1
`);
}

function stripTechnicalParams(rawPrompt) {
  const withoutTech = rawPrompt.replace(TECHNICAL_PARAMS_RE, "").trim();
  const [positive, negative = ""] = withoutTech.split(/\nNegative prompt:\s*/);
  return { positive: positive.trim(), negative: negative.trim() };
}

function buildSystemPrompt(targetChars) {
  return `あなたは日本語のライトノベル作家です。与えられた「画像の生成プロンプト（Stable Diffusion等のタグ列）」を手がかりに、その画像が描く一場面を膨らませた短編小説を書いてください。

必須ルール:
- 出力は日本語のみ。
- セリフ（「」で囲んだ会話文、話者が分かるように）と、地の文による状況・情景描写の両方を必ず含め、交互に織り交ぜること。
- 分量は${targetChars}文字前後（黙読でおよそ5分程度）を目安にすること。
- タグ列をそのまま列挙せず、情景・心情・関係性として自然に解釈し直すこと。
- 登場人物は全員成人として描写すること。幼い外見や年齢を示唆する要素があっても、性的・扇情的な描写は一切行わないこと。
- 露骨な性描写、暴力の詳細描写は行わないこと（示唆に留め、直接描写しない）。
- タグの技術的パラメータ（Steps, Sampler, CFG, Seed, Modelなど）は無視すること。`;
}

function buildUserPrompt({ positive, extra, title }) {
  const lines = [];
  if (title) lines.push(`タイトル案: ${title}`);
  lines.push("画像の生成プロンプト（タグ列）:");
  lines.push(positive || "(タグ情報なし)");
  if (extra) {
    lines.push("");
    lines.push("追加の指示・文脈:");
    lines.push(extra);
  }
  lines.push("");
  lines.push("上記を踏まえて小説本文のみを出力してください（前置きや解説は不要）。");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.image && !args.prompt && !args.promptFile)) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  let rawPrompt = "";
  if (args.image) {
    const extracted = extractPngPrompt(args.image);
    if (!extracted) {
      console.warn(`警告: ${args.image} から生成メタデータを抽出できませんでした。--prompt で補ってください。`);
    } else {
      rawPrompt = extracted;
    }
  }
  if (args.promptFile) {
    rawPrompt += (rawPrompt ? "\n" : "") + fs.readFileSync(args.promptFile, "utf8");
  }
  const extraInstruction = args.prompt || "";

  const safetyText = `${rawPrompt}\n${extraInstruction}`;
  const safety = checkPromptSafety(safetyText);
  if (safety.blocked) {
    console.error(
      `[中止] このプロンプトは幼児体型を示すタグ（${safety.minorTerms.join(", ")}）と性的なタグ（${safety.sexualTerms.join(
        ", "
      )}）の組み合わせを含んでいるため、小説生成を行いません。`
    );
    process.exit(1);
  }

  const { positive } = stripTechnicalParams(rawPrompt);
  const system = buildSystemPrompt(args.chars);
  const userPrompt = buildUserPrompt({ positive, extra: extraInstruction, title: args.title });

  console.error(`モデル ${args.model} (${args.host}) に生成をリクエストしています…`);
  const novel = await chatComplete({
    host: args.host,
    model: args.model,
    system,
    prompt: userPrompt,
  });

  const outputSafety = checkPromptSafety(novel);
  if (outputSafety.blocked) {
    console.error("[中止] 生成結果が不適切な内容を含んでいたため破棄しました。プロンプトを見直してください。");
    process.exit(1);
  }

  const header = args.title ? `# ${args.title}\n\n` : "";
  const finalText = `${header}${novel}\n`;

  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, finalText, "utf8");
    console.error(`保存しました: ${args.out} (${novel.length}文字)`);
  } else {
    console.log(finalText);
    console.error(`(${novel.length}文字)`);
  }
}

main().catch((err) => {
  console.error(`エラー: ${err.message}`);
  process.exit(1);
});
