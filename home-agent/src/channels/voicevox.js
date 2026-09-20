import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { logger } from '../util/log.js';

const log = logger('voicevox');

const DEFAULT_PLAYER = process.platform === 'darwin' ? ['afplay'] : ['aplay', '-q'];

function play(command, filePath) {
  return new Promise((resolve) => {
    const [bin, ...args] = command;
    const child = spawn(bin, [...args, filePath], { stdio: 'ignore' });
    child.on('error', (err) => {
      log.warn(`再生コマンドが使えません (${bin}): ${err.message}`);
      resolve(false);
    });
    child.on('exit', (code) => resolve(code === 0));
  });
}

/**
 * ローカルの VOICEVOX エンジンに喋らせる。
 * 無料で、キャラクターの声が選べて、家の外に音声を出さない（全部ローカル HTTP）ので、
 * 「かわいい声で呼びかけてほしい」にいちばん素直に効く選択肢。
 */
export class VoicevoxChannel {
  constructor(options, { config } = {}) {
    this.name = 'voicevox';
    this.speaks = true;
    this.url = (options.url ?? 'http://127.0.0.1:50021').replace(/\/$/, '');
    this.speaker = options.speaker ?? 1;
    this.player = options.player ?? DEFAULT_PLAYER;
    this.tuning = {
      speedScale: options.speedScale ?? 1.05,
      pitchScale: options.pitchScale ?? 0.0,
      intonationScale: options.intonationScale ?? 1.1,
      volumeScale: options.volumeScale ?? 1.0,
    };
    this.keepFiles = options.keepFiles === true;
    this.personaName = config?.persona?.name ?? 'agent';
  }

  async send(message) {
    if (message.silent) return false; // 静かな時間に声は出さない
    const wav = await this.synthesize(message.text);
    if (!wav) return false;
    const file = path.join(os.tmpdir(), `home-agent-${Date.now()}.wav`);
    fs.writeFileSync(file, wav);
    const ok = await play(this.player, file);
    if (!this.keepFiles) fs.rm(file, () => {});
    return ok;
  }

  /** @returns {Promise<Buffer|null>} 合成した wav。エンジンが居なければ null。 */
  async synthesize(text) {
    try {
      const query = await fetch(`${this.url}/audio_query?text=${encodeURIComponent(text)}&speaker=${this.speaker}`, {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
      });
      if (!query.ok) throw new Error(`audio_query HTTP ${query.status}`);
      const params = { ...(await query.json()), ...this.tuning };

      const audio = await fetch(`${this.url}/synthesis?speaker=${this.speaker}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(20000),
      });
      if (!audio.ok) throw new Error(`synthesis HTTP ${audio.status}`);
      return Buffer.from(await audio.arrayBuffer());
    } catch (err) {
      log.warn(`合成できませんでした（エンジンは起動していますか）: ${err.message}`);
      return null;
    }
  }
}
