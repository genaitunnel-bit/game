import { execFile } from 'node:child_process';
import { logger } from '../util/log.js';

const log = logger('termux');

function run(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 10000 }, (err) => resolve(!err));
  });
}

/**
 * Android 端末そのものに常駐させる場合（Termux）の出力。
 * 通知を出し、必要なら端末に声を出させる。家に置いた古いスマホがそのまま本体になる。
 */
export class TermuxChannel {
  constructor(options, { config } = {}) {
    this.speak = options.speak !== false;
    this.personaName = config?.persona?.name ?? 'home-agent';
    this.name = 'termux';
    this.speaks = options.speak !== false; // 端末に喋らせる設定なら、返事の読み上げにも使う
  }

  async send(message) {
    const ok = await run('termux-notification', [
      '--title', message.title ?? this.personaName,
      '--content', message.text,
      '--id', message.occurrenceId ?? 'home-agent',
      '--priority', message.silent ? 'low' : 'high',
    ]);
    if (!ok) {
      log.warn('termux-notification が使えません（Termux:API を入れてください）');
      return false;
    }
    if (this.speak && !message.silent && message.anyoneHome !== false) {
      await run('termux-tts-speak', ['-l', 'ja', message.text]);
    }
    return true;
  }
}
