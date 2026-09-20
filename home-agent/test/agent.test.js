import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { HomeAgent } from '../src/core/agent.js';
import { testConfig, jst } from './helpers.js';

function tmpPath(suffix) {
  return path.join(os.tmpdir(), `home-agent-test-${crypto.randomUUID()}.${suffix}`);
}

function buildAgent(tasks, overrides = {}) {
  const config = testConfig({
    storePath: tmpPath('json'),
    channels: { console: { enabled: false } }, // テスト中は黙らせる（outbox には残る）
    sensors: { presence: { enabled: false }, weather: { enabled: false } },
    tasks,
    ...overrides,
  });
  return new HomeAgent(config);
}

const TRASH = {
  id: 'trash',
  title: 'ゴミ出し',
  emoji: '🗑️',
  schedule: { type: 'weekly', days: ['mon'], at: '07:00' },
  deadline: '08:00',
  importance: 5,
  nag: { intervalMinutes: 20, max: 3 },
};

test('時間になったら声をかけ、やったと言われたら止まる', async () => {
  const agent = buildAgent([TRASH]);

  const quiet = await agent.tick(jst('2026-09-21', '06:00'));
  assert.equal(quiet.spoken.length, 0);

  const called = await agent.tick(jst('2026-09-21', '07:00'));
  assert.equal(called.spoken.length, 1);
  assert.match(called.spoken[0].text, /ゴミ出し/);
  assert.equal(called.spoken[0].kind, 'due');

  const { reply, occurrence } = await agent.converse('ゴミ出しやった', { by: 'yuki', now: jst('2026-09-21', '07:05') });
  assert.ok(reply.length > 0);
  assert.equal(agent.tasks.occurrences[occurrence.id].status, 'done');

  const after = await agent.tick(jst('2026-09-21', '07:40'));
  assert.equal(after.spoken.length, 0, '終わったものを催促しない');
});

test('状況を聞かれたら今日の残りを答える', async () => {
  const agent = buildAgent([TRASH]);
  await agent.tick(jst('2026-09-21', '07:00'));
  const { reply, intent } = await agent.converse('今日の残りは？', { now: jst('2026-09-21', '07:10') });
  assert.equal(intent, 'status');
  assert.match(reply, /ゴミ出し/);
});

test('話しかけられると寂しさが減る', async () => {
  const agent = buildAgent([TRASH]);
  agent.ego.state.loneliness = 0.9;
  await agent.converse('ただいま', { now: jst('2026-09-21', '19:00') });
  assert.ok(agent.ego.state.loneliness < 0.9);
});

test('一日の終わりに日記を書く', async () => {
  const agent = buildAgent([TRASH]);
  await agent.tick(jst('2026-09-21', '22:50'));
  assert.equal(agent.ego.state.diary.length, 1);
  assert.equal(agent.ego.state.diary[0].date, '2026-09-21');

  await agent.tick(jst('2026-09-21', '22:55'));
  assert.equal(agent.ego.state.diary.length, 1, '一日に一度だけ');
});

test('何度もこぼれているタスクは、自分から時間の変更を提案し、同意で設定に反映される', async () => {
  const configPath = tmpPath('config.json');
  const agent = buildAgent([TRASH], { configPath });

  // 過去 2 週間、ゴミ出しが 3 回こぼれている状態を作る
  for (const date of ['2026-09-07', '2026-09-14', '2026-09-17']) {
    agent.store.data.occurrences[`${date}#trash#main`] = {
      id: `${date}#trash#main`, taskId: 'trash', kind: 'main', title: 'ゴミ出し',
      date, dueMinutes: 420, deadlineMinutes: 480, importance: 5, status: 'missed', reminders: 3,
    };
  }

  await agent.tick(jst('2026-09-21', '22:50'));
  const proposal = agent.store.data.pendingProposal;
  assert.ok(proposal, '提案が出ている');
  assert.equal(proposal.taskId, 'trash');

  const { reply } = await agent.converse('うん', { now: jst('2026-09-21', '22:52') });
  assert.match(reply, /そうする/);
  assert.equal(agent.config.tasks[0].prep.at, '21:00', '前日の準備が足された');
  assert.ok(fs.existsSync(configPath), '設定ファイルが書き戻された');
  assert.equal(JSON.parse(fs.readFileSync(configPath, 'utf8')).tasks[0].prep.at, '21:00');
  assert.equal(agent.store.data.pendingProposal, undefined);
});

test('提案を断ったら二度と同じことを言わない', async () => {
  const agent = buildAgent([TRASH]);
  for (const date of ['2026-09-07', '2026-09-14', '2026-09-17']) {
    agent.store.data.occurrences[`${date}#trash#main`] = {
      id: `${date}#trash#main`, taskId: 'trash', kind: 'main', title: 'ゴミ出し',
      date, dueMinutes: 420, deadlineMinutes: 480, importance: 5, status: 'missed', reminders: 3,
    };
  }
  await agent.tick(jst('2026-09-21', '22:50'));
  await agent.converse('いや', { now: jst('2026-09-21', '22:52') });
  assert.deepEqual(agent.store.data.rejectedProposals, ['trash:add-prep']);

  agent.store.data.lastReflectionDate = null;
  await agent.tick(jst('2026-09-22', '22:50'));
  assert.equal(agent.store.data.pendingProposal, undefined);
});
