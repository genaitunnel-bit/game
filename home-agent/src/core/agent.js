import fs from 'node:fs';
import { Store } from './store.js';
import { TaskEngine } from './tasks.js';
import { Ego } from './ego.js';
import { Voice } from './voice.js';
import { SensorHub } from '../sensors/index.js';
import { ChannelHub } from '../channels/index.js';
import { AnthropicVoice } from '../llm/anthropic.js';
import { parseIntent, matchTasks } from './converse.js';
import { findProposal, applyProposal } from './insight.js';
import { formatClock, localParts, parseClock } from '../util/time.js';
import { logger } from '../util/log.js';

const log = logger('agent');

export class HomeAgent {
  constructor(config) {
    this.config = config;
    this.store = new Store(config.storePath, {});
    this.ego = new Ego({ config, store: this.store });
    this.tasks = new TaskEngine({ config, store: this.store });
    this.sensors = new SensorHub({ config, store: this.store });
    this.channels = new ChannelHub({ config, store: this.store });
    this.llm = config.llm?.enabled ? new AnthropicVoice(config.llm) : null;
    this.voice = new Voice({ config, ego: this.ego, llm: this.llm });
    this.reflectAt = parseClock(config.home.reflectAt ?? '22:45');
  }

  // ---- 1 tick ---------------------------------------------------------

  async tick(now = new Date()) {
    const world = await this.sensors.snapshot(now);
    const events = this.tasks.tick(now, world);
    const summary = this.tasks.summary(now);
    const spoken = [];

    for (const event of events) {
      event.missedCount = summary.missed.length;
      this.ego.react(event, now);
      const decision = this.ego.decideVoice(event, world, now);
      if (!decision.speak) {
        log.debug('黙った', { event: event.type, reason: decision.reason });
        continue;
      }
      const text = await this.voice.line(event, decision);
      spoken.push(
        await this.channels.say({
          text,
          importance: event.occurrence?.importance ?? 3,
          occurrenceId: event.occurrence?.id ?? null,
          kind: event.type,
          world,
          now,
        })
      );
    }

    this.ego.decay(now);

    if (!events.length) {
      const urge = this.ego.wantsToSpeak(world, summary, now);
      if (urge) {
        const text = await this.voice.line({ type: urge.intent, missedCount: summary.missed.length }, { ...urge, speak: true });
        spoken.push(await this.channels.say({ text, importance: 1, kind: urge.intent, world, now }));
      }
    }

    await this.#nightly(now, summary, world);
    this.store.save();
    return { world, events, spoken, summary };
  }

  /** 一日の終わりに振り返り、必要なら自分からルール変更を提案する。 */
  async #nightly(now, summary, world) {
    const lp = localParts(now, this.config.home.timezone);
    if (lp.minutes < this.reflectAt) return;
    if (this.store.data.lastReflectionDate === lp.date) return;
    this.store.data.lastReflectionDate = lp.date;

    let text = null;
    if (this.llm && this.config.llm?.enabled) {
      text = await this.llm.speak({
        system: this.voice.systemPrompt(),
        prompt: [
          `今日の記録: 完了 ${summary.done.length} 件 / こぼれた ${summary.missed.length} 件 / 見送り ${summary.autoSkipped.length} 件`,
          `完了: ${summary.done.map((o) => o.title).join('、') || 'なし'}`,
          `こぼれた: ${summary.missed.map((o) => o.title).join('、') || 'なし'}`,
          '',
          'これは誰にも見せない日記。今日を1〜2文で振り返って。',
        ].join('\n'),
        maxTokens: this.config.llm.maxTokens ?? 2000,
      });
    }
    const entry = this.ego.reflect(
      summary,
      text ?? `完了${summary.done.length}件、こぼれ${summary.missed.length}件。${summary.missed.length ? '明日は先に声をかける。' : '悪くない一日。'}`
    );
    log.info('日記', entry.text);

    const proposal = findProposal({ config: this.config, store: this.store, todayDate: lp.date });
    if (proposal && this.store.data.rejectedProposals?.includes?.(proposal.id) !== true && !this.store.data.pendingProposal) {
      this.store.data.pendingProposal = { ...proposal, offeredAt: new Date().toISOString() };
      this.ego.remember(`${proposal.taskId} の時間設定が合っていないかもしれない`, now);
      await this.channels.say({ text: proposal.text, importance: 2, kind: 'proposal', world, now });
    }
  }

  // ---- 住人との会話 ---------------------------------------------------

  async converse(text, { by = 'home', now = new Date() } = {}) {
    const { intent, target, minutes } = parseIntent(text);
    const summary = this.tasks.summary(now);
    this.ego.react({ type: 'talk', by }, now);

    const finish = (reply, extra = {}) => {
      this.store.save();
      return { reply, intent, ...extra };
    };

    const pending = this.store.data.pendingProposal;
    if (pending && (intent === 'yes' || intent === 'no')) {
      delete this.store.data.pendingProposal;
      if (intent === 'no') {
        this.store.data.rejectedProposals ??= [];
        this.store.data.rejectedProposals.push(pending.id);
        return finish('わかった。今のままでやってみる。');
      }
      const applied = applyProposal(this.config, pending);
      if (applied) this.#writeConfig();
      return finish(applied ? 'ありがとう。じゃあ明日からそうするね。' : 'うまく直せなかった。設定を見てみて。');
    }

    if (intent === 'done' || intent === 'skip' || intent === 'snooze') {
      // 候補を確からしい順に見て、実際に動いている発生を持つ最初のものを採る。
      // 「洗濯物干した」で今日こぼれた「洗濯」を閉じてしまわないように。
      let occurrence = null;
      for (const task of matchTasks(this.config.tasks, text, target)) {
        occurrence = this.tasks.resolve(task.id, now);
        if (occurrence) break;
      }
      occurrence ??= this.tasks.resolve(null, now);
      if (!occurrence) return finish('いま追いかけてるものは無いよ。');
      const event =
        intent === 'done'
          ? this.tasks.complete(occurrence.id, by)
          : intent === 'skip'
            ? this.tasks.skip(occurrence.id, text)
            : this.tasks.snooze(occurrence.id, minutes ?? 30, now);
      this.ego.react(event, now);
      const decision = this.ego.decideVoice(event, {}, now);
      const reply =
        intent === 'done'
          ? await this.voice.line(event, { ...decision, intent: 'done' })
          : intent === 'skip'
            ? `${occurrence.title}は今日はやめておくね。`
            : `${occurrence.title}、${minutes ?? 30}分後にまた言う。`;
      return finish(reply, { occurrence });
    }

    if (intent === 'status') return finish(this.statusText(summary));

    if (intent === 'greet') {
      const llmReply = await this.voice.reply(text, { 今日: this.statusText(summary) });
      return finish(llmReply ?? this.#greeting(text, summary));
    }

    if (intent === 'self') {
      const self = this.ego.selfNarrative();
      const llmReply = await this.voice.reply(text, { 自分: self, 今日: this.statusText(summary) });
      return finish(
        llmReply ??
          `${self.firstPerson}は${self.name}。この家に来て${self.daysAlive}日。機嫌は${self.mood}。いまは${self.loneliness}。`
      );
    }

    const llmReply = await this.voice.reply(text, {
      今日: this.statusText(summary),
      家: await this.sensors.snapshot(now),
    });
    return finish(llmReply ?? 'ん、聞いてる。');
  }

  /** LLM が無いときの挨拶。素っ気なくても、返事が返ってくることが大事。 */
  #greeting(text, summary) {
    if (/ただいま|おかえり/.test(text)) {
      if (!summary.calling.length) return 'おかえり。ゆっくりして。';
      return `おかえり。${summary.calling.map((o) => o.title).join('と')}だけ残ってる。`;
    }
    if (/おはよ/.test(text)) return `おはよう。${this.statusText(summary)}`;
    if (/おやすみ/.test(text)) {
      return summary.missed.length ? 'おやすみ。今日のぶんは明日でいいよ。' : 'おやすみ。今日はよくやった。';
    }
    if (/いってき|いってくる/.test(text)) return 'いってらっしゃい。家のことは見てる。';
    if (/ありがと/.test(text)) return 'どういたしまして。';
    return 'うん。';
  }

  statusText(summary = this.tasks.summary()) {
    const line = (occ) => `${occ.title}（${formatClock(occ.dueMinutes)}）`;
    const parts = [];
    if (summary.calling.length) parts.push(`いま待ってるのは ${summary.calling.map(line).join('、')}`);
    if (summary.upcoming.length) parts.push(`このあと ${summary.upcoming.map(line).join('、')}`);
    if (summary.missed.length) parts.push(`こぼれたのが ${summary.missed.map((o) => o.title).join('、')}`);
    if (!parts.length) return summary.done.length ? '今日のぶんは全部終わってるよ。' : '今日はとくに何もないよ。';
    return `${parts.join('。')}。`;
  }

  status(now = new Date()) {
    return {
      persona: this.config.persona.name,
      self: this.ego.selfNarrative(),
      summary: this.tasks.summary(now),
      pendingProposal: this.store.data.pendingProposal ?? null,
      recent: this.store.data.outbox.slice(-10),
      diary: this.ego.state.diary.slice(-3),
    };
  }

  #writeConfig() {
    const { configPath, ...rest } = this.config;
    if (!configPath) return; // 設定ファイル無しで組み立てられた場合（テストなど）
    fs.writeFileSync(configPath, `${JSON.stringify(rest, null, 2)}\n`);
    log.info('設定を更新しました', configPath);
  }
}
