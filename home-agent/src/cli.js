import readline from 'node:readline/promises';
import { loadConfig } from './config.js';

/**
 * 端末から話しかけるための口。
 * 常駐プロセスと状態を取り合わないよう、必ず HTTP 越しに話す。
 */
const config = loadConfig(process.env.HOME_AGENT_CONFIG ?? 'config/config.json');
const token = process.env[config.server?.tokenEnv ?? 'HOME_AGENT_TOKEN'] ?? null;
const base = process.env.HOME_AGENT_URL ?? `http://127.0.0.1:${config.server?.port ?? 8787}`;

async function say(text) {
  const response = await fetch(`${base}/api/say`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ text, by: process.env.HOME_AGENT_USER ?? 'home' }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const name = config.persona.name;
const args = process.argv.slice(2).join(' ');

if (args) {
  const { reply } = await say(args);
  process.stdout.write(`${name}> ${reply}\n`);
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write(`${name} と話せます（Ctrl+C で終了）\n`);
  for (;;) {
    const line = (await rl.question('> ')).trim();
    if (!line) continue;
    if (['exit', 'quit', 'おやすみ'].includes(line)) {
      const { reply } = await say(line);
      process.stdout.write(`${name}> ${reply}\n`);
      break;
    }
    try {
      const { reply } = await say(line);
      process.stdout.write(`${name}> ${reply}\n`);
    } catch (err) {
      process.stdout.write(`（${name} に繋がりません: ${err.message}／npm start は動いていますか）\n`);
    }
  }
  rl.close()
}
