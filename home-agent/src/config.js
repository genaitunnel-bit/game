import fs from 'node:fs';
import path from 'node:path';
import { parseClock } from './util/time.js';

export const DEFAULTS = {
  tickSeconds: 60,
  persona: {
    name: 'アオ',
    firstPerson: 'わたし',
    traits: { warmth: 0.7, bluntness: 0.5, playfulness: 0.6, persistence: 0.7 },
    values: ['家が整っているとうれしい', '住人に無理はさせたくない'],
  },
  home: {
    timezone: 'Asia/Tokyo',
    quietHours: { from: '23:00', to: '07:00' },
    location: null,
    residents: [],
  },
  tasks: [],
  sensors: { presence: { enabled: false, method: 'ping' }, weather: { enabled: false } },
  channels: { console: { enabled: true } },
  llm: { enabled: false, provider: 'anthropic', model: 'claude-opus-5', apiKeyEnv: 'ANTHROPIC_API_KEY', maxTokens: 300 },
  server: { enabled: true, host: '127.0.0.1', port: 8787, tokenEnv: 'HOME_AGENT_TOKEN' },
  storePath: 'data/state.json',
};

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function merge(base, override) {
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(override ?? {})) {
    // 配列やオブジェクトは複製して入れる。呼び出し元の値を設定が握り続けると、
    // 提案の反映などで相手のデータまで書き換えてしまう。
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? merge(out[key], value) : structuredClone(value);
  }
  return out;
}

const VALID_SCHEDULES = new Set(['daily', 'weekly', 'interval', 'monthly', 'sensor']);

/** 設定の矛盾は起動時に全部出す。夜中に無言で止まるより恥をかくほうがいい。 */
export function validate(config) {
  const problems = [];
  const seen = new Set();
  for (const task of config.tasks) {
    if (!task.id) problems.push(`id のないタスクがあります: ${JSON.stringify(task).slice(0, 60)}`);
    else if (seen.has(task.id)) problems.push(`タスク id が重複しています: ${task.id}`);
    seen.add(task.id);
    const type = task.schedule?.type;
    if (!VALID_SCHEDULES.has(type)) problems.push(`${task.id}: schedule.type が不正です (${type})`);
    if (type !== 'sensor' && parseClock(task.schedule?.at) == null) {
      problems.push(`${task.id}: schedule.at は "HH:MM" 形式で指定してください`);
    }
    if (type === 'weekly' && !Array.isArray(task.schedule?.days)) problems.push(`${task.id}: weekly には days が必要です`);
    if (type === 'monthly' && !Array.isArray(task.schedule?.dates)) problems.push(`${task.id}: monthly には dates が必要です`);
    if (type === 'interval' && !(task.schedule?.everyDays > 0)) problems.push(`${task.id}: interval には everyDays が必要です`);
    if (type === 'sensor' && !task.schedule?.when) problems.push(`${task.id}: sensor には when が必要です`);
    if (task.deadline != null && parseClock(task.deadline) == null) problems.push(`${task.id}: deadline は "HH:MM" 形式で指定してください`);
  }
  if (!Intl.supportedValuesOf('timeZone').includes(config.home.timezone)) {
    problems.push(`未知のタイムゾーンです: ${config.home.timezone}`);
  }
  return problems;
}

export function loadConfig(configPath = process.env.HOME_AGENT_CONFIG ?? 'config/config.json') {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`設定ファイルが見つかりません: ${resolved}\n  config/config.example.json をコピーして作成してください。`);
  }
  const config = merge(DEFAULTS, JSON.parse(fs.readFileSync(resolved, 'utf8')));
  config.configPath = resolved;
  const problems = validate(config);
  if (problems.length) throw new Error(`設定に問題があります:\n- ${problems.join('\n- ')}`);
  return config;
}

export { merge };
