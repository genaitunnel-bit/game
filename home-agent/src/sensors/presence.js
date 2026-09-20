import { execFile } from 'node:child_process';
import { logger } from '../util/log.js';

const log = logger('presence');

function ping(host, timeoutSec = 1) {
  return new Promise((resolve) => {
    execFile('ping', ['-c', '1', '-W', String(timeoutSec), host], { timeout: (timeoutSec + 1) * 1000 }, (err) => {
      resolve(!err);
    });
  });
}

/**
 * 在室判定。スマホは省電力で ping に answer しないことがあるので、
 * 「最後に返事をした時刻」から grace 分は家にいると見なす。
 * 判定を急ぎすぎると、いる人に向かって「留守ですね」と言う羽目になる。
 */
export class PresenceSensor {
  constructor({ config, store }) {
    this.config = config;
    this.residents = config.home.residents ?? [];
    this.graceMinutes = config.sensors?.presence?.graceMinutes ?? 15;
    this.method = config.sensors?.presence?.method ?? 'ping';
    store.data.presence ??= {};
    this.state = store.data.presence; // { [id]: { home, lastSeen, source } }
  }

  /** webhook や CLI からの手動申告。ping より強い。 */
  report(residentId, home, ttlMinutes = 120) {
    this.state[residentId] = {
      home: Boolean(home),
      lastSeen: home ? new Date().toISOString() : this.state[residentId]?.lastSeen ?? null,
      source: 'manual',
      manualUntil: Date.now() + ttlMinutes * 60000,
    };
  }

  async read(now = new Date()) {
    const presence = {};
    for (const resident of this.residents) {
      const prev = this.state[resident.id] ?? {};
      if (prev.source === 'manual' && prev.manualUntil > now.getTime()) {
        presence[resident.id] = prev.home;
        continue;
      }
      if (this.method !== 'ping' || !(resident.devices ?? []).length) {
        presence[resident.id] = prev.home ?? null;
        continue;
      }
      const results = await Promise.all(resident.devices.map((d) => ping(d)));
      const seen = results.some(Boolean);
      if (seen) {
        this.state[resident.id] = { home: true, lastSeen: now.toISOString(), source: 'ping' };
      } else {
        const last = prev.lastSeen ? new Date(prev.lastSeen) : null;
        const withinGrace = last && (now - last) / 60000 < this.graceMinutes;
        this.state[resident.id] = { home: Boolean(withinGrace), lastSeen: prev.lastSeen ?? null, source: 'ping' };
      }
      presence[resident.id] = this.state[resident.id].home;
    }
    const known = Object.values(presence).filter((v) => v !== null);
    const anyoneHome = known.length ? known.some(Boolean) : null; // 分からないときは null
    log.debug('在室', { presence, anyoneHome });
    return { presence, anyoneHome };
  }
}
