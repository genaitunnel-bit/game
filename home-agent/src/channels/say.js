import { spawn } from 'node:child_process';
import { logger } from '../util/log.js';

const log = logger('say');

/**
 * 任意の読み上げコマンドに流す口。
 *   macOS      : ["say", "-v", "Kyoko"]
 *   Linux      : ["espeak-ng", "-v", "ja"]  /  open_jtalk のラッパースクリプト
 *   Windows    : PowerShell の SpeechSynthesizer を叩く .cmd など
 * {text} と書いた位置に文が入る。書かなければ末尾に足す。
 */
export class SayChannel {
  constructor(options) {
    this.name = 'say';
    this.speaks = true;
    this.command = options.command ?? (process.platform === 'darwin' ? ['say', '-v', 'Kyoko'] : ['espeak-ng', '-v', 'ja']);
  }

  async send(message) {
    if (message.silent) return false;
    const template = this.command;
    const hasSlot = template.includes('{text}');
    const args = (hasSlot ? template.map((part) => (part === '{text}' ? message.text : part)) : [...template, message.text]).slice(1);
    return new Promise((resolve) => {
      const child = spawn(template[0], args, { stdio: 'ignore' });
      child.on('error', (err) => {
        log.warn(`読み上げコマンドが使えません (${template[0]}): ${err.message}`);
        resolve(false);
      });
      child.on('exit', (code) => resolve(code === 0));
    });
  }
}
