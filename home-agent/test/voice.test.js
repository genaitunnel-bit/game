import test from 'node:test';
import assert from 'node:assert/strict';
import { Voice } from '../src/core/voice.js';
import { Ego } from '../src/core/ego.js';
import { pickStyle, STYLES } from '../src/core/voices/index.js';
import { testConfig, tmpStore } from './helpers.js';

function voiceWith(personaOverrides = {}) {
  const config = testConfig({ persona: { name: 'ひなた', style: 'cute', ...personaOverrides } });
  const store = tmpStore();
  return new Voice({ config, ego: new Ego({ config, store }), llm: null });
}

const event = {
  type: 'due',
  occurrence: { id: 'o1', taskId: 'trash', title: 'ゴミ出し', emoji: '🗑️', deadlineMinutes: 480, importance: 5 },
};

test('既定はかわいい系の口調', () => {
  const line = voiceWith().template(event, { intent: 'due', tone: 'cheerful' });
  assert.match(line, /ゴミ出し/);
  assert.match(line, /よ|やっちゃお|ね/, '柔らかい語尾になっている');
});

test('style を plain にすると落ち着いた口調に入れ替わる', () => {
  const cute = voiceWith().template(event, { intent: 'due', tone: 'cheerful' });
  const plain = voiceWith({ style: 'plain' }).template(event, { intent: 'due', tone: 'cheerful' });
  assert.notEqual(cute, plain);
  assert.match(plain, /ゴミ出し/, 'どの口調でも用件は落とさない');
});

test('知らない style を書かれても黙ってかわいい系に落ちる', () => {
  assert.equal(pickStyle('しらないやつ').id, 'cute');
  assert.equal(pickStyle(undefined).id, 'cute');
});

const NO_TASK = new Set(['small-talk', 'concern', 'celebrate']);

test('どの口調・どの状況でも、台詞からタスク名が落ちない', () => {
  for (const [styleName, style] of Object.entries(STYLES)) {
    const voice = voiceWith({ style: styleName });
    for (const [intent, byTone] of Object.entries(style.templates)) {
      for (const tone of Object.keys(byTone)) {
        const line = voice.template(
          { ...event, remaining: 12, late: intent === 'due-late', missedCount: 2 },
          { intent: intent === 'due-late' ? 'due' : intent, tone, attempt: 3 }
        );
        assert.ok(line.length > 0, `${styleName}/${intent}/${tone}: 空の台詞`);
        if (!NO_TASK.has(intent)) {
          assert.match(line, /ゴミ出し/, `${styleName}/${intent}/${tone}: タスク名が落ちている`);
        }
        assert.doesNotMatch(line, /undefined|NaN|\[object/, `${styleName}/${intent}/${tone}: 埋め込み漏れ`);
      }
    }
  }
});

test('挨拶に返事をする', () => {
  const voice = voiceWith();
  const summary = { calling: [{ title: '洗濯' }], missed: [], done: [], upcoming: [] };
  assert.match(voice.greeting('ただいま', summary), /おかえり/);
  assert.match(voice.greeting('ただいま', summary), /洗濯/);
  assert.match(voice.greeting('おやすみ', { calling: [], missed: [], done: [] }), /おやすみ/);
  assert.match(voice.greeting('いってきます', { calling: [], missed: [], done: [] }), /いってらっしゃい/);
});

test('表情は内面から決まる', () => {
  const config = testConfig();
  const ego = new Ego({ config, store: tmpStore() });
  ego.state.frustration = 0.8;
  assert.equal(ego.expression(), 'sulky');
  ego.state.frustration = 0.1;
  ego.state.energy = 0.2;
  assert.equal(ego.expression(), 'sleepy');
  ego.state.energy = 0.8;
  ego.state.loneliness = 0.9;
  assert.equal(ego.expression(), 'lonely');
  ego.state.loneliness = 0.1;
  ego.state.mood = 0.9;
  assert.equal(ego.expression(), 'happy');
  assert.ok(STYLES.cute.faces[ego.expression()], '口調スタイルが顔文字に変換できる');
});
