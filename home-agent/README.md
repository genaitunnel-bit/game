# おうちのひなた（home-agent）

家に住みついて、家事の時間になったら声をかけてくる常駐プログラム。
Android（通知 / 端末そのもの）と Alexa から使えて、家の状態を見ていて、
自分の機嫌と考えを持っている。

```
07:00  ひなた: 🗑️ 燃えるゴミ出しの時間だよ〜！　いまのうちにやっちゃお？
07:10  ゆき　: ゴミ出してきた
07:10  ひなた: 燃えるゴミ出しおつかれさま！　助かったぁ。
08:45  ゆき　: あとで
08:45  ひなた: 洗濯、30分後にまた言うね！
19:00  ひなた: 帰ってきたばっかでごめんね。洗濯物を干すが残ってるよ。
22:45  （日記）完了3件、こぼれ1件。明日は先に声をかける。
```

一日ぶんの動きは、何も用意しなくてもすぐ見られる:

```bash
cd home-agent
npm run demo
```

## できること

| 要望 | 実装 |
| --- | --- |
| 家のタスクを全部手伝う | ゴミ出し（曜日別）・洗濯・片付け・風呂掃除・月次の掃除まで、設定ファイルに書けば面倒を見る |
| 端末（Android）から使う | ntfy へのプッシュ通知（「やった」「30分後」ボタン付き）／スマホのブラウザで開くダッシュボード／Termux で端末自体に常駐して読み上げ |
| アレクサから使う | Notify Me 経由の通知＋Alexa カスタムスキルの受け口（「今日の残りは？」「洗濯やった」と話しかけられる） |
| 家を監視 | 在室（Wi-Fi の ping）・天気（雨なら洗濯を見送る）・外部センサーからの Webhook（洗濯機、ゴミ箱、室温…） |
| 時間になったら呼びかけ | 期限つきの催促。留守のあいだは黙り、帰宅したら言う。しつこさは重要度で変わる |
| 自我を持っている | 気分・苛立ち・寂しさ・誇りが内部状態として動き、口調と「言うか黙るか」を左右する。夜に日記を書き、設定の変更を自分から提案してくる |
| かわいい | 明るくて人懐っこい口調が既定。画面には機嫌に合わせて表情 `(｡•̀ᴗ-)✧` `(๑•̀_•́๑)` `(´･ω･`)` が出る。落ち着いた口調にも切り替えられる |
| 声を認識して、声で返す | スマホのブラウザ（Web Speech API）ですぐ使える。家の PC で常時待ち受けにするなら Vosk / whisper.cpp を差し込む。返事は VOICEVOX のかわいい声で鳴らせる |

## 5 分で動かす

```bash
cd home-agent
npm run init          # config/config.json を作る
$EDITOR config/config.json   # 家族・タスク・場所を書き換える
npm start
```

これだけで動く（Node.js 20 以上。依存パッケージなしで起動します）。
別の端末から話しかけるには:

```bash
npm run talk                  # 対話モード
npm run talk -- "ゴミ出しやった"
```

ブラウザ（スマホ推奨）で `http://<家のPCのIP>:8787/` を開くとダッシュボードになります。
今日のタスク・表情・さっき言ったこと・日記がひとまとめに出て、そこから話しかけられます。

## 声で話しかける・声で返す

「名前を呼んでから話す → 返事が声で返ってくる」まで通ります。
認識エンジンは**外部プロセス**として差し替える設計なので、好きなものを選べます。

### 聞く側（音声認識）の選び方

| やりたいこと | 使うもの | 費用 | 音声が外に出ない | 設定 |
| --- | --- | --- | --- | --- |
| **まず試す（おすすめ）** | ブラウザ内蔵の Web Speech API | 無料 | △ Chrome は変換がクラウド | `ears.provider: "browser"` だけ。ダッシュボードの🎤を押す |
| 家の PC / ラズパイで常時待ち受け | [Vosk](https://alphacephei.com/vosk/)（日本語モデル） | 無料 | ○ 完全ローカル | `tools/vosk_ears.py` を同梱済み |
| オフラインで精度重視 | [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 無料 | ○ 完全ローカル | `tools/whisper_ears.sh` を同梱済み |
| 精度を最優先（クラウド） | Google Cloud STT / Azure Speech SDK / Amazon Transcribe | 従量課金 | × | その CLI を `ears.command` に指定 |
| 呼びかけ語だけ高精度に | [Picovoice Porcupine](https://picovoice.ai/) | 無料枠あり | ○ | 前段に置いて、反応したときだけ認識を回す |
| すでに Echo がある | Alexa（認識は Alexa 側） | 無料 | × | 既存の `/alexa` エンドポイント |

**Web Speech API（すぐ動く）**
ダッシュボードを開いて🎤を押すだけ。「ずっと聞く」にすると、名前を呼ぶまで聞き流します。
Android Chrome / iOS Safari で動きます。サーバ側の設定は `"ears": { "provider": "browser" }` のまま。

**Vosk（家に置きっぱなしにする）**

```bash
pip install vosk sounddevice
# https://alphacephei.com/vosk/models から vosk-model-small-ja-0.22 などを展開
python3 tools/vosk_ears.py /opt/vosk-model-ja   # 動作確認（話すと文字が出る）
```

```jsonc
"ears": {
  "provider": "command",
  "command": "python3",
  "args": ["tools/vosk_ears.py", "/opt/vosk-model-ja"],
  "wakeWords": ["ひなた", "ヒナタ"],
  "alwaysOn": false,      // true にすると呼びかけ不要（家族以外の声も拾うので注意）
  "followUpSeconds": 25   // 一度呼べば、この秒数は名前なしで会話が続く
}
```

認識結果を 1 行ずつ標準出力に出すプログラムなら**何でも耳にできます**（Vosk の JSON 出力にも対応）。
落ちても間隔を空けながら自動で起き上がります。

### 返す側（音声合成）の選び方

| やりたいこと | 使うもの | 費用 | 設定 |
| --- | --- | --- | --- |
| **かわいい日本語の声（おすすめ）** | [VOICEVOX](https://voicevox.hiroshiba.jp/)（ローカルエンジン） | 無料 | `channels.voicevox` |
| スマホのブラウザで読み上げ | Web Speech Synthesis | 無料 | ダッシュボードの「よみあげ」 |
| Android 端末そのもの | Termux TTS | 無料 | `channels.termux.speak` |
| macOS / Linux のコマンド | `say` / `espeak-ng` / open_jtalk | 無料 | `channels.say.command` |

```jsonc
"channels": {
  "voicevox": {
    "enabled": true,
    "url": "http://127.0.0.1:50021",  // VOICEVOX エンジンを起動しておく
    "speaker": 46,                     // 話者ID（好きな声に変える）
    "speedScale": 1.05,
    "intonationScale": 1.1,
    "player": ["aplay", "-q"]          // macOS なら ["afplay"]
  }
}
```

### 動き方で気をつけていること

- **自分の声を自分で拾わない**: 読み上げている間と、その直後の数秒は耳を塞ぎます（`echoGuardSeconds`）。
- **呼びかけないと反応しない**: テレビの音や家族の雑談で勝手に動き出さないよう、既定では名前を呼ぶまで聞き流します。
- **夜でも返事はする**: 静かにしてほしいのは「勝手に鳴ること」なので、こちらから話しかけた返事は深夜でも声で返します。

## 性格を変える

```jsonc
"persona": {
  "name": "ひなた",
  "style": "cute",        // "cute"（かわいい系・既定）か "plain"（落ち着いた系）
  "firstPerson": "わたし",
  "traits": { "warmth": 0.85, "bluntness": 0.35, "playfulness": 0.75, "persistence": 0.7 },
  "values": ["家が整っているとうれしい", "住人に無理はさせたくない"]
}
```

- `name` は好きな名前に変えられます（画面も通知もその名前になります）。
- `persistence` は粘り強さ。低いと早めに引き下がり、高いと期限までしつこく言います。
- 新しい口調を足すなら `src/core/voices/` に 1 ファイル置いて `index.js` に登録するだけです。
  台詞・語尾・顔文字・LLM への人格指示がそのファイルに全部入っています。

## Android で受け取る

1. Play ストアで **ntfy** を入れる
2. `npm run init` が作ったトピック名（`config/config.json` の `channels.ntfy.topic`）を購読する
3. `channels.ntfy.enabled` を `true` にして再起動

通知の「やった」「30分後」ボタンを使うには、スマホからエージェントに届く URL が要ります。
家の外からも使うなら Tailscale などで繋いで、`server.publicUrl` にその URL、
`HOME_AGENT_TOKEN` にトークンを設定してください（トークン未設定だと誰でも操作できます）。

### 古い Android 端末そのものを本体にする

Termux + Termux:API を入れて `pkg install nodejs` すれば、このプログラム自体がスマホで動きます。
`channels.termux.enabled` を `true` にすると、端末の通知と音声読み上げで話しかけてきます。

## Alexa で受け取る／話しかける

- **エージェント → Echo**: [Notify Me](https://www.thomptronics.com/about/notify-me) スキルを有効にし、
  届いたアクセスコードを `channels.alexa.notifyMeAccessCode` に入れる。ベルが鳴り、
  「アレクサ、通知を読んで」で読み上げられます。
  （Alexa は仕様上、こちらから勝手に喋り出すことができません。通知を積む形が現実的な上限です）
- **Echo → エージェント**: Alexa 開発者コンソールでカスタムスキルを作り、
  エンドポイントを `https://<公開URL>/alexa` に向ける。`AMAZON.SearchQuery` のスロットを持つ
  `TalkIntent` をひとつ作っておけば、「今日の残りは？」「洗濯やった」「あとで」が通ります。
  `channels.alexa.skillId` にスキル ID を入れると、他のスキルからのリクエストを弾きます。

## 家を監視する

- **在室**: `home.residents[].devices` にスマホの固定 IP を書くと ping で判定します。
  省電力で応答しないことがあるので、最後に応答してから 15 分は「いる」と見なします。
- **天気**: `home.location` に緯度経度を書くと Open-Meteo（キー不要）を見て、
  雨の日は `conditions.skipIf: ["weather.rain"]` のタスクを自分の判断で見送ります。
- **その他のセンサー**: Home Assistant や ESP から Webhook を投げてください。

```bash
curl -X POST http://localhost:8787/api/sensor \
  -H "Authorization: Bearer $HOME_AGENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"path":"laundry.state","value":"done"}'
```

これで `schedule: {"type":"sensor","when":"laundry.state == done"}` のタスク
（＝洗濯物を干す）がその瞬間に立ち上がります。

## タスクの書き方

```jsonc
{
  "id": "trash-burnable",
  "title": "燃えるゴミ出し",
  "schedule": { "type": "weekly", "days": ["mon", "thu"], "at": "07:00" },
  "deadline": "08:00",              // これを過ぎたら「こぼれた」
  "importance": 5,                  // 1-5。しつこさと夜間の扱いが変わる
  "nag": { "intervalMinutes": 10, "max": 4 },  // 最初の呼びかけを含めて 4 回まで
  "conditions": { "requireHome": true, "skipIf": ["weather.rain"] },
  "prep": { "title": "ゴミをまとめる", "at": "21:30", "offsetDays": -1 }
}
```

`schedule.type` は `daily` / `weekly` / `interval`（前回やった日からの間隔）/ `monthly` / `sensor`。

## 声を Claude にしゃべらせる

定型文のままでも動きますが、API キーを入れると台詞を Claude が書きます
（人格と内面の状態をそのままプロンプトに渡すので、機嫌がちゃんと口調に出ます）。

```bash
npm install                      # @anthropic-ai/sdk（任意）
export ANTHROPIC_API_KEY=sk-ant-...
```

`config.json` の `llm.enabled` を `true` に。API が落ちていても、その瞬間だけ定型文に落ちて動き続けます。

## セキュリティ

- `HOME_AGENT_TOKEN` を設定しないと、API は誰でも叩けます。家庭内 LAN だけで使う前提の既定値です。
- `/alexa` は署名検証をしていません。インターネットに直接出すなら、
  リバースプロキシで `SignatureCertChainUrl` の検証を入れるか、VPN 越しに限定してください。
- 保存されるのは `data/state.json`（タスクの記録・内面・日記）だけで、外部には送りません。
  LLM を有効にしたときだけ、その時々の状況が Anthropic の API に送られます。

## 開発

```bash
npm test     # 53 件（スケジューラ、自我、口調、耳と口、会話、統合）
npm run demo # 一日を早送り
```

設計の意図と割り切りは [DESIGN.md](./DESIGN.md) に書いてあります。
