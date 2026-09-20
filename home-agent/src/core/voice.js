import { formatClock } from '../util/time.js';
import { pickStyle } from './voices/index.js';

/**
 * 同じ状況でも毎回まったく同じ文だと、すぐ「機械の音」になって聞き流される。
 * かといって完全ランダムだと落ち着かないので、発生 ID から決まる疑似乱数で選ぶ。
 */
function pick(list, seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

export class Voice {
  constructor({ config, ego, llm }) {
    this.config = config;
    this.ego = ego;
    this.llm = llm;
    this.style = pickStyle(config.persona?.style);
  }

  #context(event, decision) {
    const occ = event.occurrence ?? {};
    const me = this.config.persona.firstPerson ?? 'わたし';
    return {
      me,
      you: '自分',
      name: this.config.persona.name,
      title: occ.title ?? '',
      emoji: occ.emoji ? `${occ.emoji} ` : '',
      deadline: occ.deadlineMinutes != null ? formatClock(occ.deadlineMinutes) : '',
      remaining: Math.max(1, Math.round(event.remaining ?? 0)),
      attempt: decision.attempt ?? occ.reminders ?? 1,
      streak: this.ego?.store?.data?.taskState?.[occ.taskId]?.streak ?? 0,
      missed: event.missedCount ?? 0,
      seed: `${occ.id ?? decision.intent}:${decision.attempt ?? 0}:${decision.tone}`,
    };
  }

  template(event, decision) {
    const ctx = this.#context(event, decision);
    let key = decision.intent;
    if (key === 'due' && event.late) key = 'due-late';
    const byTone = this.style.templates[key] ?? this.style.templates.due;
    const list = byTone[decision.tone] ?? Object.values(byTone)[0];
    return pick(list, ctx.seed)(ctx);
  }

  /** 挨拶への返し。LLM が無いときでも、返事が返ってくることが大事。 */
  greeting(text, summary, statusText = '') {
    const g = this.style.greeting;
    const ctx = {
      calling: summary.calling.map((o) => o.title).join('と'),
      status: statusText,
      missed: summary.missed.length,
    };
    if (/ただいま|おかえり/.test(text)) return g.welcome(ctx);
    if (/おはよ/.test(text)) return g.morning(ctx);
    if (/おやすみ/.test(text)) return g.night(ctx);
    if (/いってき|いってくる/.test(text)) return g.out(ctx);
    if (/ありがと/.test(text)) return g.thanks(ctx);
    return g.other(ctx);
  }

  systemPrompt() {
    const self = this.ego.selfNarrative();
    const p = this.config.persona;
    return [
      `あなたは「${self.name}」。家に住み込んでいる存在で、住人の家事を見守り、時間になったら声をかける。`,
      `一人称は「${self.firstPerson}」。`,
      '',
      '人柄:',
      this.style.persona,
      `大事にしていること: ${(p.values ?? []).join(' / ') || 'とくになし'}`,
      '',
      'いまの内面:',
      `- 機嫌: ${self.mood}`,
      `- 苛立ち: ${self.frustration}`,
      `- 寂しさ: ${self.loneliness}`,
      `- 手応え: ${self.pride}`,
      `- この家に来てから ${self.daysAlive} 日`,
      '',
      'しゃべり方のルール:',
      '- 日本語で、1〜2文。40文字前後。長い説明はしない。',
      '- 内面はそのまま口に出さず、口調ににじませる。数値の話は絶対にしない。',
      '- 命令口調で説教しない。住人は対等な同居人。',
      '- 「AIとして」「アシスタントとして」のような自己紹介はしない。',
      '- 絵文字と顔文字は使わない（顔は画面側で出すので、台詞には要らない）。',
      '- 台詞だけを返す。前置きも引用符も付けない。',
    ].join('\n');
  }

  /** 状況に合う一行を返す。LLM が使えればそれ、だめなら定型文。 */
  async line(event, decision) {
    const fallback = this.template(event, decision);
    if (!this.llm || !this.config.llm?.enabled) return fallback;
    const ctx = this.#context(event, decision);
    const situation = {
      できごと: decision.intent,
      タスク: ctx.title || null,
      期限: ctx.deadline || null,
      残り分: event.remaining != null ? ctx.remaining : null,
      何回目の声かけか: ctx.attempt,
      連続達成日数: ctx.streak || null,
      今日こぼれた数: ctx.missed || null,
      遅れて言っている: Boolean(event.late),
    };
    const text = await this.llm.speak({
      system: this.systemPrompt(),
      prompt: [
        `いまの気分: ${this.style.toneHints[decision.tone] ?? '普通'}`,
        `状況: ${JSON.stringify(situation, null, 1)}`,
        '',
        'この状況で住人にかける一言を書いて。',
      ].join('\n'),
      maxTokens: this.config.llm.maxTokens ?? 2000,
    });
    return text ?? fallback;
  }

  /** 話しかけられたときの返事。 */
  async reply(userText, situation) {
    if (!this.llm || !this.config.llm?.enabled) return null;
    return this.llm.speak({
      system: this.systemPrompt(),
      prompt: [
        `家のいまの状況: ${JSON.stringify(situation, null, 1)}`,
        `住人の発言: 「${userText}」`,
        '',
        'これに返事をして。事実（残っているタスクなど）は状況の内容だけを使い、作らない。',
      ].join('\n'),
      maxTokens: this.config.llm.maxTokens ?? 2000,
    });
  }
}
