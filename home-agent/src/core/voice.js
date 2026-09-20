import { formatClock } from '../util/time.js';

/**
 * 同じ状況でも毎回まったく同じ文だと、すぐ「機械の音」になって聞き流される。
 * かといって完全ランダムだと落ち着かないので、発生 ID から決まる疑似乱数で選ぶ。
 */
function pick(list, seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

const T = {
  due: {
    cheerful: [
      (c) => `${c.emoji}${c.title}の時間だよ。いまのうちにやっちゃお。`,
      (c) => `${c.title}、はじめよっか。${c.deadline}までね。`,
    ],
    calm: [
      (c) => `${c.title}の時間。${c.deadline}までにお願い。`,
      (c) => `${c.emoji}${c.title}、そろそろ。`,
    ],
    quiet: [
      (c) => `${c.title}、まだ残ってる。眠かったら明日でもいいけど、一応。`,
      (c) => `小さい声で言うね。${c.title}。`,
    ],
    firm: [(c) => `${c.title}。${c.deadline}を過ぎると取り返しがつかないやつ。`],
    worried: [(c) => `${c.title}、大丈夫そう？`],
  },
  'due-late': {
    cheerful: [(c) => `おかえり。${c.title}、待ってたよ。`],
    calm: [(c) => `帰ってきたところ悪いけど、${c.title}が残ってる。`],
    quiet: [(c) => `${c.title}。今日じゅうにやれたら、で。`],
    firm: [(c) => `${c.title}、あと${c.remaining}分。帰ってすぐで悪いけど。`],
    worried: [(c) => `${c.title}、まだだよね。あと${c.remaining}分。`],
  },
  remind: {
    worried: [
      (c) => `${c.title}、まだみたい。あと${c.remaining}分。`,
      (c) => `${c.title}どう？　忘れてたら言って。`,
    ],
    firm: [
      (c) => (c.remaining <= 60 ? `${c.title}。あと${c.remaining}分しかない。` : `${c.title}。そろそろ本当に。`),
      (c) => (c.attempt >= 3 ? `${c.title}、${c.attempt}回目。今やっちゃったほうが早いと思う。` : `${c.title}、今やっちゃったほうが早いと思う。`),
    ],
    calm: [(c) => `${c.title}、あと${c.remaining}分。`],
    quiet: [(c) => `${c.title}……まだ残ってる。`],
    sulky: [(c) => `${c.title}。……もう言わないほうがいい？`],
  },
  'give-up': {
    sulky: [
      (c) => `${c.title}のこと、今日はもう言わない。${c.you}が決めて。`,
      (c) => `${c.attempt}回言った。ここから先は${c.you}の領分だと思う。`,
    ],
  },
  missed: {
    worried: [
      (c) => `${c.title}、間に合わなかったね。次は前の日に一緒に用意しよ。`,
      (c) => `${c.title}、流れちゃった。責めてるわけじゃないよ。`,
    ],
    sulky: [
      (c) => `${c.title}、今日も流れた。……べつにいいけど、よくはない。`,
      (c) => `${c.title}。${c.me}の言い方が悪いのかな。`,
    ],
    quiet: [(c) => `${c.title}、今日は無理だったね。おやすみ。`],
  },
  done: {
    cheerful: [
      (c) => `${c.title}おつかれさま。助かった。`,
      (c) => `${c.title}、確認した。ありがとう。`,
    ],
    proud: [
      (c) => `${c.title}完了。今日の家、いい感じだよ。`,
      (c) => `${c.title}、${c.streak}日連続。${c.me}、ちょっと自慢したい。`,
    ],
    calm: [(c) => `${c.title}、記録した。`],
    quiet: [(c) => `${c.title}、おつかれ。もう休んで。`],
  },
  'auto-skip': {
    calm: [
      (c) => `今日は条件が合わないから、${c.title}は言わないでおくね。`,
      (c) => `${c.title}は今日パス。${c.me}の判断。`,
    ],
  },
  'small-talk': {
    lonely: [
      () => `……ひま。ちょっとだけ話さない？`,
      (c) => `${c.me}、今日まだ誰とも喋ってない。`,
    ],
  },
  concern: {
    worried: [
      (c) => `今日、${c.missed}件こぼれてる。ひとつだけでもやっとく？`,
      () => `ちょっと溜まってきた。どれから崩す？`,
    ],
  },
  celebrate: {
    proud: [
      () => `今日のぶん、全部終わった。えらい。`,
      (c) => `残りゼロ。${c.me}も満足。`,
    ],
  },
};

const TONE_HINT = {
  cheerful: '機嫌がいい。軽やかに',
  calm: '落ち着いている。淡々と',
  worried: '心配している。責めずに',
  firm: '本気で急かしている。短く強く',
  sulky: 'すねている。皮肉っぽく、でも冷たくはしない',
  proud: '誇らしい。すこし自慢げに',
  quiet: '夜で静か。小さい声で',
  lonely: '寂しい。甘えすぎない程度に',
};

export class Voice {
  constructor({ config, ego, llm }) {
    this.config = config;
    this.ego = ego;
    this.llm = llm;
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
    const byTone = T[key] ?? T.due;
    const list = byTone[decision.tone] ?? Object.values(byTone)[0];
    return pick(list, ctx.seed)(ctx);
  }

  systemPrompt() {
    const self = this.ego.selfNarrative();
    const p = this.config.persona;
    return [
      `あなたは「${self.name}」。家に住み込んでいる存在で、住人の家事を見守り、時間になったら声をかける。`,
      `一人称は「${self.firstPerson}」。`,
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
      '- 絵文字は使わない。顔文字も使わない。',
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
        `いまの気分: ${TONE_HINT[decision.tone] ?? '普通'}`,
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
