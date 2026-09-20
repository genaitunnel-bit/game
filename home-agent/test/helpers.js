import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { Store } from '../src/core/store.js';
import { merge, DEFAULTS } from '../src/config.js';

export function tmpStore() {
  return new Store(path.join(os.tmpdir(), `home-agent-test-${crypto.randomUUID()}.json`), {});
}

export function testConfig(overrides = {}) {
  return merge(
    merge(DEFAULTS, {
      home: { timezone: 'Asia/Tokyo', quietHours: { from: '23:00', to: '07:00' }, residents: [{ id: 'yuki', name: 'ゆき' }] },
      persona: { name: 'アオ', firstPerson: 'わたし' },
      llm: { enabled: false },
    }),
    overrides
  );
}

/** JST の壁時計で Date を作る。 */
export function jst(dateStr, clock) {
  return new Date(`${dateStr}T${clock}:00+09:00`);
}
