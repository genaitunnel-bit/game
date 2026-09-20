import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIntent, matchTask } from '../src/core/converse.js';

const TASKS = [
  { id: 'trash-burnable', title: '燃えるゴミ出し' },
  { id: 'laundry', title: '洗濯' },
  { id: 'tidy-living', title: 'リビングの片付け' },
];

test('日常の言い回しから意図を取る', () => {
  assert.equal(parseIntent('ゴミ出しやった').intent, 'done');
  assert.equal(parseIntent('洗濯終わったよ').intent, 'done');
  assert.equal(parseIntent('あとで').intent, 'snooze');
  assert.equal(parseIntent('今日はやらない').intent, 'skip');
  assert.equal(parseIntent('今日なにやることある？').intent, 'status');
  assert.equal(parseIntent('あなたは誰？').intent, 'self');
  assert.equal(parseIntent('うん').intent, 'yes');
  assert.equal(parseIntent('いや').intent, 'no');
  assert.equal(parseIntent('おなかすいた').intent, 'chat');
});

test('「15分待って」から分を取る', () => {
  const parsed = parseIntent('あと15分待って');
  assert.equal(parsed.intent, 'snooze');
  assert.equal(parsed.minutes, 15);
});

test('言われた語から対象のタスクを探す', () => {
  assert.equal(matchTask(TASKS, 'ゴミ出しやった', parseIntent('ゴミ出しやった').target).id, 'trash-burnable');
  assert.equal(matchTask(TASKS, '洗濯終わった', 'laundry').id, 'laundry');
  assert.equal(matchTask(TASKS, 'リビングの片付けやった', null).id, 'tidy-living');
  assert.equal(matchTask(TASKS, 'ごはん食べた', null), null);
});
