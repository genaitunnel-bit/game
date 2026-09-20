/**
 * 聞こえた文を「返事すべきか」に振り分ける係。
 * 音声認識そのものは外部（Web Speech API / Vosk / whisper.cpp / クラウド）に任せ、
 * ここは認識結果のテキストだけを扱う。だから CI でもテストできる。
 */
const NOISE = /^[\s。、．，!！?？…ー\-]*$/;

/** 「ねえひなた、」のような呼びかけ部分を落とす。 */
function stripWake(text, wakeWord) {
  const index = text.indexOf(wakeWord);
  if (index < 0) return text;
  return (text.slice(0, index) + text.slice(index + wakeWord.length))
    .replace(/^[\s、,。.！!？?ー]*(ねえ|ねぇ|ちょっと|おーい|おい)?[\s、,。.！!？?ー]*/, '')
    .replace(/^[\s、,。.！!？?ー]+/, '')
    .trim();
}

export class Listener {
  constructor({
    wakeWords = [],
    alwaysOn = false,
    followUpSeconds = 25,
    minLength = 2,
    echoGuardSeconds = 2,
  } = {}) {
    this.wakeWords = wakeWords;
    this.alwaysOn = alwaysOn;
    this.followUpSeconds = followUpSeconds;
    this.minLength = minLength;
    this.echoGuardSeconds = echoGuardSeconds;
    this.openUntil = 0;
    this.mutedUntil = 0;
  }

  /** 自分がしゃべっている間は耳を塞ぐ。スピーカーの声を自分で拾って無限に会話しないため。 */
  mute(seconds = this.echoGuardSeconds, now = Date.now()) {
    this.mutedUntil = now + seconds * 1000;
  }

  /**
   * @returns {{handle: boolean, text?: string, reason?: string, awaitingCommand?: boolean}}
   */
  hear(raw, now = Date.now()) {
    const text = String(raw ?? '').trim();
    if (!text || NOISE.test(text)) return { handle: false, reason: 'noise' };
    if (now < this.mutedUntil) return { handle: false, reason: 'self' };

    const wake = this.wakeWords.find((word) => text.includes(word));
    if (wake) {
      const rest = stripWake(text, wake);
      this.openUntil = now + this.followUpSeconds * 1000;
      // 名前だけ呼ばれた（「ひなた？」）ときは、返事をして続きを待つ
      if (rest.length < this.minLength) return { handle: true, text: null, awaitingCommand: true };
      return { handle: true, text: rest };
    }

    if (this.alwaysOn || now < this.openUntil) {
      if (text.length < this.minLength) return { handle: false, reason: 'short' };
      if (!this.alwaysOn) this.openUntil = now + this.followUpSeconds * 1000; // 会話が続いている
      return { handle: true, text };
    }

    return { handle: false, reason: 'not-for-me' };
  }

  get listening() {
    return this.alwaysOn || Date.now() < this.openUntil;
  }
}

export { stripWake };
