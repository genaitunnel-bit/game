import os from 'node:os';
import path from 'node:path';
import { HomeAgent } from './core/agent.js';
import { merge, DEFAULTS } from './config.js';
import { localParts, formatClock } from './util/time.js';

/**
 * 一日を早送りして、エージェントがいつ何を言うかを見るためのデモ。
 * 実機もスマホも API キーも要らない（台詞は定型文）。
 */
const TZ = 'Asia/Tokyo';
const DATE = '2026-09-21'; // 月曜

const config = merge(DEFAULTS, {
  storePath: path.join(os.tmpdir(), `home-agent-demo-${Date.now()}.json`),
  home: { timezone: TZ, residents: [{ id: 'yuki', name: 'ゆき' }] },
  channels: { console: { enabled: false } }, // 出力はこのスクリプトが直接書く
  sensors: { presence: { enabled: false }, weather: { enabled: false } },
  llm: { enabled: false },
  server: { enabled: false },
  tasks: [
    {
      id: 'trash', title: '燃えるゴミ出し', emoji: '🗑️',
      schedule: { type: 'weekly', days: ['mon'], at: '07:00' }, deadline: '08:00',
      importance: 5, nag: { intervalMinutes: 15, max: 4 },
    },
    {
      id: 'laundry', title: '洗濯', emoji: '🧺',
      schedule: { type: 'daily', at: '08:30' }, deadline: '13:00',
      importance: 3, conditions: { skipIf: ['weather.rain'], requireHome: true }, nag: { intervalMinutes: 60, max: 2 },
    },
    {
      id: 'hang', title: '洗濯物を干す', emoji: '👕',
      schedule: { type: 'sensor', when: 'laundry.state == done' }, deadlineMinutes: 600,
      importance: 4, conditions: { requireHome: true }, nag: { intervalMinutes: 20, max: 3 },
    },
    {
      id: 'tidy', title: 'リビングの片付け', emoji: '🧹',
      schedule: { type: 'daily', at: '21:00' }, deadline: '23:00',
      importance: 2, conditions: { requireHome: true }, nag: { intervalMinutes: 30, max: 2 },
    },
  ],
});

const agent = new HomeAgent(config);
const at = (minutes) => new Date(`${DATE}T${formatClock(minutes)}:00+09:00`);

// その日の家の様子: 9時に外出して19時に帰宅、9時40分に洗濯機が止まる
function worldAt(minutes) {
  return {
    anyoneHome: minutes < 9 * 60 || minutes >= 19 * 60,
    weather: { known: true, rain: false },
    laundry: { state: minutes >= 9 * 60 + 40 ? 'done' : 'running' },
  };
}
agent.sensors.snapshot = async (now) => {
  const lp = localParts(now, TZ);
  return { time: { date: lp.date, minutes: lp.minutes }, ...worldAt(lp.minutes) };
};

// 住人の側の動き
const script = {
  [7 * 60 + 10]: 'ゴミ出してきた',
  [8 * 60 + 45]: 'あとで',
  [19 * 60 + 5]: 'ただいま',
  [19 * 60 + 25]: '洗濯物干した',
  [22 * 60 + 10]: '片付けやった',
};

console.log(`\n=== ${DATE}（月）を早送り ===\n`);
for (let minutes = 6 * 60; minutes <= 23 * 60; minutes += 5) {
  const now = at(minutes);
  const clock = formatClock(minutes);
  const { spoken } = await agent.tick(now);
  for (const entry of spoken) console.log(`${clock}  ${config.persona.name}: ${entry.text}`);

  const line = script[minutes];
  if (line) {
    console.log(`${clock}  ゆき　: ${line}`);
    const { reply } = await agent.converse(line, { by: 'yuki', now });
    console.log(`${clock}  ${config.persona.name}: ${reply}`);
  }
}

const self = agent.ego.selfNarrative();
console.log(`\n--- 一日の終わりの内面 ---`);
console.log(`機嫌: ${self.mood} / 苛立ち: ${self.frustration} / 手応え: ${self.pride}`);
console.log(`日記: ${agent.ego.state.diary.at(-1)?.text ?? '(なし)'}\n`);
