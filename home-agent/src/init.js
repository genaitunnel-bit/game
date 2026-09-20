import fs from 'node:fs';
import crypto from 'node:crypto';

const target = process.env.HOME_AGENT_CONFIG ?? 'config/config.json';
if (fs.existsSync(target)) {
  console.log(`${target} はすでにあります。上書きしません。`);
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync('config/config.example.json', 'utf8'));
const topic = `home-agent-${crypto.randomBytes(6).toString('hex')}`;
config.channels.ntfy.topic = topic;

fs.writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);

console.log(`${target} を作成しました。

次にやること:
  1. config/config.json の home.residents と tasks を自分の家に合わせて書き換える
  2. Android に ntfy アプリを入れて、トピック "${topic}" を購読する
     （購読したら channels.ntfy.enabled を true に）
  3. 外に公開するなら、トークンを作って渡す:
       export HOME_AGENT_TOKEN=${crypto.randomBytes(16).toString('hex')}
  4. 声を Claude に任せるなら:
       export ANTHROPIC_API_KEY=sk-ant-...
       npm install        # @anthropic-ai/sdk を入れる（無くても定型文で動きます）
  5. npm start
`);
