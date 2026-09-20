import { dayNumber, dowOf, parseClock, shiftDate } from '../util/time.js';

/** "weather.rain" のようなパスで world の値を取り出す。 */
export function getPath(obj, pathText) {
  return String(pathText)
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function coerce(raw) {
  const text = raw.trim().replace(/^["']|["']$/g, '');
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text !== '' && !Number.isNaN(Number(text))) return Number(text);
  return text;
}

/**
 * センサー条件の小さな式評価。
 * 対応するのは "path" / "path == value" / "path != value" / "path > 3" / "path < 3" だけ。
 * これ以上複雑な条件は設定ではなくコードで書くべき、という線引き。
 */
export function evalCondition(expression, world) {
  const m = /^\s*([\w.]+)\s*(==|!=|>=|<=|>|<)?\s*(.*?)\s*$/.exec(String(expression));
  if (!m) return false;
  const [, pathText, operator, rhsRaw] = m;
  const left = getPath(world, pathText);
  if (!operator) return Boolean(left);
  const right = coerce(rhsRaw);
  switch (operator) {
    case '==': return left === right;
    case '!=': return left !== right;
    case '>': return Number(left) > Number(right);
    case '<': return Number(left) < Number(right);
    case '>=': return Number(left) >= Number(right);
    case '<=': return Number(left) <= Number(right);
    default: return false;
  }
}

function daysInMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * その日にこのタスクの本番が来るか。
 * interval だけは「前回やった日」からの相対で決まるので lastCompletedDate を見る。
 */
export function matchesDate(task, dateStr, ctx = {}) {
  const s = task.schedule ?? {};
  switch (s.type) {
    case 'daily':
      return true;
    case 'weekly':
      return (s.days ?? []).map((d) => String(d).toLowerCase().slice(0, 3)).includes(dowOf(dateStr));
    case 'interval': {
      const last = ctx.lastCompletedDate;
      if (!last) return true; // 一度もやっていないなら今日が初日
      return dayNumber(dateStr) - dayNumber(last) >= s.everyDays;
    }
    case 'monthly': {
      const day = Number(dateStr.slice(8, 10));
      const last = daysInMonth(dateStr);
      // 31 日指定の月末クランプ（2月に「31日」と言われても月末に出す）
      return (s.dates ?? []).some((d) => Math.min(Number(d), last) === day);
    }
    default:
      return false; // sensor 型は日付では湧かない
  }
}

export function occurrenceId(date, taskId, kind) {
  return `${date}#${taskId}#${kind}`;
}

/**
 * ある日付に発生する予定（本番と前日準備）を組み立てる。
 * prep は「本番の offsetDays 日前」に置かれるので、今日の prep は未来の本番のものになる。
 */
export function occurrencesForDate(task, dateStr, ctx = {}) {
  const list = [];
  if (matchesDate(task, dateStr, ctx)) {
    const due = parseClock(task.schedule.at);
    const deadline = task.deadline ? parseClock(task.deadline) : null;
    list.push({
      id: occurrenceId(dateStr, task.id, 'main'),
      taskId: task.id,
      kind: 'main',
      title: task.title,
      emoji: task.emoji ?? '',
      date: dateStr,
      dueMinutes: due,
      deadlineMinutes: deadline != null && deadline > due ? deadline : 1439,
      importance: task.importance ?? 3,
      assignee: task.assignee ?? null,
    });
  }
  if (task.prep) {
    const offset = task.prep.offsetDays ?? -1;
    const mainDate = shiftDate(dateStr, -offset); // 今日が prep 日になる本番日
    if (matchesDate(task, mainDate, ctx)) {
      const due = parseClock(task.prep.at) ?? 0;
      list.push({
        id: occurrenceId(dateStr, task.id, 'prep'),
        taskId: task.id,
        kind: 'prep',
        title: task.prep.title ?? `${task.title}の準備`,
        emoji: task.emoji ?? '',
        date: dateStr,
        mainDate,
        dueMinutes: due,
        deadlineMinutes: task.prep.deadline ? parseClock(task.prep.deadline) : 1439,
        importance: Math.max(1, (task.importance ?? 3) - 1),
        assignee: task.assignee ?? null,
      });
    }
  }
  return list;
}
