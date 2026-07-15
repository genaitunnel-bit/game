"use strict";

/**
 * ローカル Ollama サーバーにチャット補完をリクエストする薄いクライアント。
 * セリフ生成LLMをClaude以外にするための実装（Ollamaで動くモデルなら何でも可）。
 */
async function chatComplete({ host, model, system, prompt, temperature = 0.8 }) {
  let res;
  try {
    res = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch (err) {
    throw new Error(
      `Ollamaサーバー(${host})に接続できませんでした。'ollama serve' が起動しているか確認してください。詳細: ${err.message}`
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama APIエラー (HTTP ${res.status}): ${body || res.statusText}`);
  }

  const json = await res.json();
  const content = json?.message?.content;
  if (!content) {
    throw new Error("Ollamaからの応答にテキストが含まれていませんでした。");
  }
  return content.trim();
}

module.exports = { chatComplete };
