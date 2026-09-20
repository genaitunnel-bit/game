import test from 'node:test';
import assert from 'node:assert/strict';
import { moraShapes, FACES, MOUTHS } from '../web/avatar.js';
import { Ego } from '../src/core/ego.js';
import { testConfig, tmpStore } from './helpers.js';

test('かなを口の形（母音）に置き換える', () => {
  assert.deepEqual(moraShapes('ゴミだして'), ['o', 'i', 'a', 'i', 'e']);
  assert.deepEqual(moraShapes('おかえり'), ['o', 'a', 'e', 'i']);
  assert.deepEqual(moraShapes('ん'), ['n']);
});

test('伸ばし棒は直前の母音を伸ばす（口を閉じない）', () => {
  assert.deepEqual(moraShapes('やったー'), ['a', 'n', 'a', 'a']);
  assert.deepEqual(moraShapes('ええー'), ['e', 'e', 'e']);
});

test('句読点では口を閉じる', () => {
  assert.deepEqual(moraShapes('あ、い'), ['a', 'closed', 'i']);
  assert.deepEqual(moraShapes(''), []);
  assert.deepEqual(moraShapes(null), []);
});

test('読めない漢字でも口は動く（閉じたままにならない）', () => {
  const shapes = moraShapes('洗濯物');
  assert.equal(shapes.length, 3);
  assert.ok(shapes.every((shape) => shape !== 'closed'));
  assert.ok(new Set(shapes).size > 1, '同じ形で固まらない');
});

test('口の形はすべて定義されている', () => {
  for (const shape of moraShapes('あいうえおんゴミ出し')) {
    assert.ok(MOUTHS[shape], `${shape} の口が無い`);
  }
  for (const [name, face] of Object.entries(FACES)) {
    assert.ok(MOUTHS[face.mouth], `${name} の口 (${face.mouth}) が無い`);
  }
});

test('内面がとりうる表情には、すべて顔がある', () => {
  const ego = new Ego({ config: testConfig(), store: tmpStore() });
  const seen = new Set();
  for (const frustration of [0, 0.5, 0.9]) {
    for (const energy of [0.2, 0.8]) {
      for (const loneliness of [0.1, 0.9]) {
        for (const mood of [0.1, 0.5, 0.9]) {
          Object.assign(ego.state, { frustration, energy, loneliness, mood });
          seen.add(ego.expression());
        }
      }
    }
  }
  assert.ok(seen.size >= 5, `表情が足りない: ${[...seen]}`);
  for (const expression of seen) {
    assert.ok(FACES[expression], `${expression} に対応する顔が avatar.js に無い`);
  }
});
