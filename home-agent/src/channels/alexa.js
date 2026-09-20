import { logger } from '../util/log.js';

const log = logger('alexa');

/**
 * Echo への通知。
 * Alexa は「勝手に喋る」ことが原則できないので、Notify Me スキル経由で
 * 通知を積む（ベルが鳴り、「アレクサ、通知を読んで」で読み上げられる）。
 * こちらから話しかけるのではなく、向こうから聞きに来てもらう形になる。
 * 逆方向（住人が Alexa に話しかける）は server/alexa.js のスキル側で受ける。
 */
export class AlexaChannel {
  constructor(options, { config } = {}) {
    this.accessCode = options.notifyMeAccessCode || process.env.NOTIFY_ME_ACCESS_CODE || '';
    this.speakOnlyWhenHome = options.speakOnlyWhenHome !== false;
    this.personaName = config?.persona?.name ?? 'エージェント';
    this.name = 'alexa';
  }

  async send(message) {
    if (!this.accessCode) {
      log.warn('Notify Me のアクセスコードが未設定なので送りません');
      return false;
    }
    if (this.speakOnlyWhenHome && message.anyoneHome === false) return false;
    if (message.silent) return false; // 静かな時間に Echo を鳴らさない
    try {
      const response = await fetch('https://api.notifymyecho.com/v1/NotifyMe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode: this.accessCode,
          notification: message.text,
          title: message.title ?? this.personaName,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (err) {
      log.warn('送信に失敗しました', err.message);
      return false;
    }
  }
}
