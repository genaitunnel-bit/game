import { Listener } from './listener.js';
import { CommandEars } from './command.js';
import { logger } from '../util/log.js';

const log = logger('ears');

/**
 * 耳。認識エンジンの違いは provider に閉じ込め、外には
 * 「聞こえた文が来たら agent に渡して、返事を声に出す」だけを見せる。
 *
 *   browser : スマホのブラウザ（Web Speech API）から /api/say に届く。常駐プロセスは要らない。
 *   command : 認識結果を標準出力に吐く外部プログラム（Vosk / whisper.cpp / クラウドCLI）。
 *   none    : 音声なし。
 */
export class EarHub {
  constructor({ config, agent }) {
    this.config = config.ears ?? {};
    this.agent = agent;
    this.listener = new Listener({
      wakeWords: this.config.wakeWords ?? [config.persona?.name].filter(Boolean),
      alwaysOn: this.config.alwaysOn === true,
      followUpSeconds: this.config.followUpSeconds ?? 25,
      echoGuardSeconds: this.config.echoGuardSeconds ?? 2,
    });
    this.source = null;
  }

  /** 認識された一文を処理して、返した台詞（あれば）を返す。 */
  async utterance(text, now = Date.now()) {
    const decision = this.listener.hear(text, now);
    if (!decision.handle) {
      log.debug(`聞き流した (${decision.reason}): ${text}`);
      return null;
    }
    const reply = decision.awaitingCommand
      ? this.agent.voice.style.replies.summoned()
      : (await this.agent.converse(decision.text, { by: 'voice' })).reply;
    await this.agent.sayAloud(reply);
    // 自分の声を自分で拾わないよう、読み上げが終わるまで耳を塞ぐ
    this.listener.mute(this.config.echoGuardSeconds ?? 2 + reply.length / 12);
    return reply;
  }

  start() {
    const provider = this.config.provider ?? 'none';
    if (provider === 'none') return null;
    if (provider === 'browser') {
      log.info('耳はブラウザ側（Web Speech API）です。ダッシュボードのマイクから話しかけてください');
      return null;
    }
    if (provider === 'command') {
      if (!this.config.command) {
        log.warn('ears.command が設定されていないので、音声入力は動きません');
        return null;
      }
      this.source = new CommandEars(this.config, (text) => this.utterance(text));
      this.source.start();
      return this.source;
    }
    log.warn(`知らない ears.provider です: ${provider}`);
    return null;
  }

  stop() {
    this.source?.stop();
  }
}
