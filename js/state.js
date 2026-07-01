/* ======================================================
   js/state.js  —  ゲーム状態管理
   ====================================================== */
"use strict";

/* グローバル状態 */
let G = {};

function initGameState() {
  G = {
    phase: 'title',          // title | story | map | prebattle | battle | capture | interrogation | intelResult | attackPlan | result | gameover
    turn:  1,
    player: {
      baseHp:    300,
      baseMaxHp: 300,
      gold:      1200,
      defBonus:  0,
      atkBonus:  0,
      critBonus: 0,
      secretEnd: false,
    },
    /* 収集済み情報 */
    intel: [],              // { id, name, cat, content, accuracy, isTrue, from, method, isNew }
    /* 捕虜リスト（尋問待ち） */
    prisoners: [],
    /* 仲間になった天使 */
    allies: [{ id:'lumiel', trust:100, fear:0, sessions:0, recruited:true, revealedTopics:new Set() }],
    /* 制圧済み拠点 */
    clearedLocs: new Set(),
    /* 報復強度 */
    retaliationPower: 0,
    /* 現在の戦闘状態 */
    battle: null,
    /* 現在の尋問状態 */
    interrogation: null,
    /* 最後に入手した情報（結果表示用） */
    lastIntel: [],
    /* ストーリーシーン進行 */
    storyIdx: 0,
    /* 攻撃対象 */
    pendingAttackLoc: null,
    /* 攻撃結果 */
    attackResult: null,
    /* 招集シーン */
    recruitingId: null,
    /* アイテムインベントリ */
    inventory: [],       // itemId の配列（重複あり）
    /* 装備スロット（有効中のequipmentアイテム効果） */
    equippedEffects: [], // { effect, value, itemName } の配列
    /* ドロップブースト乗数（intel情報によって増加）*/
    dropBoostMult: 1.0,
    /* イベントシーン状態 */
    eventScene: null,    // { angelId, eventId, lineIdx }
    /* 尋問イベント 既に見たシーンのIDセット */
    seenEvents: new Set(),
  };
}

/* -------- ヘルパー -------- */

function getAngel(id) { return ANGELS.find(a => a.id === id); }
function getLocation(id) { return LOCATIONS.find(l => l.id === id); }
function getIntelDef(id) { return INTEL_POOL.find(i => i.id === id); }

function getAllyEntry(id) {
  let e = G.allies.find(a => a.id === id);
  if (!e) { e = { id, trust: 0, fear: 0, sessions: 0, recruited: false, revealedTopics: new Set() }; G.allies.push(e); }
  return e;
}

function hasIntel(id) { return G.intel.some(i => i.id === id); }

function isLocUnlocked(loc) {
  return loc.reqIntel.every(id => hasIntel(id));
}

function getWeaknessMulti(angelId) {
  const angel = getAngel(angelId);
  if (!angel) return 1;
  return hasIntel(angel.weaknessId) ? angel.weaknessMulti : 1;
}

function calcAccuracy(angel, method) {
  const base = 65 - angel.resist * 0.42;
  const mod  = (method.infoAccMod || 0);
  return Math.min(95, Math.max(10, Math.round(base + mod)));
}

function addIntel(id, fromName, methodName) {
  if (hasIntel(id)) return null;
  const def = getIntelDef(id);
  if (!def) return null;
  const acc = Math.floor(60 + Math.random() * 35);
  const isTrue = Math.random() * 100 < acc;
  const entry = {
    id, name: def.name, cat: def.cat,
    content:  isTrue ? def.trueText : def.falseText,
    accuracy: acc,
    isTrue,
    unlocks:  def.unlocks || [],
    relevantFor: def.relevantFor || [],
    from: fromName,
    method: methodName,
    isNew: true,
  };
  G.intel.push(entry);
  return entry;
}

function accColor(acc) {
  if (acc >= 72) return 'var(--green)';
  if (acc >= 50) return 'var(--gold)';
  return 'var(--red)';
}

function relHeart(trust) {
  const full = Math.floor(trust / 20);
  const half = trust % 20 >= 10;
  return '♥'.repeat(full) + (half ? '♡' : '') + '♡'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
}

/* -------- インベントリ -------- */

function addItemToInventory(itemId) {
  G.inventory.push(itemId);
}

function removeItemFromInventory(itemId) {
  const i = G.inventory.indexOf(itemId);
  if (i >= 0) { G.inventory.splice(i, 1); return true; }
  return false;
}

function hasItem(itemId) { return G.inventory.includes(itemId); }
function getItemDef(itemId) { return ITEMS.find(it => it.id === itemId); }

function countItemsByCategory(cat) {
  return G.inventory.filter(id => { const d = getItemDef(id); return d && d.cat === cat; }).length;
}

function applyDrops(drops) {
  for (const id of drops) {
    const def = getItemDef(id);
    if (!def) continue;
    if (def.cat === 'intel') {
      addIntel(def.intelId, 'ドロップ', 'アイテム');
    } else if (def.cat === 'equipment' && def.effect === 'gold_bonus') {
      G.player.gold += def.value;
    } else if (def.cat === 'equipment' && def.effect === 'base_hp') {
      G.player.baseHp = Math.min(G.player.baseMaxHp + def.value, G.player.baseHp + def.value);
      G.player.baseMaxHp += def.value;
    } else {
      addItemToInventory(id);
    }
  }
}

function recalcDropBoost() {
  let mult = 1.0;
  if (hasIntel('spy_network')   && G.intel.find(i=>i.id==='spy_network')?.isTrue)   mult += 0.5;
  if (hasIntel('battle_records')&& G.intel.find(i=>i.id==='battle_records')?.isTrue) mult += 0.3;
  if (hasIntel('truth_revealed')&& G.intel.find(i=>i.id==='truth_revealed')?.isTrue) mult += 0.2;
  G.dropBoostMult = mult;
}
