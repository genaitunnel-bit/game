import { localParts } from '../util/time.js';
import { PresenceSensor } from './presence.js';
import { WeatherSensor } from './weather.js';

/**
 * 「家を監視する」の実体。
 * 増やすときはここに read() を持つものを足すだけでいい。
 * 外部センサー（Home Assistant、ESP、スマートプラグ）は HTTP の /api/sensor から
 * report() で入れてもらう想定で、ポーリングはしない。
 */
export class SensorHub {
  constructor({ config, store }) {
    this.config = config;
    this.store = store;
    store.data.reported ??= {}; // 外から報告された状態（洗濯機、ゴミ箱、室温…）
    this.presence = new PresenceSensor({ config, store });
    this.weather = new WeatherSensor({ config });
  }

  /** 外部センサーからの報告。"laundry.state" のようなパスで受ける。 */
  report(path, value, ttlMinutes = null) {
    this.store.data.reported[path] = {
      value,
      at: new Date().toISOString(),
      expiresAt: ttlMinutes ? Date.now() + ttlMinutes * 60000 : null,
    };
  }

  #reported() {
    const out = {};
    for (const [path, entry] of Object.entries(this.store.data.reported)) {
      if (entry.expiresAt && entry.expiresAt < Date.now()) continue;
      const keys = path.split('.');
      let node = out;
      for (const key of keys.slice(0, -1)) node = node[key] ??= {};
      node[keys.at(-1)] = entry.value;
    }
    return out;
  }

  /** いまの家のスナップショット。判断はすべてこの 1 枚の上で行う。 */
  async snapshot(now = new Date()) {
    const lp = localParts(now, this.config.home.timezone);
    const [presence, weather] = await Promise.all([
      this.config.sensors?.presence?.enabled ? this.presence.read(now) : { presence: {}, anyoneHome: null },
      this.config.sensors?.weather?.enabled ? this.weather.read(now) : { weather: { known: false } },
    ]);
    return {
      time: { date: lp.date, minutes: lp.minutes, dow: lp.dow, clock: `${String(lp.hour).padStart(2, '0')}:${String(lp.minute).padStart(2, '0')}` },
      ...presence,
      ...weather,
      ...this.#reported(),
    };
  }
}
