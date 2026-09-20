/**
 * 住人の言葉を意図に落とす。LLM がなくても最低限は通じてほしいので、
 * ここは正規表現で持つ。LLM は「それ以外」の雑談だけ担当する。
 */
const PATTERNS = [
  ['yes', /^(うん|はい|いいよ|そうして|おねがい|お願い|やって|ok|ｏｋ|yes)[。!！\s]*$/i],
  ['no', /^(いや|いいえ|やめ|しない|だめ|むり|無理|no)[。!！\s]*$/i],
  // 「〜してきた」「〜しといた」まで拾う。日常の報告はたいていこの形になる。
  ['done', /(やった|やっとい|やってき|やりました|終わ|おわ|終え|済ん|済ま|完了|捨てた|捨ててき|出してき|出しとい|出しました|干した|干してき|片付けた|かたづけた|掃除した|done)/],
  ['greet', /^(ただいま|おかえり|おはよ|おやすみ|こんにちは|こんばんは|いってきます|いってくる|ありがと)/],
  ['skip', /(やらない|やめとく|飛ばし|パス|今日はいい|skip)/],
  ['snooze', /(あとで|後で|まだ|もうちょい|もう少し|待って|snooze)/],
  ['status', /(残っ|残り|今日|予定|タスク|状況|なにする|何する|やること|いつ|status)/],
  ['self', /(誰|だれ|あなた|きみ|君|調子|気分|元気|どんな気持ち|なに考え|何考え)/],
];

const KEYWORDS = [
  [/ゴミ|ごみ|燃え|プラ/, 'trash'],
  [/洗濯|せんたく|干/, 'laundry'],
  [/片付|かたづけ|掃除|そうじ/, 'tidy'],
  [/風呂|ふろ|浴/, 'bath'],
];

export function parseIntent(text) {
  const raw = String(text ?? '').trim();
  const minutes = Number(/(\d{1,3})\s*分/.exec(raw)?.[1] ?? 0) || null;
  let intent = 'chat';
  for (const [name, pattern] of PATTERNS) {
    if (pattern.test(raw)) {
      intent = name;
      break;
    }
  }
  let target = null;
  for (const [pattern, key] of KEYWORDS) {
    if (pattern.test(raw)) {
      target = key;
      break;
    }
  }
  return { intent, target, minutes, text: raw };
}

// 「洗濯物を干す」と「洗濯」を取り違えないよう、助詞と語尾を落としてから比べる。
const normalize = (text) => String(text).replace(/[をにはがのへとや、。・\s]/g, '').replace(/(する|す|る)$/, '');

const KEY_TEST = {
  trash: (t) => /trash|ゴミ|ごみ/.test(`${t.id}${t.title}`),
  laundry: (t) => /laundry|洗濯|干/.test(`${t.id}${t.title}`),
  tidy: (t) => /tidy|片付|掃除/.test(`${t.id}${t.title}`),
  bath: (t) => /bath|風呂/.test(`${t.id}${t.title}`),
};

/**
 * 言われた語に近いタスクを、確からしい順に返す。
 * 長く一致したものほど上。キーワードだけの一致は弱い候補として最後に残す。
 */
export function matchTasks(tasks, text, targetKey = null) {
  const normText = normalize(text ?? '');
  const scored = [];
  for (const task of tasks) {
    const normTitle = normalize(task.title ?? '');
    let score = 0;
    for (let length = normTitle.length; length >= 2; length -= 1) {
      if (normText.includes(normTitle.slice(0, length))) {
        score = length;
        break;
      }
    }
    if (!score && targetKey && KEY_TEST[targetKey]?.(task)) score = 1.5;
    if (score) scored.push({ task, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.task);
}

export function matchTask(tasks, text, targetKey = null) {
  return matchTasks(tasks, text, targetKey)[0] ?? null;
}
