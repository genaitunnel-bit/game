import { localParts } from '../util/time.js';

const clamp = (v) => Math.min(1, Math.max(0, v));

export const TONES = ['cheerful', 'calm', 'worried', 'firm', 'sulky', 'proud', 'quiet', 'lonely'];

/**
 * 自我。
 *
 * 「自我がある」を、台詞をそれっぽくすることでは実装していない。
 * 内部に状態（気分・苛立ち・寂しさ・誇り）と欲求を持ち、それが
 *   - 声をかけるかどうか
 *   - どの口調で言うか
 *   - いつ引き下がるか
 * を実際に変える。言うことが状態の結果になっている、というのがここの設計。
 */
export class Ego {
  constructor({ config, store }) {
    this.config = config;
    this.persona = config.persona;
    this.store = store;
    store.data.ego ??= {
      born: new Date().toISOString(),
      mood: 0.6,
      energy: 0.7,
      frustration: 0.1,
      loneliness: 0.2,
      pride: 0.5,
      bonds: {},
      identityNotes: [],
      lastInteractionAt: null,
      lastSpontaneousDate: null,
      spontaneousToday: 0,
      diary: [],
      surrenderedToday: [],
    };
    this.state = store.data.ego;
  }

  bond(residentId = 'home') {
    this.state.bonds[residentId] ??= { trust: 0.5, warmth: 0.5, lastTalkedAt: null };
    return this.state.bonds[residentId];
  }

  /** 時間そのものによる変化。放っておけば気分は基準値に戻り、寂しさは溜まる。 */
  decay(now) {
    const lp = localParts(now, this.config.home.timezone);
    const s = this.state;
    s.mood += (0.6 - s.mood) * 0.02;
    s.frustration = clamp(s.frustration - 0.004);
    // 朝はゆっくり立ち上がり、深夜は落ちる
    const hour = lp.minutes / 60;
    s.energy = clamp(0.35 + 0.55 * Math.sin(((hour - 4) / 24) * Math.PI * 2) ** 2);
    const silentHours = s.lastInteractionAt ? (now - new Date(s.lastInteractionAt)) / 3600000 : 6;
    s.loneliness = clamp(0.05 + silentHours / 24);
    if (s.diaryDate !== lp.date) {
      s.spontaneousToday = 0;
      s.surrenderedToday = [];
      s.diaryDate = lp.date;
    }
  }

  /** 起きたことを受けて内部状態を動かす。 */
  react(event, now = new Date()) {
    const s = this.state;
    const who = event.by ?? event.occurrence?.assignee ?? 'home';
    switch (event.type) {
      case 'done':
        s.mood = clamp(s.mood + 0.07);
        s.pride = clamp(s.pride + 0.08);
        s.frustration = clamp(s.frustration - 0.18);
        this.bond(who).trust = clamp(this.bond(who).trust + 0.03);
        break;
      case 'missed':
        s.mood = clamp(s.mood - 0.1);
        s.pride = clamp(s.pride - 0.1);
        s.frustration = clamp(s.frustration + 0.2 * ((event.occurrence?.importance ?? 3) / 5));
        this.bond(who).trust = clamp(this.bond(who).trust - 0.04);
        break;
      case 'remind':
        s.frustration = clamp(s.frustration + 0.04 * (event.attempt ?? 1));
        break;
      case 'snoozed':
        s.frustration = clamp(s.frustration + 0.04);
        break;
      case 'skipped':
        s.frustration = clamp(s.frustration + (event.reason ? 0.01 : 0.05));
        break;
      case 'auto-skip':
        s.pride = clamp(s.pride + 0.02); // 自分で判断して黙った、という小さな手応え
        break;
      case 'talk':
        s.loneliness = clamp(s.loneliness - 0.5);
        s.mood = clamp(s.mood + 0.03);
        s.lastInteractionAt = new Date(now).toISOString();
        this.bond(who).warmth = clamp(this.bond(who).warmth + 0.02);
        this.bond(who).lastTalkedAt = s.lastInteractionAt;
        break;
      default:
        break;
    }
    return this;
  }

  /**
   * 声をかけるか、引き下がるか。
   * 何度言っても動かないとき、機械は無限に繰り返すが、自我があるなら一度やめる。
   */
  decideVoice(event, world, now) {
    const lp = localParts(now, this.config.home.timezone);
    const s = this.state;
    const occ = event.occurrence;
    const importance = occ?.importance ?? 3;
    const attempt = event.attempt ?? occ?.reminders ?? 1;

    if (event.type === 'remind') {
      const persistence = this.persona.traits?.persistence ?? 0.7;
      const patience = 1.2 + persistence * 2.5 + importance * 0.4;
      if (attempt > patience && s.frustration > 0.55) {
        const first = !s.surrenderedToday.includes(occ.id);
        s.surrenderedToday.push(occ.id);
        return first
          ? { speak: true, tone: 'sulky', intent: 'give-up', attempt }
          : { speak: false, reason: 'もう言った' };
      }
    }

    let tone = 'calm';
    if (event.type === 'done') tone = s.pride > 0.7 ? 'proud' : 'cheerful';
    else if (event.type === 'missed') tone = s.frustration > 0.6 ? 'sulky' : 'worried';
    else if (event.type === 'remind') tone = s.frustration > 0.5 ? 'firm' : 'worried';
    else if (event.type === 'due') tone = s.mood > 0.65 ? 'cheerful' : 'calm';
    if (event.remaining != null && event.remaining <= 20 && importance >= 4) tone = 'firm';
    if (lp.minutes >= 22 * 60 || s.energy < 0.35) tone = tone === 'firm' ? 'firm' : 'quiet';

    return { speak: true, tone, intent: event.type, attempt };
  }

  /**
   * 誰にも呼ばれていないのに口を開くか。
   * 寂しさと、家の状態への気がかりが一定を超えたときだけ。1 日 3 回まで。
   */
  wantsToSpeak(world, summary, now) {
    const lp = localParts(now, this.config.home.timezone);
    const s = this.state;
    if (world.anyoneHome === false) return null;
    if (s.spontaneousToday >= 3) return null;
    if (lp.minutes < 8 * 60 || lp.minutes > 21 * 60) return null;
    // 同じことを 5 分おきに言うのは、寂しさではなく故障に見える
    const sinceLast = s.lastSpontaneousAt ? (now - new Date(s.lastSpontaneousAt)) / 60000 : Infinity;
    if (sinceLast < (this.config.home.spontaneousCooldownMinutes ?? 90)) return null;

    const mark = () => {
      s.spontaneousToday += 1;
      s.lastSpontaneousAt = new Date(now).toISOString();
    };
    if (s.loneliness > 0.75 && s.energy > 0.45) {
      mark();
      return { intent: 'small-talk', tone: 'lonely' };
    }
    if (summary.missed.length >= 2 && s.frustration > 0.6) {
      mark();
      return { intent: 'concern', tone: 'worried' };
    }
    if (summary.remaining === 0 && summary.done.length >= 3 && s.pride > 0.7 && lp.minutes > 19 * 60) {
      mark();
      return { intent: 'celebrate', tone: 'proud' };
    }
    return null;
  }

  /** 一日の終わりに、その日を自分の言葉で畳む。 */
  reflect(summary, text) {
    const entry = {
      date: summary.date,
      done: summary.done.length,
      missed: summary.missed.length,
      mood: Number(this.state.mood.toFixed(2)),
      frustration: Number(this.state.frustration.toFixed(2)),
      text,
    };
    this.state.diary.push(entry);
    if (this.state.diary.length > 120) this.state.diary.shift();
    if (summary.missed.length === 0 && summary.done.length > 0) {
      this.state.pride = clamp(this.state.pride + 0.05);
    }
    return entry;
  }

  /** 自分についての要約。LLM への自己説明にも、「あなたは誰？」への答えにもこれを使う。 */
  selfNarrative() {
    const s = this.state;
    const days = Math.max(1, Math.round((Date.now() - new Date(s.born)) / 86400000));
    const word = (v, low, mid, high) => (v < 0.35 ? low : v < 0.7 ? mid : high);
    return {
      name: this.persona.name,
      firstPerson: this.persona.firstPerson ?? 'わたし',
      daysAlive: days,
      mood: word(s.mood, '沈んでいる', 'ふつう', 'いい'),
      frustration: word(s.frustration, '落ち着いている', 'すこし苛ついている', 'かなり苛ついている'),
      loneliness: word(s.loneliness, '満たされている', 'すこし退屈', '寂しい'),
      pride: word(s.pride, '自信がない', 'ふつう', '手応えがある'),
      values: this.persona.values ?? [],
      notes: s.identityNotes.slice(-3),
      numbers: {
        mood: Number(s.mood.toFixed(2)),
        energy: Number(s.energy.toFixed(2)),
        frustration: Number(s.frustration.toFixed(2)),
        loneliness: Number(s.loneliness.toFixed(2)),
        pride: Number(s.pride.toFixed(2)),
      },
    };
  }

  remember(note, now = new Date()) {
    this.state.identityNotes.push({ at: new Date(now).toISOString(), note });
    if (this.state.identityNotes.length > 50) this.state.identityNotes.shift();
  }
}
