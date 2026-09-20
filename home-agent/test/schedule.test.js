import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesDate, occurrencesForDate, evalCondition, getPath } from '../src/core/schedule.js';

test('weekly は指定した曜日だけ', () => {
  const task = { id: 't', schedule: { type: 'weekly', days: ['mon', 'thu'], at: '07:00' } };
  assert.equal(matchesDate(task, '2026-09-21'), true); // 月
  assert.equal(matchesDate(task, '2026-09-24'), true); // 木
  assert.equal(matchesDate(task, '2026-09-22'), false); // 火
});

test('monthly の 31 日指定は短い月では月末に寄せる', () => {
  const task = { id: 't', schedule: { type: 'monthly', dates: [31], at: '10:00' } };
  assert.equal(matchesDate(task, '2026-02-28'), true);
  assert.equal(matchesDate(task, '2026-02-27'), false);
  assert.equal(matchesDate(task, '2026-03-31'), true);
});

test('interval は前回やった日からの間隔で決まる', () => {
  const task = { id: 't', schedule: { type: 'interval', everyDays: 3, at: '19:00' } };
  assert.equal(matchesDate(task, '2026-09-20', {}), true, '未実施なら今日から');
  assert.equal(matchesDate(task, '2026-09-22', { lastCompletedDate: '2026-09-20' }), false);
  assert.equal(matchesDate(task, '2026-09-23', { lastCompletedDate: '2026-09-20' }), true);
});

test('prep は本番の前日に置かれる', () => {
  const task = {
    id: 'trash',
    title: 'ゴミ出し',
    schedule: { type: 'weekly', days: ['mon'], at: '07:00' },
    prep: { title: 'ゴミまとめ', at: '21:00', offsetDays: -1 },
  };
  const sunday = occurrencesForDate(task, '2026-09-20');
  assert.deepEqual(sunday.map((o) => o.kind), ['prep']);
  assert.equal(sunday[0].mainDate, '2026-09-21');

  const monday = occurrencesForDate(task, '2026-09-21');
  assert.deepEqual(monday.map((o) => o.kind), ['main']);
});

test('deadline が due より前なら日末まで伸ばす（設定ミスで無言にならないように）', () => {
  const task = { id: 't', title: 'x', schedule: { type: 'daily', at: '22:00' }, deadline: '08:00' };
  assert.equal(occurrencesForDate(task, '2026-09-20')[0].deadlineMinutes, 1439);
});

test('センサー条件の評価', () => {
  const world = { laundry: { state: 'done' }, weather: { rain: false, rainChance: 80 }, trash: { full: true } };
  assert.equal(evalCondition('laundry.state == done', world), true);
  assert.equal(evalCondition('laundry.state != done', world), false);
  assert.equal(evalCondition('weather.rain', world), false);
  assert.equal(evalCondition('weather.rainChance > 60', world), true);
  assert.equal(evalCondition('trash.full', world), true);
  assert.equal(evalCondition('nothing.here', world), false);
  assert.equal(getPath(world, 'weather.rainChance'), 80);
});
