import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskEngine } from '../src/core/tasks.js';
import { testConfig, tmpStore, jst } from './helpers.js';

const HOME = { anyoneHome: true };

function engine(tasks, overrides = {}) {
  const config = testConfig({ tasks, ...overrides });
  return new TaskEngine({ config, store: tmpStore() });
}

test('時間になったら呼びかけ、催促し、期限で諦める', () => {
  const e = engine([
    {
      id: 'trash',
      title: 'ゴミ出し',
      schedule: { type: 'weekly', days: ['mon'], at: '07:00' },
      deadline: '08:00',
      importance: 5,
      nag: { intervalMinutes: 20, max: 3 }, // 最初の呼びかけを含めて 3 回まで
    },
  ]);
  assert.deepEqual(e.tick(jst('2026-09-21', '06:30'), HOME).map((x) => x.type), []);

  const due = e.tick(jst('2026-09-21', '07:00'), HOME);
  assert.deepEqual(due.map((x) => x.type), ['due']);

  assert.deepEqual(e.tick(jst('2026-09-21', '07:10'), HOME).map((x) => x.type), [], '催促の間隔内では黙る');
  assert.deepEqual(e.tick(jst('2026-09-21', '07:20'), HOME).map((x) => x.type), ['remind']);
  assert.deepEqual(e.tick(jst('2026-09-21', '07:40'), HOME).map((x) => x.type), ['remind']);
  assert.deepEqual(e.tick(jst('2026-09-21', '07:55'), HOME).map((x) => x.type), [], 'max に達したら催促しない');

  const missed = e.tick(jst('2026-09-21', '08:00'), HOME);
  assert.deepEqual(missed.map((x) => x.type), ['missed']);
  assert.equal(e.stateOf('trash').missedCount, 1);
});

test('やったと言われたら止まり、連続記録が伸びる', () => {
  const e = engine([{ id: 'laundry', title: '洗濯', schedule: { type: 'daily', at: '08:30' }, deadline: '13:00' }]);
  const [due] = e.tick(jst('2026-09-21', '08:30'), HOME);
  e.complete(due.occurrence.id, 'yuki');
  assert.deepEqual(e.tick(jst('2026-09-21', '12:00'), HOME).map((x) => x.type), []);
  assert.equal(e.stateOf('laundry').streak, 1);
  assert.equal(e.stateOf('laundry').lastCompletedDate, '2026-09-21');
});

test('誰もいない家には呼びかけず、帰ってきてから言う', () => {
  const e = engine([
    {
      id: 'tidy',
      title: '片付け',
      schedule: { type: 'daily', at: '21:00' },
      deadline: '23:00',
      conditions: { requireHome: true },
    },
  ]);
  assert.deepEqual(e.tick(jst('2026-09-21', '21:00'), { anyoneHome: false }).map((x) => x.type), []);
  const back = e.tick(jst('2026-09-21', '21:30'), HOME);
  assert.deepEqual(back.map((x) => x.type), ['due']);
  assert.equal(back[0].late, true, '遅れて言っていることを自覚している');
});

test('留守でも期限直前なら言う', () => {
  const e = engine([
    { id: 'tidy', title: '片付け', schedule: { type: 'daily', at: '21:00' }, deadline: '23:00', conditions: { requireHome: true } },
  ]);
  assert.deepEqual(e.tick(jst('2026-09-21', '22:50'), { anyoneHome: false }).map((x) => x.type), ['due']);
});

test('雨なら洗濯は自分で見送る', () => {
  const e = engine([
    {
      id: 'laundry',
      title: '洗濯',
      schedule: { type: 'daily', at: '08:30' },
      deadline: '13:00',
      conditions: { skipIf: ['weather.rain'] },
    },
  ]);
  const events = e.tick(jst('2026-09-21', '08:30'), { anyoneHome: true, weather: { rain: true } });
  assert.deepEqual(events.map((x) => x.type), ['auto-skip']);
  assert.deepEqual(e.tick(jst('2026-09-21', '09:30'), { anyoneHome: true, weather: { rain: true } }).map((x) => x.type), []);
});

test('センサーの立ち上がりで湧くタスクは一度だけ', () => {
  const e = engine([
    {
      id: 'hang',
      title: '洗濯物を干す',
      schedule: { type: 'sensor', when: 'laundry.state == done' },
      deadlineMinutes: 90,
      nag: { intervalMinutes: 30, max: 2 },
    },
  ]);
  const idle = { anyoneHome: true, laundry: { state: 'running' } };
  const done = { anyoneHome: true, laundry: { state: 'done' } };
  assert.deepEqual(e.tick(jst('2026-09-21', '10:00'), idle).map((x) => x.type), []);
  const fired = e.tick(jst('2026-09-21', '10:05'), done);
  assert.deepEqual(fired.map((x) => x.type), ['due']);
  assert.deepEqual(e.tick(jst('2026-09-21', '10:06'), done).map((x) => x.type), [], '立ち上がりの瞬間だけ');
  assert.equal(fired[0].occurrence.deadlineMinutes, 10 * 60 + 5 + 90);
});

test('起動が遅れて期限切れのものを今さら騒がない', () => {
  const e = engine([{ id: 'trash', title: 'ゴミ出し', schedule: { type: 'daily', at: '07:00' }, deadline: '08:00' }]);
  assert.deepEqual(e.tick(jst('2026-09-21', '15:00'), HOME).map((x) => x.type), []);
  assert.equal(Object.values(e.occurrences)[0].status, 'lapsed');
});

test('後回しは催促を遅らせる', () => {
  const e = engine([
    { id: 'tidy', title: '片付け', schedule: { type: 'daily', at: '21:00' }, deadline: '23:00', nag: { intervalMinutes: 10, max: 5 } },
  ]);
  const [due] = e.tick(jst('2026-09-21', '21:00'), HOME);
  e.snooze(due.occurrence.id, 45, jst('2026-09-21', '21:05'));
  assert.deepEqual(e.tick(jst('2026-09-21', '21:30'), HOME).map((x) => x.type), []);
  assert.deepEqual(e.tick(jst('2026-09-21', '21:50'), HOME).map((x) => x.type), ['remind']);
});

test('日をまたいで残ったものは翌日の最初の tick でこぼれ扱いになる', () => {
  const e = engine([{ id: 'tidy', title: '片付け', schedule: { type: 'daily', at: '21:00' }, deadline: '23:30' }]);
  e.tick(jst('2026-09-21', '21:00'), HOME);
  const next = e.tick(jst('2026-09-22', '09:00'), HOME);
  assert.ok(next.some((x) => x.type === 'missed' && x.occurrence.date === '2026-09-21'));
});
