import { inQuietHours, localParts } from '../util/time.js';
import { logger } from '../util/log.js';
import { NtfyChannel } from './ntfy.js';
import { AlexaChannel } from './alexa.js';
import { TermuxChannel } from './termux.js';
import { VoicevoxChannel } from './voicevox.js';
import { SayChannel } from './say.js';

const log = logger('channels');

class ConsoleChannel {
  constructor(_options, { config } = {}) {
    this.name = 'console';
    this.personaName = config?.persona?.name ?? 'agent';
  }

  async send(message) {
    process.stdout.write(`\n  ${this.personaName}> ${message.text}\n\n`);
    return true;
  }
}

const REGISTRY = { console: ConsoleChannel, ntfy: NtfyChannel, alexa: AlexaChannel, termux: TermuxChannel, voicevox: VoicevoxChannel, say: SayChannel };

export class ChannelHub {
  constructor({ config, store }) {
    this.config = config;
    this.store = store;
    store.data.outbox ??= [];
    this.channels = [];
    for (const [name, options] of Object.entries(config.channels ?? {})) {
      if (!options?.enabled || !REGISTRY[name]) continue;
      this.channels.push(
        new REGISTRY[name](options, {
          config,
          publicUrl: config.server?.publicUrl ?? null,
          token: process.env[config.server?.tokenEnv ?? 'HOME_AGENT_TOKEN'] ?? null,
        })
      );
    }
    log.info(`有効な出力先: ${this.channels.map((c) => c.name).join(', ') || 'なし'}`);
  }

  /**
   * 声だけで返す（通知は飛ばさない）。
   * 話しかけられた返事をスマホの通知にも積むと、会話のたびに通知が溜まって鬱陶しい。
   */
  async sayAloud(text, { world = {}, now = new Date(), quietHoursApply = false } = {}) {
    // 深夜でも、話しかけられた返事は声で返す。
    // 静かにしてほしいのは「こちらから勝手に鳴ること」であって、
    // 自分が今しゃべった相手が黙り込むことではない。
    const lp = localParts(now, this.config.home.timezone);
    const silent = quietHoursApply && inQuietHours(lp.minutes, this.config.home.quietHours);
    const speakers = this.channels.filter((channel) => channel.speaks);
    if (!speakers.length) return null;
    const message = { text, title: this.config.persona.name, priority: 3, silent, anyoneHome: world.anyoneHome ?? null };
    const entry = { at: new Date().toISOString(), text, kind: 'aloud', silent, delivered: [] };
    for (const channel of speakers) {
      try {
        if (await channel.send(message)) entry.delivered.push(channel.name);
      } catch (err) {
        log.warn(`${channel.name} への読み上げで例外`, err.message);
      }
    }
    return entry;
  }

  /**
   * 発話を各チャンネルへ。
   * 静かな時間は「黙る」のではなく「音を立てずに残す」。
   * 朝のゴミ出しは、前の晩に気づけたほうがいいので。
   */
  async say({ text, importance = 3, occurrenceId = null, world = {}, kind = 'notice', now = new Date() }) {
    const lp = localParts(now, this.config.home.timezone);
    const quiet = inQuietHours(lp.minutes, this.config.home.quietHours);
    const silent = quiet && importance < 5;
    const message = {
      text,
      title: this.config.persona.name,
      priority: Math.min(5, Math.max(1, importance)),
      occurrenceId,
      silent,
      anyoneHome: world.anyoneHome ?? null,
      tags: kind === 'missed' ? ['warning'] : [],
    };
    const entry = { at: new Date().toISOString(), text, kind, occurrenceId, silent, delivered: [] };
    for (const channel of this.channels) {
      try {
        if (await channel.send(message)) entry.delivered.push(channel.name);
      } catch (err) {
        log.warn(`${channel.name} への送信で例外`, err.message);
      }
    }
    this.store.data.outbox.push(entry);
    if (this.store.data.outbox.length > 200) this.store.data.outbox.shift();
    return entry;
  }
}
