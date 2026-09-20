import { loadConfig } from './config.js';
import { HomeAgent } from './core/agent.js';
import { startServer } from './server/http.js';
import { logger } from './util/log.js';

const log = logger('main');

async function main() {
  const config = loadConfig(process.argv[2] ?? undefined);
  const agent = new HomeAgent(config);
  log.info(`${config.persona.name} を起動しました（タスク ${config.tasks.length} 件 / ${config.tickSeconds} 秒ごとに家を見ます）`);

  if (config.server?.enabled) startServer({ agent, config });

  let running = false;
  const tick = async () => {
    if (running) return; // 前の tick が長引いているときは重ねない
    running = true;
    try {
      const { events } = await agent.tick();
      if (events.length) log.info(`できごと: ${events.map((e) => `${e.type}(${e.occurrence?.taskId ?? '-'})`).join(', ')}`);
    } catch (err) {
      log.error('tick に失敗しました', err.stack ?? err.message);
    } finally {
      running = false;
    }
  };

  await tick();
  const timer = setInterval(tick, Math.max(10, config.tickSeconds) * 1000);

  const stop = (signal) => {
    log.info(`${signal} を受け取りました。状態を保存して終了します`);
    clearInterval(timer);
    agent.store.save();
    process.exit(0);
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
}

main().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
