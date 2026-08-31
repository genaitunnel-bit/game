/* ======================================================
   js/rpg-battle.js  —  コマンド選択式RPG戦闘エンジン
   FF7スタイル：ミニキャラ対峙 + コマンドメニュー
   ====================================================== */
"use strict";

const RPGBattle = (() => {

  const ELEM_DATA = {
    fire:    { name:'炎',   icon:'🔥', color:'#FF7040' },
    ice:     { name:'氷',   icon:'❄️', color:'#88D8FF' },
    thunder: { name:'雷',   icon:'⚡', color:'#FFE040' },
    dark:    { name:'闇',   icon:'🌑', color:'#CC80FF' },
    light:   { name:'光',   icon:'✨', color:'#FFFFA0' },
    wind:    { name:'風',   icon:'🌪️', color:'#88FFB8' },
  };

  let S = null;
  let _el = null;
  let _cb = {};
  let _busy = false;

  // ── 公開API ────────────────────────────────────────
  function startBattle(containerEl, config, callbacks) {
    // オーバーレイを作成してcontainerに追加
    const overlay = document.createElement('div');
    overlay.id = 'rpg-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:50;font-family:sans-serif';
    containerEl.appendChild(overlay);
    _el = overlay;
    _cb = callbacks || {};
    _busy = false;

    S = {
      phase: 'player',
      party:   config.party.map(u  => ({ ...u, guard:false })),
      enemies: config.enemies.map(e => ({ ...e, guard:false })),
      weaknesses: config.weaknesses || [],
      knownWeak:  config.knownWeaknesses || [],
      items:  [...(config.items || [])],
      turn:   1,
      log:    ['戦闘開始！'],
      deathLog: [],
      activeIdx: 0,
    };
    while (S.activeIdx < S.party.length && S.party[S.activeIdx].dead) S.activeIdx++;

    _ensureCSS();
    _render();
  }

  function stopBattle() {
    S = null;
    if (_el) { _el.remove(); _el = null; }
  }

  // ── CSS ─────────────────────────────────────────────
  function _ensureCSS() {
    if (document.getElementById('rpg-css')) return;
    const s = document.createElement('style');
    s.id = 'rpg-css';
    s.textContent = `
      @keyframes rpgPulse{0%,100%{filter:drop-shadow(0 0 8px var(--pc))}50%{filter:drop-shadow(0 0 24px var(--pc)) brightness(1.4)}}
      @keyframes rpgLunge{0%,100%{transform:translateX(0)}35%,55%{transform:translateX(72px)}}
      @keyframes rpgLungeL{0%,100%{transform:scaleX(-1) translateX(0)}35%,55%{transform:scaleX(-1) translateX(-72px)}}
      @keyframes rpgShake{0%,100%{transform:translateX(0)}25%{transform:translateX(10px)}75%{transform:translateX(-8px)}}
      @keyframes rpgShakeL{0%,100%{transform:scaleX(-1) translateX(0)}25%{transform:scaleX(-1) translateX(-10px)}75%{transform:scaleX(-1) translateX(8px)}}
      @keyframes rpgFloat{0%{opacity:1;transform:translateY(0) translateX(-50%)}100%{opacity:0;transform:translateY(-80px) translateX(-50%)}}
    `;
    document.head.appendChild(s);
  }

  // ── 描画 ──────────────────────────────────────────────
  function _render() {
    if (!S || !_el) return;
    _el.innerHTML = '';
    _el.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;font-family:sans-serif;background:#060310';

    // フィールド（上部）
    const field = _el.appendChild(document.createElement('div'));
    field.style.cssText = [
      'flex:1','display:flex','align-items:flex-end','justify-content:space-between',
      'padding:20px 56px 36px',
      'background:linear-gradient(180deg,#060310 0%,#120420 50%,#0a0818 100%)',
      'position:relative','overflow:hidden',
    ].join(';') + ';';

    const glow = field.appendChild(document.createElement('div'));
    glow.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at 50% 90%,rgba(80,20,140,0.45),transparent 68%);pointer-events:none';

    // 自軍（左）
    const partyWrap = field.appendChild(document.createElement('div'));
    partyWrap.style.cssText = 'display:flex;align-items:flex-end;gap:28px;z-index:2';
    S.party.forEach((u, i) => {
      if (u.dead) return;
      const w = partyWrap.appendChild(document.createElement('div'));
      w.id = `rpg-p-${u.id}`;
      w.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px';
      const pc = u.color || '#88BBFF';
      const sp = w.appendChild(document.createElement('div'));
      sp.style.cssText = `font-size:${u.isCommander ? 68 : 60}px;line-height:1;text-align:center;--pc:${pc};filter:drop-shadow(0 4px 10px ${pc})`;
      if (!u.dead && S.phase === 'player' && i === S.activeIdx) sp.style.animation = 'rpgPulse 1.3s ease-in-out infinite';
      sp.textContent = u.emoji;
      const nm = w.appendChild(document.createElement('div'));
      nm.style.cssText = `font-size:10px;color:${pc};font-weight:bold;text-align:center;white-space:nowrap`;
      nm.textContent = u.name;
    });

    // 敵（右）
    const enemyWrap = field.appendChild(document.createElement('div'));
    enemyWrap.style.cssText = 'display:flex;align-items:flex-end;gap:24px;z-index:2';
    S.enemies.forEach(e => {
      if (e.dead) return;
      const w = enemyWrap.appendChild(document.createElement('div'));
      w.id = `rpg-e-${e.id}`;
      w.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px';
      const ec = e.color || '#FF8888';
      const sp = w.appendChild(document.createElement('div'));
      sp.style.cssText = `font-size:${e.isBoss ? 76 : 58}px;line-height:1;text-align:center;transform:scaleX(-1);--pc:${ec};filter:drop-shadow(0 4px 14px ${ec})`;
      sp.textContent = e.emoji;
      const hb = w.appendChild(document.createElement('div'));
      hb.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px';
      const hbg = hb.appendChild(document.createElement('div'));
      hbg.style.cssText = 'width:64px;height:6px;background:#1a1a2e;border-radius:3px;overflow:hidden';
      const hbf = hbg.appendChild(document.createElement('div'));
      const pct = e.maxHp > 0 ? e.hp / e.maxHp : 0;
      hbf.style.cssText = `height:100%;width:${Math.max(0, pct*100)}%;background:${pct>.5?'#4CFF7A':pct>.25?'#FFD700':'#FF4444'};border-radius:3px;transition:width .3s`;
      const hbt = hb.appendChild(document.createElement('div'));
      hbt.style.cssText = 'font-size:9px;color:#AAA;text-align:center';
      hbt.textContent = `${e.hp}/${e.maxHp}`;
      const nm = w.appendChild(document.createElement('div'));
      nm.style.cssText = `font-size:10px;color:${ec};font-weight:bold;text-align:center;white-space:nowrap`;
      const poss = e.possessed ? '◆'.repeat(Math.min(e.possessed, 4)) + ' ' : '';
      nm.textContent = poss + (e.isBoss ? `★ ${e.name}` : e.name);
      if (e.possessed) nm.title = `人格を ${e.possessed} 体分 取り込んでいる（攻撃力上昇）`;
    });

    // バトルログ（中央上）
    const log = field.appendChild(document.createElement('div'));
    log.id = 'rpg-log';
    log.style.cssText = [
      'position:absolute','top:14px','left:50%','transform:translateX(-50%)',
      'background:rgba(0,0,0,0.78)','border:1px solid rgba(200,159,255,0.2)',
      'border-radius:8px','padding:7px 18px','font-size:13px','color:#EEE',
      'white-space:nowrap','pointer-events:none',
      'min-width:200px','max-width:460px','text-align:center','overflow:hidden','text-overflow:ellipsis',
    ].join(';') + ';';
    log.textContent = S.log[S.log.length-1] || '';

    // ステータスバー（中段）
    const sb = _el.appendChild(document.createElement('div'));
    sb.style.cssText = 'background:rgba(8,4,22,0.98);border-top:1px solid rgba(200,159,255,0.15);padding:6px 16px;display:flex;flex-direction:column;gap:3px';
    S.party.forEach((u, i) => {
      const row = sb.appendChild(document.createElement('div'));
      const isActive = !u.dead && S.phase === 'player' && i === S.activeIdx;
      row.style.cssText = `display:flex;align-items:center;gap:8px;font-size:12px;padding:2px 4px;border-radius:4px;background:${isActive?'rgba(100,70,200,0.25)':'transparent'}`;
      const nm = document.createElement('span');
      nm.style.cssText = `color:${u.dead?'#555':u.color||'#88BBFF'};font-weight:bold;min-width:90px`;
      nm.textContent = `${u.emoji} ${u.name}${u.dead?' ☠':''}${u.guard?' 🛡':''}`;
      row.appendChild(nm);
      row.appendChild(_sLabel('HP', '#999'));
      row.appendChild(_sBar(u.hp, u.maxHp, u.hp/u.maxHp>.5?'#4CFF7A':u.hp/u.maxHp>.25?'#FFD700':'#FF4444', 110));
      const hn = document.createElement('span');
      hn.style.cssText = 'color:#CCC;min-width:60px;font-size:11px';
      hn.textContent = `${u.hp}/${u.maxHp}`;
      row.appendChild(hn);
      row.appendChild(_sLabel('MP', '#558'));
      row.appendChild(_sBar(u.mp||0, u.maxMp||1, '#5080FF', 70));
      const mn = document.createElement('span');
      mn.style.cssText = 'color:#8090FF;min-width:44px;font-size:11px';
      mn.textContent = `${u.mp||0}/${u.maxMp||0}`;
      row.appendChild(mn);
    });

    // コマンドエリア（下段）
    const ca = _el.appendChild(document.createElement('div'));
    ca.id = 'rpg-cmd';
    ca.style.cssText = 'background:rgba(8,4,22,0.98);border-top:1px solid rgba(80,40,140,0.4);padding:10px 16px;min-height:52px;display:flex;align-items:center;gap:6px';
    if (S.phase === 'player') _renderCmd(ca);
    else if (S.phase === 'enemy') {
      ca.style.justifyContent = 'center';
      ca.innerHTML = '<span style="color:#FF8888;font-weight:bold;font-size:14px">⚔️ 敵のターン…</span>';
    }
  }

  function _sLabel(txt, color) {
    const s = document.createElement('span');
    s.style.cssText = `color:${color};font-size:10px;min-width:18px`;
    s.textContent = txt; return s;
  }
  function _sBar(cur, max, fill, width) {
    const w = document.createElement('div');
    w.style.cssText = `width:${width}px;height:8px;background:#1a1a2e;border-radius:4px;overflow:hidden`;
    const f = w.appendChild(document.createElement('div'));
    f.style.cssText = `height:100%;width:${Math.max(0, Math.min(100, cur/max*100))}%;background:${fill};border-radius:4px;transition:width .25s`;
    return w;
  }

  // ── コマンドメニュー ─────────────────────────────────
  function _renderCmd(container) {
    if (!S) return;
    const unit = S.party[S.activeIdx];
    if (!unit || unit.dead) { _nextPlayer(); return; }
    const pc = unit.color || '#88BBFF';
    const who = container.appendChild(document.createElement('span'));
    who.style.cssText = `color:${pc};font-weight:bold;font-size:13px;min-width:72px`;
    who.textContent = `${unit.emoji} ${unit.name}`;
    const sep = container.appendChild(document.createElement('span'));
    sep.style.cssText = 'color:rgba(200,159,255,0.3);font-size:20px;margin:0 4px';
    sep.textContent = '│';
    _cmdBtn(container, '⚔️ 攻撃',    '#C8A0FF', () => _doAttack(unit));
    _cmdBtn(container, '✨ スキル',   '#FFD080', () => _showSkills(container, unit));
    _cmdBtn(container, '🎒 アイテム', '#80FFB0', () => _showItems(container));
    _cmdBtn(container, '🛡️ 防御',    '#80C8FF', () => _doGuard(unit));
    if (S.knownWeak.length) {
      const wk = container.appendChild(document.createElement('span'));
      wk.style.cssText = 'margin-left:auto;color:#AAA;font-size:11px;display:flex;align-items:center;gap:3px';
      wk.innerHTML = '<span>弱点:</span>';
      S.knownWeak.forEach(e => {
        const ed = ELEM_DATA[e]; if (!ed) return;
        const ic = document.createElement('span');
        ic.style.cssText = `color:${ed.color};font-size:15px;filter:drop-shadow(0 0 4px ${ed.color})`;
        ic.title = ed.name; ic.textContent = ed.icon;
        wk.appendChild(ic);
      });
      container.appendChild(wk);
    }
  }

  function _cmdBtn(parent, label, color, fn) {
    const b = parent.appendChild(document.createElement('button'));
    b.textContent = label;
    b.style.cssText = `padding:7px 14px;background:rgba(40,20,80,0.7);border:1px solid rgba(200,159,255,0.2);border-radius:8px;color:${color};font-size:12px;cursor:pointer;white-space:nowrap`;
    b.onmouseenter = () => b.style.background = 'rgba(80,40,160,0.7)';
    b.onmouseleave = () => b.style.background = 'rgba(40,20,80,0.7)';
    b.onclick = fn; return b;
  }

  function _showSkills(container, unit) {
    container.innerHTML = '';
    const back = _back(container);
    back.onclick = () => _render();
    (unit.skills || []).forEach(sk => {
      const ed = sk.elem ? ELEM_DATA[sk.elem] : null;
      const isKW = sk.elem && S.knownWeak.includes(sk.elem);
      const b = container.appendChild(document.createElement('button'));
      b.style.cssText = `padding:6px 12px;background:${ed?`rgba(${_hexRgb(ed.color)},0.14)`:'rgba(40,20,80,0.6)'};border:1px solid ${ed?ed.color+'44':'rgba(200,159,255,0.2)'};border-radius:8px;color:${ed?ed.color:'#CCC'};font-size:12px;cursor:pointer;white-space:nowrap${isKW?`;box-shadow:0 0 8px ${ed.color};font-weight:bold`:''}`;
      b.innerHTML = `${ed?ed.icon:'⚔️'} ${sk.name} <small style="opacity:.55">${sk.mpCost?'MP'+sk.mpCost:''}</small>`;
      if ((unit.mp||0) < (sk.mpCost||0)) { b.disabled = true; b.style.opacity = '.35'; }
      b.onclick = () => { if ((unit.mp||0) < (sk.mpCost||0)) return; unit.mp = (unit.mp||0) - (sk.mpCost||0); _doSkill(unit, sk); };
    });
  }

  function _showItems(container) {
    container.innerHTML = '';
    const back = _back(container);
    back.onclick = () => _render();
    if (!S.items.length) {
      const n = container.appendChild(document.createElement('span'));
      n.style.cssText = 'color:#666;font-size:12px;margin-left:8px';
      n.textContent = 'アイテムなし'; return;
    }
    S.items.forEach((item, i) => {
      const b = container.appendChild(document.createElement('button'));
      b.style.cssText = 'padding:6px 12px;background:rgba(20,60,20,0.7);border:1px solid rgba(80,200,80,0.3);border-radius:8px;color:#80FF80;font-size:12px;cursor:pointer;white-space:nowrap';
      b.textContent = `${item.icon||'💊'} ${item.name}`;
      b.onclick = () => { S.items.splice(i, 1); _doItem(item); };
    });
  }

  function _back(parent) {
    const b = parent.appendChild(document.createElement('span'));
    b.style.cssText = 'color:#888;font-size:12px;cursor:pointer;margin-right:6px;white-space:nowrap';
    b.textContent = '← 戻る'; return b;
  }

  function _hexRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '128,128,128';
  }

  // ── アクション ─────────────────────────────────────────
  function _doAttack(unit) {
    if (_busy) return;
    const t = _liveEnemy(); if (!t) return;
    const dmg = Math.max(1, unit.atk - Math.floor(t.def * .5));
    _anim(unit, t, dmg, null, () => {
      _hit(t, dmg);
      _log(`${unit.name}の攻撃！ ${t.name}に ${dmg} ダメージ！`);
      if (t.dead) _log(`${t.name}を倒した！`);
      _drainDeathLog(_afterAction);
    });
  }

  function _doSkill(unit, sk) {
    if (_busy) return;
    if (sk.isHeal) {
      const w = S.party.filter(u => !u.dead).sort((a,b) => (a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
      if (w) { const h = Math.floor(unit.atk*.7 + (sk.healValue||25)); w.hp = Math.min(w.maxHp, w.hp+h); _log(`${unit.name}の${sk.name}！ ${w.name}を ${h} 回復！`); }
      _render(); _nextPlayer(); return;
    }
    const t = _liveEnemy(); if (!t) return;
    let dmg = Math.max(1, Math.floor(unit.atk*(sk.power||1.0)) - Math.floor(t.def*.3));
    const isWk = sk.elem && S.weaknesses.includes(sk.elem);
    if (isWk) dmg = Math.floor(dmg * 1.6);
    _anim(unit, t, dmg, sk.elem, () => {
      _hit(t, dmg, sk.elem);
      const ed = sk.elem ? ELEM_DATA[sk.elem] : null;
      _log(`${unit.name}の${ed?ed.icon:''}${sk.name}！ ${t.name}に ${dmg} ダメージ${isWk?' 【弱点！】':''}！`);
      if (t.dead) _log(`${t.name}を倒した！`);
      _drainDeathLog(_afterAction);
    });
  }

  function _doGuard(unit) {
    if (_busy) return;
    unit.guard = true;
    _log(`${unit.name}は防御した！`);
    _render(); _nextPlayer();
  }

  function _doItem(item) {
    if (_busy) return;
    if (item.effect === 'heal') {
      const t = S.party.filter(u=>!u.dead).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
      if (t) { t.hp = Math.min(t.maxHp, t.hp+(item.value||50)); _log(`${item.icon} ${item.name}！ ${t.name}を ${item.value||50} 回復！`); }
    } else if (item.effect === 'mp_restore') {
      const t = S.party.filter(u=>!u.dead)[0];
      if (t) { t.mp = Math.min(t.maxMp||60, (t.mp||0)+(item.value||30)); _log(`${item.icon} ${item.name}！ MPを回復！`); }
    } else if (item.effect === 'bomb') {
      S.enemies.filter(e=>!e.dead).forEach(e => { _hit(e, item.value||40); _log(`爆弾！ ${e.name}に ${item.value||40} ダメージ！`); });
    }
    _render();
    _drainDeathLog(() => { if (!_checkEnd()) _nextPlayer(); });
  }

  function _afterAction() {
    if (_checkEnd()) return;
    _nextPlayer();
  }

  function _nextPlayer() {
    if (!S) return;
    let next = S.activeIdx + 1;
    while (next < S.party.length && S.party[next].dead) next++;
    if (next >= S.party.length) {
      S.party.forEach(u => u.guard = false);
      S.phase = 'enemy'; _render();
      setTimeout(_doEnemyTurn, 700);
    } else {
      S.activeIdx = next; _render();
    }
  }

  // ── 敵ターン ─────────────────────────────────────────
  function _doEnemyTurn() {
    if (!S) return;
    const alive = S.enemies.filter(e => !e.dead);
    let i = 0;
    function step() {
      if (!S) return;
      if (i >= alive.length) { _startPlayerTurn(); return; }
      const enemy = alive[i++];
      if (enemy.dead) { step(); return; }
      const pAlive = S.party.filter(u => !u.dead);
      if (!pAlive.length) { _end(false); return; }
      const t = pAlive[Math.floor(Math.random()*pAlive.length)];
      let sk = null;
      if (enemy.skills && enemy.skills.length && Math.random() < 0.45) {
        const usable = enemy.skills.filter(s => !s.isHeal && (!s.mpCost || (enemy.mp||99) >= (s.mpCost||0)));
        if (usable.length) sk = usable[Math.floor(Math.random()*usable.length)];
      }
      let dmg, elem = null;
      if (sk) {
        dmg = Math.max(1, Math.floor(enemy.atk*(sk.power||1)) - Math.floor(t.def*(t.guard?.65:.3)));
        elem = sk.elem;
        if (enemy.mp !== undefined && sk.mpCost) enemy.mp = Math.max(0, (enemy.mp||0)-(sk.mpCost||0));
      } else {
        dmg = Math.max(1, enemy.atk - Math.floor(t.def*(t.guard?.65:.3)));
      }
      const ed = elem ? ELEM_DATA[elem] : null;
      _anim(enemy, t, dmg, elem, () => {
        _hit(t, dmg);
        const skName = sk ? `${ed?ed.icon:''}${sk.name}` : '攻撃';
        _log(`${enemy.name}の${skName}！ ${t.name}に ${dmg} ダメージ${t.guard?' (防御中)':''}！`);
        if (t.dead) _log(`${t.name}が倒れた…`);
        if (_checkEnd()) return;
        setTimeout(step, 440);
      });
    }
    step();
  }

  function _startPlayerTurn() {
    if (!S) return;
    S.turn++;
    S.phase = 'player';
    S.activeIdx = 0;
    while (S.activeIdx < S.party.length && S.party[S.activeIdx].dead) S.activeIdx++;
    if (S.activeIdx >= S.party.length) { _end(false); return; }
    _log(`── ターン ${S.turn} ──`);
    _render();
  }

  function _checkEnd() {
    if (!S) return true;
    const eAlive = S.enemies.filter(e=>!e.dead).length;
    const pAlive = S.party.filter(u=>!u.dead).length;
    if (!eAlive) { _log('勝利！'); _render(); setTimeout(() => _end(true),  1000); return true; }
    if (!pAlive) { _log('全滅した…'); _render(); setTimeout(() => _end(false), 1000); return true; }
    return false;
  }

  function _end(victory) {
    if (!S) return;
    const survivors = S.party.filter(u=>!u.dead);
    stopBattle();
    _cb.onBattleEnd && _cb.onBattleEnd({ victory, survivors });
  }

  // ── アニメーション ────────────────────────────────────
  function _anim(attacker, target, dmg, elem, onDone) {
    _busy = true;
    const isP  = attacker.side === 'player';
    const atkEl = document.getElementById(isP ? `rpg-p-${attacker.id}` : `rpg-e-${attacker.id}`);
    const defEl = document.getElementById(isP ? `rpg-e-${target.id}`   : `rpg-p-${target.id}`);
    const isWk  = elem && S.weaknesses.includes(elem);
    const ed    = elem ? ELEM_DATA[elem] : null;

    if (atkEl) {
      const sp = atkEl.querySelector('div');
      if (sp) { sp.style.animation = isP ? 'rpgLunge 0.65s ease' : 'rpgLungeL 0.65s ease'; setTimeout(() => { if (sp) sp.style.animation = ''; }, 700); }
    }

    setTimeout(() => {
      if (defEl) {
        const sp = defEl.querySelector('div');
        if (sp) { sp.style.animation = isP ? 'rpgShakeL 0.4s ease' : 'rpgShake 0.4s ease'; setTimeout(() => { if (sp) sp.style.animation = ''; }, 450); }
        const rect = defEl.getBoundingClientRect();
        const fl = document.body.appendChild(document.createElement('div'));
        fl.style.cssText = [
          'position:fixed',
          `left:${rect.left + rect.width/2}px`,
          `top:${rect.top - 8}px`,
          `color:${isWk ? (ed?.color||'#FF4444') : '#FFD700'}`,
          `font-size:${isWk ? '30px' : '22px'}`,
          'font-weight:900','text-shadow:0 0 8px currentColor',
          'pointer-events:none','z-index:300','white-space:nowrap',
          'animation:rpgFloat 1.1s ease-out forwards',
          'transform:translateX(-50%)',
        ].join(';') + ';';
        fl.textContent = isWk ? `${ed?.icon||''} ${dmg}!!` : `-${dmg}`;
        setTimeout(() => fl.remove(), 1200);
      }
      setTimeout(() => { _busy = false; onDone && onDone(); }, 400);
    }, 320);
  }

  function _hit(unit, dmg, elem) {
    unit.hp = Math.max(0, unit.hp-dmg);
    if (unit.hp === 0 && !unit.dead) { unit.dead = true; _onDeath(unit, elem || null); }
  }

  /* ── 撃破時の特殊効果 ──────────────────────────────
     人格排泄兵：器が壊れると、排泄された人格が生き残った別の敵へ流れ込む。
     憑依された敵は攻撃力が上がり、HPも少し回復する。 */
  function _onDeath(unit, elem) {
    if (!S || unit.side !== 'enemy' || unit.onDeath !== 'excrete') return;

    // 光属性のとどめは、排泄された人格ごと浄化する
    if (elem === 'light') {
      S.deathLog.push(`✨ ${unit.name}は光に還った。排泄された人格も一緒に浄化された。`);
      return;
    }

    // 後列（配列上の次）の生存個体へ流れ込む
    const idx  = S.enemies.indexOf(unit);
    const rest = S.enemies.filter((e, i) => !e.dead && i > idx);
    const host = rest[0] || S.enemies.find(e => !e.dead && e !== unit);
    if (!host) {
      S.deathLog.push(`${unit.name}の器が砕けた。排泄された人格は、流れ込む先を失って消えた。`);
      return;
    }
    host.possessed = (host.possessed || 0) + 1;
    host.atk = Math.round(host.atk * 1.20);
    host.hp  = Math.min(host.maxHp, host.hp + Math.round(host.maxHp * 0.12));
    S.deathLog.push(`💧 排泄——${unit.name}から溢れた人格が ${host.name} に流れ込んだ！ 攻撃力上昇！`);
  }

  /* 撃破時メッセージを表示しきってから次の処理へ進む */
  function _drainDeathLog(next) {
    if (!S || !S.deathLog.length) { next(); return; }
    const msgs = S.deathLog.splice(0);
    _busy = true;
    (function show(i) {
      if (!S) return;
      if (i >= msgs.length) { _busy = false; next(); return; }
      _log(msgs[i]);
      _render();
      setTimeout(() => show(i + 1), 1000);
    })(0);
  }
  function _liveEnemy() { return S.enemies.find(e=>!e.dead); }
  function _log(txt) { if (S) { S.log.push(txt); const l = document.getElementById('rpg-log'); if (l) l.textContent = txt; } }

  return { startBattle, stopBattle };
})();
