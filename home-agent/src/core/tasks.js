import { localParts, shiftDate } from '../util/time.js';
import { evalCondition, occurrencesForDate, occurrenceId } from './schedule.js';

const ACTIVE = new Set(['pending', 'calling']);
const KEEP_DAYS = 14;

/**
 * 予定を「発生」に変え、期限まで面倒を見る係。
 * ここは声のトーンを持たない。何が起きたかというイベントだけを返し、
 * どう言うかは ego / voice が決める。
 */
export class TaskEngine {
  constructor({ config, store }) {
    this.config = config;
    this.store = store;
    this.tz = config.home.timezone;
    store.data.occurrences ??= {};
    store.data.taskState ??= {};
    store.data.sensorEdges ??= {};
  }

  get occurrences() {
    return this.store.data.occurrences;
  }

  taskById(id) {
    return this.config.tasks.find((t) => t.id === id) ?? null;
  }

  stateOf(taskId) {
    this.store.data.taskState[taskId] ??= { lastCompletedDate: null, doneCount: 0, missedCount: 0, streak: 0 };
    return this.store.data.taskState[taskId];
  }

  /** その日ぶんの発生をまだ作っていなければ作る。 */
  materialize(dateStr, nowMinutes = null) {
    for (const task of this.config.tasks) {
      if (task.enabled === false) continue;
      for (const occ of occurrencesForDate(task, dateStr, this.stateOf(task.id))) {
        if (this.occurrences[occ.id]) continue;
        // 起動が遅れて期限を過ぎているものを今さら騒がない（記録だけ残す）
        const lapsed = nowMinutes != null && nowMinutes > occ.deadlineMinutes;
        this.occurrences[occ.id] = {
          ...occ,
          status: lapsed ? 'lapsed' : 'pending',
          reminders: 0,
          nextRemindMinutes: null,
          deferred: false,
          createdAt: new Date().toISOString(),
        };
      }
    }
  }

  /** 1 tick 進める。返り値は「起きたこと」の配列。 */
  tick(now, world = {}) {
    const lp = localParts(now, this.tz);
    const events = [];
    this.materialize(lp.date, lp.minutes);
    this.#sensorTasks(lp, world);

    for (const occ of Object.values(this.occurrences)) {
      if (!ACTIVE.has(occ.status)) continue;

      if (occ.date < lp.date) {
        this.#miss(occ, events);
        continue;
      }
      if (occ.date > lp.date) continue;

      const task = this.taskById(occ.taskId);
      if (!task) continue;

      if (occ.status === 'pending') {
        if (lp.minutes < occ.dueMinutes) continue;

        const skipReason = (task.conditions?.skipIf ?? []).find((expr) => evalCondition(expr, world));
        if (skipReason) {
          occ.status = 'auto-skipped';
          occ.reason = skipReason;
          events.push({ type: 'auto-skip', occurrence: occ, task, reason: skipReason });
          continue;
        }
        const unmet = (task.conditions?.onlyIf ?? []).find((expr) => !evalCondition(expr, world));
        if (unmet) continue; // 条件が整うまで黙って待つ

        // 誰もいない家に向かって言っても意味がない。帰ってきてから言う。
        const needHome = task.conditions?.requireHome && world.anyoneHome === false;
        const lastCall = occ.deadlineMinutes - 15;
        if (needHome && lp.minutes < lastCall) {
          occ.deferred = true;
          continue;
        }
        occ.status = 'calling';
        occ.reminders = 1;
        occ.firstCalledMinutes = lp.minutes;
        occ.nextRemindMinutes = lp.minutes + (task.nag?.intervalMinutes ?? 20);
        const late = occ.deferred || lp.minutes > occ.dueMinutes + 5;
        events.push({ type: 'due', occurrence: occ, task, late, world });
        continue;
      }

      // status === 'calling'
      if (lp.minutes >= occ.deadlineMinutes) {
        this.#miss(occ, events);
        continue;
      }
      // 留守のあいだは催促も止める。誰もいない部屋で鳴り続けても、帰る頃には
      // 催促の回数だけ使い切っている。
      if (task.conditions?.requireHome && world.anyoneHome === false && lp.minutes < occ.deadlineMinutes - 15) {
        continue;
      }
      const max = task.nag?.max ?? 3;
      if (occ.nextRemindMinutes != null && lp.minutes >= occ.nextRemindMinutes && occ.reminders < max) {
        occ.reminders += 1;
        occ.nextRemindMinutes = lp.minutes + (task.nag?.intervalMinutes ?? 20);
        events.push({
          type: 'remind',
          occurrence: occ,
          task,
          attempt: occ.reminders,
          remaining: occ.deadlineMinutes - lp.minutes,
          world,
        });
      }
    }

    this.#prune(lp.date);
    return events;
  }

  #sensorTasks(lp, world) {
    for (const task of this.config.tasks) {
      if (task.schedule?.type !== 'sensor' || task.enabled === false) continue;
      const now = evalCondition(task.schedule.when, world);
      const before = this.store.data.sensorEdges[task.id] ?? false;
      this.store.data.sensorEdges[task.id] = now;
      if (!now || before) continue; // 立ち上がりの瞬間だけ拾う

      const id = occurrenceId(lp.date, task.id, 'sensor');
      const existing = this.occurrences[id];
      if (existing && ACTIVE.has(existing.status)) continue;
      // 'pending' で置くだけにして、呼びかけの判断（留守なら待つ、雨なら見送る）は
      // 日付から湧いたタスクとまったく同じ道を通す。
      this.occurrences[id] = {
        id,
        taskId: task.id,
        kind: 'sensor',
        title: task.title,
        emoji: task.emoji ?? '',
        date: lp.date,
        dueMinutes: lp.minutes,
        deadlineMinutes: Math.min(1439, lp.minutes + (task.deadlineMinutes ?? 120)),
        importance: task.importance ?? 3,
        assignee: task.assignee ?? null,
        status: 'pending',
        reminders: 0,
        nextRemindMinutes: null,
        deferred: false,
        trigger: task.schedule.when,
        createdAt: new Date().toISOString(),
      };
    }
  }

  #miss(occ, events) {
    occ.status = 'missed';
    const state = this.stateOf(occ.taskId);
    state.missedCount += 1;
    state.streak = 0;
    events.push({ type: 'missed', occurrence: occ, task: this.taskById(occ.taskId) });
  }

  #prune(todayDate) {
    const limit = shiftDate(todayDate, -KEEP_DAYS);
    for (const [id, occ] of Object.entries(this.occurrences)) {
      if (occ.date < limit) delete this.occurrences[id];
    }
  }

  // ---- 住人からの操作 -------------------------------------------------

  complete(id, by = null) {
    const occ = this.occurrences[id];
    if (!occ) return null;
    const wasLate = occ.status === 'missed';
    occ.status = 'done';
    occ.doneAt = new Date().toISOString();
    occ.doneBy = by;
    const state = this.stateOf(occ.taskId);
    state.lastCompletedDate = occ.date;
    state.doneCount += 1;
    if (wasLate) state.missedCount = Math.max(0, state.missedCount - 1);
    else state.streak += 1;
    return { type: 'done', occurrence: occ, task: this.taskById(occ.taskId), by, wasLate };
  }

  skip(id, reason = null) {
    const occ = this.occurrences[id];
    if (!occ) return null;
    occ.status = 'skipped';
    occ.reason = reason;
    return { type: 'skipped', occurrence: occ, task: this.taskById(occ.taskId), reason };
  }

  snooze(id, minutes, now = new Date()) {
    const occ = this.occurrences[id];
    if (!occ) return null;
    const lp = localParts(now, this.tz);
    occ.nextRemindMinutes = lp.minutes + minutes;
    occ.snoozedUntil = occ.nextRemindMinutes;
    occ.reminders = Math.max(0, occ.reminders - 1); // 後回しは催促の回数に数えない
    return { type: 'snoozed', occurrence: occ, task: this.taskById(occ.taskId), minutes };
  }

  /**
   * 片付ける対象の発生を選ぶ。呼びかけ中 > これから > こぼれた、の順。
   * taskId を渡さなければ「いま一番うるさく言っているもの」を返す。
   */
  resolve(taskId = null, now = new Date()) {
    const rank = { calling: 0, pending: 1, missed: 2 };
    return (
      Object.values(this.occurrences)
        .filter((o) => rank[o.status] !== undefined && (!taskId || o.taskId === taskId))
        .sort(
          (a, b) =>
            rank[a.status] - rank[b.status] ||
            b.date.localeCompare(a.date) ||
            (b.importance ?? 3) - (a.importance ?? 3)
        )[0] ?? null
    );
  }

  /** 今日の状況。UI・Alexa・LLM への説明に使う共通の形。 */
  summary(now = new Date()) {
    const lp = localParts(now, this.tz);
    const todays = Object.values(this.occurrences).filter((o) => o.date === lp.date);
    const pick = (...statuses) => todays.filter((o) => statuses.includes(o.status));
    return {
      date: lp.date,
      now: lp.minutes,
      calling: pick('calling'),
      upcoming: pick('pending').sort((a, b) => a.dueMinutes - b.dueMinutes),
      done: pick('done'),
      missed: pick('missed'),
      autoSkipped: pick('auto-skipped'),
      remaining: pick('calling', 'pending').length,
    };
  }
}
