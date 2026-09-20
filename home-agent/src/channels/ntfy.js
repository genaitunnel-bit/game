import { logger } from '../util/log.js';

const log = logger('ntfy');

/**
 * Android への通知。ntfy を選んだ理由は、アカウントもキーも要らず、
 * 家の Wi-Fi が落ちていてもスマホ側には届くから。
 * publicUrl を設定すると、通知の「やった/あとで」ボタンがそのまま API を叩く。
 */
export class NtfyChannel {
  constructor(options, { publicUrl, token } = {}) {
    this.server = (options.server ?? 'https://ntfy.sh').replace(/\/$/, '');
    this.topic = options.topic;
    this.publicUrl = publicUrl?.replace(/\/$/, '') ?? null;
    this.token = token ?? null;
    this.name = 'ntfy';
  }

  #actions(message) {
    if (!this.publicUrl || !message.occurrenceId) return undefined;
    const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
    const id = encodeURIComponent(message.occurrenceId);
    return [
      { action: 'http', label: 'やった', url: `${this.publicUrl}/api/occurrences/${id}/done`, method: 'POST', headers, clear: true },
      { action: 'http', label: '30分後', url: `${this.publicUrl}/api/occurrences/${id}/snooze?minutes=30`, method: 'POST', headers, clear: true },
    ];
  }

  async send(message) {
    if (!this.topic || this.topic.startsWith('CHANGE-ME')) {
      log.warn('topic が未設定なので送りません');
      return false;
    }
    const body = {
      topic: this.topic,
      message: message.text,
      title: message.title ?? '',
      priority: message.silent ? 2 : Math.min(5, Math.max(1, message.priority ?? 3)),
      tags: message.tags ?? [],
      actions: this.#actions(message),
    };
    try {
      // ヘッダではなく JSON で送る。日本語をヘッダに載せると文字化けするため。
      const response = await fetch(this.server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
