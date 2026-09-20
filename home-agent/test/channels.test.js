import test from 'node:test';
import assert from 'node:assert/strict';
import { ChannelHub } from '../src/channels/index.js';
import { testConfig, tmpStore, jst } from './helpers.js';

/** 受け取ったメッセージを覚えておくだけのチャンネル。 */
function recorder(speaks) {
  return {
    name: speaks ? 'speaker' : 'notifier',
    speaks,
    got: [],
    async send(message) {
      this.got.push(message);
      return !message.silent;
    },
  };
}

function hub(config = {}) {
  const h = new ChannelHub({ config: testConfig({ channels: {}, ...config }), store: tmpStore() });
  h.channels = [recorder(true), recorder(false)];
  return h;
}

test('夜中の呼びかけは音を立てずに残す', async () => {
  const h = hub();
  await h.say({ text: 'リビングの片付け', importance: 2, now: jst('2026-09-21', '23:30') });
  assert.equal(h.channels[0].got[0].silent, true, '声は出さない');
  assert.equal(h.channels[1].got[0].silent, true, '通知は静かに積む');
});

test('夜中でも、重要なものは鳴らす', async () => {
  const h = hub();
  await h.say({ text: '明日の朝いちのゴミ出し', importance: 5, now: jst('2026-09-21', '23:30') });
  assert.equal(h.channels[0].got[0].silent, false);
});

test('話しかけられた返事は、夜中でも声で返す', async () => {
  const h = hub();
  const entry = await h.sayAloud('おかえり', { now: jst('2026-09-22', '02:00') });
  assert.deepEqual(entry.delivered, ['speaker'], '声を出せるチャンネルにだけ届く');
  assert.equal(h.channels[0].got[0].silent, false);
  assert.equal(h.channels[1].got.length, 0, '会話のたびにスマホへ通知は飛ばさない');
});

test('声を出せるチャンネルが無ければ、黙って何もしない', async () => {
  const h = hub();
  h.channels = [recorder(false)];
  assert.equal(await h.sayAloud('やっほー'), null);
});
