import { formatClock, shiftDate } from '../util/time.js';

/**
 * 「言われたとおりに起こす」だけで終わらせないための部分。
 * 過去の記録を見て、"この時間設定は住人に合っていない" と気づいたら、
 * 自分からルールの変更を提案する。押しつけはしない（採否は住人が決める）。
 */
export function findProposal({ config, store, todayDate }) {
  const since = shiftDate(todayDate, -14);
  const byTask = new Map();
  for (const occ of Object.values(store.data.occurrences ?? {})) {
    if (occ.date < since || occ.kind === 'prep') continue;
    const bucket = byTask.get(occ.taskId) ?? { missed: 0, done: 0, lateDone: 0, firstCalls: [] };
    if (occ.status === 'missed') bucket.missed += 1;
    if (occ.status === 'done') {
      bucket.done += 1;
      if (occ.doneAt && occ.firstCalledMinutes != null) bucket.firstCalls.push(occ.reminders ?? 1);
    }
    byTask.set(occ.taskId, bucket);
  }

  for (const task of config.tasks) {
    const stats = byTask.get(task.id);
    if (!stats || stats.missed < 3 || stats.done > stats.missed) continue;
    const at = task.schedule?.at;
    if (!at || task.schedule.type === 'sensor') continue;

    const [h, m] = at.split(':').map(Number);
    const current = h * 60 + m;
    // 朝いちで間に合っていないなら、前の晩に片付けてしまうほうが現実的
    if (current < 9 * 60 && !task.prep) {
      return {
        id: `${task.id}:add-prep`,
        taskId: task.id,
        kind: 'add-prep',
        stats,
        text: `${task.title}、この2週間で${stats.missed}回こぼれてる。朝だとしんどいなら、前の晩の21時に準備だけ声かけるようにしない？`,
        payload: { prepAt: '21:00' },
      };
    }
    const shifted = Math.max(0, current - 60);
    return {
      id: `${task.id}:shift`,
      taskId: task.id,
      kind: 'shift',
      stats,
      text: `${task.title}、${at}だと${stats.missed}回間に合ってない。${formatClock(shifted)}に前倒ししてみない？`,
      payload: { at: formatClock(shifted) },
    };
  }
  return null;
}

/** 提案を実際の設定に反映する。採否は住人が決めたあとにだけ呼ばれる。 */
export function applyProposal(config, proposal) {
  const task = config.tasks.find((t) => t.id === proposal.taskId);
  if (!task) return false;
  if (proposal.kind === 'add-prep') {
    task.prep = { title: `${task.title}の準備`, at: proposal.payload.prepAt, offsetDays: -1 };
    return true;
  }
  if (proposal.kind === 'shift') {
    task.schedule.at = proposal.payload.at;
    return true;
  }
  return false;
}
