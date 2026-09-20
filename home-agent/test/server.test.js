import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server/http.js';
import { testConfig } from './helpers.js';

async function withServer(run) {
  const config = testConfig({ server: { enabled: true, host: '127.0.0.1', port: 0, tokenEnv: 'NOPE_TOKEN' } });
  const agent = { status: () => ({ ok: true }), tasks: { summary: () => ({}) } };
  const server = startServer({ agent, config });
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    server.close();
  }
}

test('画面とアバターのファイルを配る', async () => {
  await withServer(async (base) => {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(await page.text(), /<div class="avatar"|id="avatar"/);

    const avatar = await fetch(`${base}/avatar.js`);
    assert.equal(avatar.status, 200);
    assert.match(avatar.headers.get('content-type'), /javascript/);
    assert.match(await avatar.text(), /createAvatar/);
  });
});

test('web/ の外のファイルは返さない', async () => {
  await withServer(async (base) => {
    for (const attempt of ['/../package.json', '/..%2fpackage.json', '/../../etc/passwd', '/../config/config.json']) {
      const res = await fetch(`${base}${attempt}`, { redirect: 'manual' });
      assert.ok(res.status === 404 || res.status === 400, `${attempt} は配られてはいけない (${res.status})`);
    }
  });
});
