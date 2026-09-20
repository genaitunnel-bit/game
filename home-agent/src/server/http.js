import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAlexa } from './alexa.js';
import { logger } from '../util/log.js';

const log = logger('server');
const here = path.dirname(fileURLToPath(import.meta.url));
const MAX_BODY = 64 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, payload) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': typeof payload === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

export function startServer({ agent, config }) {
  const token = process.env[config.server?.tokenEnv ?? 'HOME_AGENT_TOKEN'] ?? null;
  const skillId = config.channels?.alexa?.skillId ?? null;

  const authorized = (req, url) => {
    if (!token) return true; // 家庭内 LAN 限定運用を想定。公開するなら必ずトークンを設定する
    const header = req.headers.authorization ?? '';
    return header === `Bearer ${token}` || url.searchParams.get('token') === token;
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    try {
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        return send(res, 200, fs.readFileSync(path.join(here, '../../web/index.html'), 'utf8'));
      }
      if (req.method === 'POST' && url.pathname === '/alexa') {
        const body = await readBody(req);
        const { status, payload } = await handleAlexa(body, { agent, skillId });
        return send(res, status, payload);
      }
      if (!authorized(req, url)) return send(res, 401, { error: 'unauthorized' });

      if (req.method === 'GET' && url.pathname === '/api/state') {
        return send(res, 200, agent.status());
      }
      if (req.method === 'POST' && url.pathname === '/api/say') {
        const body = await readBody(req);
        const result = await agent.converse(body.text ?? '', { by: body.by ?? 'home' });
        return send(res, 200, result);
      }
      if (req.method === 'POST' && url.pathname === '/api/sensor') {
        const body = await readBody(req);
        if (body.presence) {
          for (const [id, home] of Object.entries(body.presence)) agent.sensors.presence.report(id, home);
        }
        if (body.path) agent.sensors.report(body.path, body.value, body.ttlMinutes ?? null);
        agent.store.save();
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && url.pathname === '/api/tick') {
        const result = await agent.tick();
        return send(res, 200, { events: result.events.map((e) => e.type), spoken: result.spoken });
      }

      const action = /^\/api\/occurrences\/(.+)\/(done|skip|snooze)$/.exec(decodeURIComponent(url.pathname));
      if (req.method === 'POST' && action) {
        const [, id, verb] = action;
        const minutes = Number(url.searchParams.get('minutes') ?? 30);
        const event =
          verb === 'done'
            ? agent.tasks.complete(id, 'app')
            : verb === 'skip'
              ? agent.tasks.skip(id, 'app')
              : agent.tasks.snooze(id, minutes);
        if (!event) return send(res, 404, { error: 'not found' });
        agent.ego.react(event);
        agent.store.save();
        return send(res, 200, { ok: true, status: event.occurrence.status });
      }

      return send(res, 404, { error: 'not found' });
    } catch (err) {
      log.warn(`${req.method} ${url.pathname} で失敗`, err.message);
      return send(res, 400, { error: err.message });
    }
  });

  server.listen(config.server.port, config.server.host, () => {
    log.info(`http://${config.server.host}:${config.server.port} で待ち受け中`);
    if (!token) log.warn('HOME_AGENT_TOKEN が未設定です。LAN の外に出すなら必ず設定してください');
  });
  return server;
}
