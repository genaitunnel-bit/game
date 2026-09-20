import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { VoicevoxChannel } from '../src/channels/voicevox.js';

/** VOICEVOX エンジンのふりをする最小のサーバ。 */
async function fakeEngine(onRequest = () => {}) {
  const server = http.createServer((req, res) => {
    onRequest(req);
    if (req.url.startsWith('/audio_query')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ accent_phrases: [], speedScale: 1, pitchScale: 0 }));
      return;
    }
    if (req.url.startsWith('/synthesis')) {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'audio/wav' });
        res.end(Buffer.from(`WAV:${JSON.parse(body).speedScale}`));
      });
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

/** 再生コマンドのふりをして、渡された wav をそのまま横に置くスクリプト。 */
function fakePlayer() {
  const marker = path.join(os.tmpdir(), `player-${crypto.randomUUID()}.txt`);
  const script = path.join(os.tmpdir(), `player-${crypto.randomUUID()}.mjs`);
  fs.writeFileSync(script, `import fs from 'node:fs';fs.copyFileSync(process.argv[2], ${JSON.stringify(marker)});`);
  return { marker, command: [process.execPath, script] };
}

test('VOICEVOX に合成させて、鳴らすところまで通る', async () => {
  const seen = [];
  const { server, url } = await fakeEngine((req) => seen.push(req.url));
  const player = fakePlayer();
  const channel = new VoicevoxChannel({ url, speaker: 46, speedScale: 1.2, player: player.command });

  const ok = await channel.send({ text: 'ゴミ出しの時間だよ' });
  assert.equal(ok, true);
  assert.ok(seen[0].includes('/audio_query'), 'まず読み方を問い合わせる');
  assert.ok(seen[0].includes('speaker=46'), '話者の指定が届いている');
  assert.ok(seen[1].includes('/synthesis'));
  assert.equal(fs.readFileSync(player.marker, 'utf8'), 'WAV:1.2', '声の速さの指定が合成に反映されている');

  fs.rmSync(player.marker, { force: true });
  server.close();
});

test('エンジンが起動していなくても、例外を投げずに黙って諦める', async () => {
  const channel = new VoicevoxChannel({ url: 'http://127.0.0.1:1', player: ['true'] });
  assert.equal(await channel.send({ text: 'こんばんは' }), false);
});

test('静かな時間は声を出さない', async () => {
  const { server, url } = await fakeEngine();
  const player = fakePlayer();
  const channel = new VoicevoxChannel({ url, player: player.command });
  assert.equal(await channel.send({ text: 'ゴミ出し', silent: true }), false);
  assert.equal(fs.existsSync(player.marker), false);
  server.close();
});
