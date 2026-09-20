import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { logger } from '../util/log.js';

const log = logger('ears');

/**
 * 「認識結果を1行ずつ標準出力に吐くプログラム」なら何でも耳にできる差し込み口。
 *
 * これにした理由: 音声認識エンジンは重く、入れ替えも早い。Node の中に特定 SDK を
 * 抱え込むと、乗り換えのたびに本体が壊れる。外のプロセスに任せておけば、
 * Vosk でも whisper.cpp でもクラウドの CLI でも、設定の 1 行で差し替えられる。
 *
 * Vosk のように JSON を吐くものにも対応する（partial は捨てて確定文だけ拾う）。
 */
export class CommandEars {
  constructor({ command, args = [], cwd = null, env = {}, restartMs = 2000 }, onUtterance) {
    this.command = command;
    this.args = args;
    this.cwd = cwd;
    this.env = env;
    this.restartMs = restartMs;
    this.onUtterance = onUtterance;
    this.child = null;
    this.stopped = false;
    this.backoff = restartMs;
  }

  #extract(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{')) {
      try {
        const data = JSON.parse(trimmed);
        if (data.partial) return null; // 認識の途中経過は使わない
        return data.text ?? data.transcript ?? null;
      } catch {
        return trimmed; // JSON のつもりでない { 始まりの文はそのまま使う
      }
    }
    return trimmed;
  }

  start() {
    if (this.stopped) return;
    log.info(`耳を起動します: ${this.command} ${this.args.join(' ')}`);
    this.child = spawn(this.command, this.args, {
      cwd: this.cwd ?? undefined,
      env: { ...process.env, ...this.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    readline.createInterface({ input: this.child.stdout }).on('line', (line) => {
      const text = this.#extract(line);
      if (!text) return;
      this.backoff = this.restartMs; // ちゃんと動いているので待ち時間を戻す
      Promise.resolve(this.onUtterance(text)).catch((err) => log.warn('聞き取り後の処理で失敗', err.message));
    });

    readline.createInterface({ input: this.child.stderr }).on('line', (line) => log.debug(`stderr: ${line}`));

    this.child.on('error', (err) => log.warn(`耳のプロセスを起動できません: ${err.message}`));
    this.child.on('exit', (code, signal) => {
      this.child = null;
      if (this.stopped) return;
      // 落ちたら黙るのではなく、間隔を広げながら起き上がる（最長 30 秒）
      log.warn(`耳のプロセスが終了しました (code=${code} signal=${signal})。${Math.round(this.backoff / 1000)}秒後に再起動します`);
      this.timer = setTimeout(() => this.start(), this.backoff);
      this.timer.unref?.();
      this.backoff = Math.min(this.backoff * 2, 30_000);
    });
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.child?.kill();
    this.child = null;
  }
}
