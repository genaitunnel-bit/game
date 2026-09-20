import test from 'node:test';
import assert from 'node:assert/strict';
import { Ego } from '../src/core/ego.js';
import { testConfig, tmpStore, jst } from './helpers.js';

function ego(overrides = {}) {
  return new Ego({ config: testConfig(overrides), store: tmpStore() });
}

const occ = (over = {}) => ({ id: 'o1', taskId: 'trash', importance: 5, reminders: 1, ...over });

test('こぼれると苛立ち、終わると機嫌が戻る', () => {
  const e = ego();
  const before = e.state.mood;
  e.react({ type: 'missed', occurrence: occ() });
  assert.ok(e.state.mood < before);
  assert.ok(e.state.frustration > 0.1);

  const frustrated = e.state.frustration;
  e.react({ type: 'done', occurrence: occ(), by: 'yuki' });
  assert.ok(e.state.frustration < frustrated);
  assert.ok(e.state.bonds.yuki.trust > 0.5);
});

test('何度も言って動いてもらえないと、一度だけ「もう言わない」と言って引き下がる', () => {
  const e = ego();
  e.state.frustration = 0.9;
  const event = { type: 'remind', occurrence: occ({ reminders: 9 }), attempt: 9 };

  const first = e.decideVoice(event, {}, jst('2026-09-21', '10:00'));
  assert.equal(first.intent, 'give-up');
  assert.equal(first.speak, true);

  const second = e.decideVoice(event, {}, jst('2026-09-21', '10:30'));
  assert.equal(second.speak, false, '二度は言わない');
});

test('落ち着いているうちは粘る', () => {
  const e = ego();
  e.state.frustration = 0.2;
  const decision = e.decideVoice({ type: 'remind', occurrence: occ(), attempt: 2 }, {}, jst('2026-09-21', '10:00'));
  assert.notEqual(decision.intent, 'give-up');
  assert.equal(decision.speak, true);
});

test('夜は声のトーンが落ちる', () => {
  const e = ego();
  const decision = e.decideVoice({ type: 'due', occurrence: occ({ importance: 2 }) }, {}, jst('2026-09-21', '22:30'));
  assert.equal(decision.tone, 'quiet');
});

test('自分から話しかけるのは、家に人がいて、日に 3 回まで', () => {
  const e = ego();
  e.state.energy = 0.8;
  const summary = { missed: [], done: [], remaining: 1 };
  const urge = (clock) => {
    e.state.loneliness = 0.9;
    return e.wantsToSpeak({ anyoneHome: true }, summary, jst('2026-09-21', clock));
  };

  e.state.loneliness = 0.9;
  assert.equal(e.wantsToSpeak({ anyoneHome: false }, summary, jst('2026-09-21', '14:00')), null, '留守には話しかけない');
  assert.deepEqual(['14:00', '15:40', '17:20', '19:00'].map((c) => Boolean(urge(c))), [true, true, true, false]);
});

test('独り言を 5 分おきに繰り返さない', () => {
  const e = ego();
  e.state.energy = 0.8;
  const summary = { missed: [], done: [], remaining: 1 };
  e.state.loneliness = 0.9;
  assert.ok(e.wantsToSpeak({ anyoneHome: true }, summary, jst('2026-09-21', '14:00')));
  e.state.loneliness = 0.9;
  assert.equal(e.wantsToSpeak({ anyoneHome: true }, summary, jst('2026-09-21', '14:05')), null);
});

test('自己紹介は内部状態から組み立てられる', () => {
  const e = ego();
  e.state.loneliness = 0.9;
  const self = e.selfNarrative();
  assert.equal(self.name, 'アオ');
  assert.equal(self.loneliness, '寂しい');
  assert.equal(typeof self.daysAlive, 'number');
});
