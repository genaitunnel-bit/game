import { logger } from '../util/log.js';

const log = logger('weather');
const CACHE_MINUTES = 20;

/**
 * 洗濯の判断にだけ使う天気。Open-Meteo は API キーが要らないので家に置きやすい。
 * 取れなければ「分からない」を返す。分からないときに雨だと決めつけない。
 */
export class WeatherSensor {
  constructor({ config }) {
    this.location = config.home.location;
    this.timezone = config.home.timezone;
    this.cache = null;
  }

  async read(now = new Date()) {
    if (!this.location) return { weather: { known: false } };
    if (this.cache && now - this.cache.at < CACHE_MINUTES * 60000) return this.cache.value;

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${this.location.lat}&longitude=${this.location.lon}` +
      `&current=temperature_2m,precipitation&daily=precipitation_probability_max,temperature_2m_max` +
      `&timezone=${encodeURIComponent(this.timezone)}&forecast_days=1`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const chance = data.daily?.precipitation_probability_max?.[0] ?? null;
      const value = {
        weather: {
          known: true,
          tempC: data.current?.temperature_2m ?? null,
          precipitation: data.current?.precipitation ?? 0,
          rainChance: chance,
          // 「降っている」か「かなり降りそう」なら外干しはあきらめる
          rain: (data.current?.precipitation ?? 0) > 0 || (chance ?? 0) >= 60,
        },
      };
      this.cache = { at: now, value };
      return value;
    } catch (err) {
      log.warn('天気を取得できませんでした', err.message);
      return { weather: { known: false } };
    }
  }
}
