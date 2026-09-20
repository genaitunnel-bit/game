import { logger } from '../util/log.js';

const log = logger('llm');

/**
 * 台詞の生成だけを Claude に任せる薄い層。
 * ここが落ちても家の運用は止まってはいけないので、失敗したら必ず null を返し、
 * 呼び出し側（voice.js）が定型文に落ちる。
 */
export class AnthropicVoice {
  constructor(llmConfig) {
    this.config = llmConfig;
    this.model = llmConfig.model ?? 'claude-opus-5';
    this.available = null; // 未判定
    this.client = null;
  }

  get apiKey() {
    return process.env[this.config.apiKeyEnv ?? 'ANTHROPIC_API_KEY'] ?? null;
  }

  async #ensureClient() {
    if (this.client) return this.client;
    if (this.available === false) return null;
    if (!this.apiKey) {
      this.available = false;
      log.info('API キーがないので定型文で話します');
      return null;
    }
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      this.client = new Anthropic({
        apiKey: this.apiKey,
        timeout: 15_000, // 家の声かけが 15 秒遅れたらもう手遅れ
        maxRetries: 1,
      });
      this.available = true;
      return this.client;
    } catch (err) {
      this.available = false;
      log.warn('@anthropic-ai/sdk を読み込めませんでした。定型文で話します', err.message);
      return null;
    }
  }

  /** @returns {Promise<string|null>} 一行の台詞。失敗時は null。 */
  async speak({ system, prompt, maxTokens }) {
    const client = await this.#ensureClient();
    if (!client) return null;
    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: maxTokens ?? 2000,
        output_config: { effort: 'low' }, // 一言を返すだけなので深く考えなくていい
        system,
        messages: [{ role: 'user', content: prompt }],
      });
      if (response.stop_reason === 'refusal') return null;
      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
      return text || null;
    } catch (err) {
      log.warn('生成に失敗しました。定型文に切り替えます', err.message);
      return null;
    }
  }
}
