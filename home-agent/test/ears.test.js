import test from 'node:test';
import assert from 'node:assert/strict';
import { Listener } from '../src/ears/listener.js';
import { CommandEars } from '../src/ears/command.js';
import { EarHub } from '../src/ears/index.js';
import { testConfig } from './helpers.js';

const T0 = new Date('2026-09-21T10:00:00+09:00').getTime();

test('名前を呼ばれたときだけ返事をする', () => {
  const ears = new Listener({ wakeWords: ['ひなた'] });
  assert.deepEqual(ears.hear('今日はいい天気だね', T0), { handle: false, reason: 'not-for-me' });
  assert.deepEqual(ears.hear('ねえひなた、ゴミ出しやった', T0), { handle: true, text: 'ゴミ出しやった' });
});

test('呼びかけのあと少しのあいだは、名前なしでも聞いている', () => {
  const ears = new Listener({ wakeWords: ['ひなた'], followUpSeconds: 25 });
  ears.hear('ひなた、おはよう', T0);
  assert.equal(ears.hear('洗濯もやっておいた', T0 + 10_000).handle, true, '会話の途中');
  assert.equal(ears.hear('あとお風呂も', T0 + 30_000).handle, true, '話が続けば窓は延びる');
  assert.equal(ears.hear('ところで明日の天気は', T0 + 90_000).handle, false, '黙ったら閉じる');
});

test('名前だけ呼ばれたら、返事をして続きを待つ', () => {
  const ears = new Listener({ wakeWords: ['ひなた'] });
  const heard = ears.hear('ひなたー', T0);
  assert.deepEqual(heard, { handle: true, text: null, awaitingCommand: true });
  assert.equal(ears.hear('ゴミ出しやったよ', T0 + 3000).handle, true);
});

test('自分がしゃべっている間は自分の声を拾わない', () => {
  const ears = new Listener({ wakeWords: ['ひなた'], alwaysOn: true });
  ears.mute(3, T0);
  assert.deepEqual(ears.hear('ゴミ出しの時間だよ', T0 + 1000), { handle: false, reason: 'self' });
  assert.equal(ears.hear('ゴミ出しやった', T0 + 4000).handle, true);
});

test('常時待ち受けでは呼びかけが要らない。雑音は捨てる', () => {
  const ears = new Listener({ wakeWords: ['ひなた'], alwaysOn: true });
  assert.equal(ears.hear('洗濯やった', T0).handle, true);
  assert.equal(ears.hear('  。、  ', T0).handle, false);
  assert.equal(ears.hear('あ', T0).handle, false, '一文字は認識ミスとみなす');
});

test('認識結果を標準出力に吐くプログラムなら何でも耳にできる（Vosk の JSON も）', async () => {
  const script = [
    "console.log('ゴミ出しやった');",
    "console.log(JSON.stringify({ partial: 'せん' }));", // 途中経過は無視される
    "console.log(JSON.stringify({ text: '洗濯やった' }));",
  ].join('');
  const heard = [];
  const done = new Promise((resolve) => {
    const ears = new CommandEars({ command: process.execPath, args: ['-e', script] }, (text) => {
      heard.push(text);
      if (heard.length === 2) {
        ears.stop();
        resolve();
      }
    });
    ears.start();
  });
  await done;
  assert.deepEqual(heard, ['ゴミ出しやった', '洗濯やった']);
});

function fakeAgent() {
  const calls = { said: [], aloud: [] };
  return {
    calls,
    voice: { style: { replies: { summoned: () => 'なぁに？' } } },
    async converse(text) {
      calls.said.push(text);
      return { reply: `「${text}」だね` };
    },
    async sayAloud(text) {
      calls.aloud.push(text);
    },
  };
}

test('聞こえた声を会話につなぎ、返事を声に出す', async () => {
  const agent = fakeAgent();
  const hub = new EarHub({ config: testConfig({ ears: { provider: 'command', wakeWords: ['ひなた'] } }), agent });

  assert.equal(await hub.utterance('テレビの音', T0), null, '呼ばれていなければ何もしない');
  assert.deepEqual(agent.calls.said, []);

  const reply = await hub.utterance('ひなた、ゴミ出しやった', T0);
  assert.equal(reply, '「ゴミ出しやった」だね');
  assert.deepEqual(agent.calls.said, ['ゴミ出しやった']);
  assert.deepEqual(agent.calls.aloud, ['「ゴミ出しやった」だね']);
});

test('名前だけ呼ばれたら、会話には渡さず返事だけする', async () => {
  const agent = fakeAgent();
  const hub = new EarHub({ config: testConfig({ ears: { provider: 'command', wakeWords: ['ひなた'] } }), agent });
  assert.equal(await hub.utterance('ひなた', T0), 'なぁに？');
  assert.deepEqual(agent.calls.said, []);
  assert.deepEqual(agent.calls.aloud, ['なぁに？']);
});
