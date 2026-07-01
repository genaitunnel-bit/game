/* ======================================================
   js/fe-battle.js  —  ファイアーエムブレム式ターン制戦闘エンジン
   ====================================================== */
"use strict";

const FEBattle = (() => {

  const COLS = 10, ROWS = 7;
  const DIRS = [[0,-1],[0,1],[-1,0],[1,0]];

  // ── 敵ユニット定義 ──────────────────────────────────
  const ENEMY_DEFS = {
    grunt:  { name:'天使兵',   emoji:'👼', hp:28, atk:11, def:4,  spd:7,  mov:3, rng:1, gold:5  },
    elite:  { name:'精鋭天使', emoji:'⚔️',  hp:45, atk:15, def:7,  spd:9,  mov:4, rng:1, gold:15 },
    archer: { name:'弓天使',   emoji:'🏹', hp:32, atk:13, def:3,  spd:10, mov:3, rng:2, gold:12 },
    heavy:  { name:'重装天使', emoji:'🛡️', hp:75, atk:17, def:14, spd:5,  mov:2, rng:1, gold:25 },
  };

  // ── 状態変数 ────────────────────────────────────────
  let _canvas = null, _ctx = null, _raf = null;
  let S = null;
  let _cb = {};

  // ── 公開 API ────────────────────────────────────────

  function startBattle(canvasEl, config, callbacks) {
    _canvas = canvasEl;
    _ctx    = canvasEl.getContext('2d');
    _cb     = callbacks || {};

    _canvas.width  = window.innerWidth;
    _canvas.height = Math.max(300, window.innerHeight - 60);

    const W = _canvas.width, H = _canvas.height;
    const cellSize = Math.floor(Math.min(W / COLS, H / ROWS));
    const offsetX  = Math.floor((W - cellSize * COLS) / 2);
    const offsetY  = Math.floor((H - cellSize * ROWS) / 2);

    // プレイヤーユニット配置
    const startPos = [[0,3],[1,2],[1,4],[0,1]];
    const playerUnits = [];

    const cmdDef = config.commanderUnit;
    playerUnits.push({
      id:'commander', side:'player', name:cmdDef.name, emoji:cmdDef.emoji,
      color:'#4488FF',
      hp:cmdDef.hp, maxHp:cmdDef.hp, atk:cmdDef.atk, def:cmdDef.def, spd:cmdDef.spd,
      mov:cmdDef.mov||4, rng:cmdDef.rng||1,
      c:startPos[0][0], r:startPos[0][1],
      hasMoved:false, hasActed:false, dead:false, isCommander:true,
    });

    (config.allies||[]).slice(0,3).forEach((a,i) => {
      playerUnits.push({
        id:a.id, side:'player', name:a.name, emoji:a.emoji, color:a.color||'#88DDAA',
        hp:a.hp, maxHp:a.hp, atk:a.atk, def:a.def, spd:a.spd,
        mov:a.mov||4, rng:a.rng||1,
        c:startPos[i+1][0], r:startPos[i+1][1],
        hasMoved:false, hasActed:false, dead:false, isCommander:false,
      });
    });

    // 装備効果を適用
    for (const eff of (config.equipEffects||[])) {
      _applyEquipEffect(playerUnits, eff);
    }

    // 敵ユニット配置
    const enemyUnits = [];
    const layout = config.enemyLayout || _defaultLayout();
    layout.forEach((spec, i) => {
      const def = ENEMY_DEFS[spec.type] || ENEMY_DEFS.grunt;
      enemyUnits.push({
        id:`enemy_${i}`, side:'enemy', name:def.name, emoji:def.emoji, color:'#FF6655',
        hp:def.hp, maxHp:def.hp, atk:def.atk, def:def.def, spd:def.spd,
        mov:def.mov, rng:def.rng, gold:def.gold,
        c:spec.c, r:spec.r,
        hasMoved:false, hasActed:false, dead:false, isBoss:false,
      });
    });

    // ボス天使
    const boss = config.angel;
    enemyUnits.push({
      id:'boss', side:'enemy', name:boss.name, emoji:boss.emoji, color:boss.color||'#FF44FF',
      hp:boss.hp, maxHp:boss.hp, atk:boss.atk, def:boss.def, spd:boss.spd,
      mov:boss.mov||3, rng:boss.rng||1, gold:boss.gold||80,
      c:9, r:3,
      hasMoved:false, hasActed:false, dead:false, isBoss:true,
    });

    S = {
      phase:'player', turnNum:1,
      units:[...playerUnits, ...enemyUnits],
      selected:null,
      moveTargets:[], attackTargets:[],
      pendingMove:null,
      combatLog:null, _combatLogTimer:null,
      canCapture:false,
      hoverCell:null,
      cellSize, offsetX, offsetY,
      config,
    };

    _canvas.onclick     = _onCanvasClick;
    _canvas.onmousemove = _onMouseMove;

    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(_drawLoop);
    _hudUpdate();
  }

  function stopBattle() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_canvas) { _canvas.onclick = null; _canvas.onmousemove = null; }
    S = null;
  }

  function endPlayerTurn() {
    if (!S || S.phase !== 'player') return;
    S.selected = null; S.moveTargets = []; S.attackTargets = []; S.pendingMove = null;
    S.phase = 'enemy';
    _hudUpdate();
    setTimeout(_doEnemyPhase, 400);
  }

  function selectWait() {
    if (!S || !S.pendingMove) return;
    const unit = S.units.find(u => u.id === S.pendingMove.unitId);
    if (unit) { unit.hasMoved = true; unit.hasActed = true; }
    S.pendingMove = null; S.selected = null; S.attackTargets = [];
    _checkAllActed();
    _hudUpdate();
  }

  function doCapture() {
    if (!S) return;
    const boss = S.units.find(u => u.isBoss && !u.dead);
    if (boss) _endBattle(true);
  }

  function useBattleItem(itemId, targetUnitId) {
    if (!S) return;
    if (itemId === 'bomb') {
      S.units.filter(u => u.side==='enemy' && !u.dead)
             .forEach(u => { u.hp = Math.max(0, u.hp - 50); if (u.hp===0) u.dead=true; });
      S.combatLog = { attacker:{name:'爆弾'}, defender:{name:'全敵'}, atkDmg:50, defDmg:0 };
    } else if (itemId === 'heal_kit') {
      const target = targetUnitId
        ? S.units.find(u => u.id===targetUnitId && !u.dead)
        : S.units.filter(u => u.side==='player' && !u.dead)
                 .sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp))[0];
      if (target) {
        const heal = 15;
        target.hp = Math.min(target.maxHp, target.hp + heal);
        S.combatLog = { attacker:{name:'回復キット'}, defender:target, atkDmg:-heal, defDmg:0 };
      }
    }
    _hudUpdate();
  }

  function getState() { return S; }

  // ── 装備効果適用 ─────────────────────────────────────
  function _applyEquipEffect(units, eff) {
    switch (eff.type) {
      case 'archer_dmg':
        units.filter(u=>u.rng>=2).forEach(u => u.atk = Math.round(u.atk*(1+eff.value/100)));
        break;
      case 'mage_dmg':
      case 'cannon_dmg':
        units.filter(u=>u.side==='player').forEach(u => u.atk += 3);
        break;
      case 'all_range':
        units.filter(u=>u.side==='player').forEach(u => u.rng = Math.min(u.rng+1, 2));
        break;
      case 'base_hp':
        units.filter(u=>u.side==='player').forEach(u => { u.hp += eff.value; u.maxHp += eff.value; });
        break;
      case 'ice_slow':
        // 敵全体の速度ダウンは_doEnemyPhaseで処理
        break;
    }
  }

  // ── 入力処理 ──────────────────────────────────────────
  function _onCanvasClick(ev) {
    if (!S || S.phase !== 'player') return;
    const rect = _canvas.getBoundingClientRect();
    const mx = (ev.clientX - rect.left) * (_canvas.width / rect.width);
    const my = (ev.clientY - rect.top)  * (_canvas.height / rect.height);
    const c = Math.floor((mx - S.offsetX) / S.cellSize);
    const r = Math.floor((my - S.offsetY) / S.cellSize);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    _handleClick(c, r);
  }

  function _onMouseMove(ev) {
    if (!S) return;
    const rect = _canvas.getBoundingClientRect();
    const mx = (ev.clientX - rect.left) * (_canvas.width / rect.width);
    const my = (ev.clientY - rect.top)  * (_canvas.height / rect.height);
    S.hoverCell = {
      c: Math.floor((mx - S.offsetX) / S.cellSize),
      r: Math.floor((my - S.offsetY) / S.cellSize),
    };
  }

  function _handleClick(c, r) {
    // 移動後のアクション選択フェーズ
    if (S.pendingMove) {
      const unit = S.units.find(u => u.id === S.pendingMove.unitId);
      const isAttackTarget = S.attackTargets.find(t => t.c===c && t.r===r);

      if (isAttackTarget) {
        const enemy = S.units.find(u => u.c===c && u.r===r && !u.dead && u.side==='enemy');
        if (enemy) {
          _combat(unit, enemy);
          unit.hasMoved = true; unit.hasActed = true;
          S.pendingMove = null; S.selected = null; S.attackTargets = [];
          _checkAllActed();
          _hudUpdate();
          return;
        }
      }
      // 攻撃対象外クリック → 移動キャンセル
      unit.c = S.pendingMove.fromC; unit.r = S.pendingMove.fromR;
      S.pendingMove = null; S.selected = null; S.moveTargets = []; S.attackTargets = [];
      _hudUpdate();
      return;
    }

    const clicked = S.units.find(u => u.c===c && u.r===r && !u.dead);

    // 移動先クリック
    if (S.selected && S.moveTargets.find(t => t.c===c && t.r===r)) {
      const unit = S.units.find(u => u.id === S.selected);
      if (clicked && clicked.side==='enemy') return; // 敵のいるマスには入れない
      const fromC = unit.c, fromR = unit.r;
      unit.c = c; unit.r = r;
      S.pendingMove = { unitId:unit.id, fromC, fromR };
      S.attackTargets = _getAttackCells(unit)
        .filter(t => S.units.find(u => u.c===t.c && u.r===t.r && !u.dead && u.side==='enemy'));
      S.moveTargets = [];

      // 捕縛チェック
      const boss = S.units.find(u => u.isBoss && !u.dead);
      if (boss) {
        const dist = Math.abs(unit.c - boss.c) + Math.abs(unit.r - boss.r);
        S.canCapture = boss.hp <= Math.ceil(boss.maxHp * 0.3) && dist <= unit.rng;
      }
      _hudUpdate();
      return;
    }

    // 自ユニット選択
    if (clicked && clicked.side==='player' && !clicked.hasActed) {
      S.selected = clicked.id;
      S.moveTargets = _getMoveRange(clicked);
      S.attackTargets = []; S.pendingMove = null; S.canCapture = false;
      _hudUpdate();
      return;
    }

    // 選択解除
    S.selected = null; S.moveTargets = []; S.attackTargets = []; S.pendingMove = null;
    S.canCapture = false;
    _hudUpdate();
  }

  // ── 移動・攻撃範囲計算 ────────────────────────────────
  function _getMoveRange(unit) {
    const visited = new Map([[`${unit.c},${unit.r}`, 0]]);
    const queue   = [{c:unit.c, r:unit.r, steps:0}];
    const result  = [];
    while (queue.length) {
      const cur = queue.shift();
      result.push({c:cur.c, r:cur.r});
      if (cur.steps >= unit.mov) continue;
      for (const [dc, dr] of DIRS) {
        const nc = cur.c+dc, nr = cur.r+dr;
        if (nc<0||nc>=COLS||nr<0||nr>=ROWS) continue;
        const key = `${nc},${nr}`;
        if (visited.has(key)) continue;
        if (S.units.find(u => u.c===nc && u.r===nr && !u.dead && u.side==='enemy')) continue;
        visited.set(key, cur.steps+1);
        queue.push({c:nc, r:nr, steps:cur.steps+1});
      }
    }
    return result;
  }

  function _getAttackCells(unit) {
    const visited = new Set([`${unit.c},${unit.r}`]);
    const queue   = [{c:unit.c, r:unit.r, steps:0}];
    const result  = [];
    while (queue.length) {
      const cur = queue.shift();
      if (cur.steps > 0) result.push({c:cur.c, r:cur.r});
      if (cur.steps >= unit.rng) continue;
      for (const [dc, dr] of DIRS) {
        const nc = cur.c+dc, nr = cur.r+dr;
        if (nc<0||nc>=COLS||nr<0||nr>=ROWS) continue;
        const key = `${nc},${nr}`;
        if (visited.has(key)) continue;
        visited.add(key);
        queue.push({c:nc, r:nr, steps:cur.steps+1});
      }
    }
    return result;
  }

  // ── 戦闘計算 ──────────────────────────────────────────
  function _combat(attacker, defender) {
    const atkDmg = Math.max(1, attacker.atk - defender.def);
    defender.hp  = Math.max(0, defender.hp - atkDmg);

    let defDmg = 0;
    const dist = Math.abs(attacker.c - defender.c) + Math.abs(attacker.r - defender.r);
    if (defender.hp > 0 && dist <= defender.rng) {
      defDmg = Math.max(1, defender.atk - attacker.def);
      attacker.hp = Math.max(0, attacker.hp - defDmg);
    }

    // 二回攻撃（SPD差4以上）
    if (attacker.spd >= defender.spd + 4 && defender.hp > 0) {
      defender.hp = Math.max(0, defender.hp - atkDmg);
    } else if (defender.hp > 0 && attacker.hp > 0 && defender.spd >= attacker.spd + 4) {
      attacker.hp = Math.max(0, attacker.hp - defDmg);
    }

    if (defender.hp <= 0) defender.dead = true;
    if (attacker.hp <= 0) attacker.dead = true;

    if (S._combatLogTimer) clearTimeout(S._combatLogTimer);
    S.combatLog = { attacker, defender, atkDmg, defDmg };
    S._combatLogTimer = setTimeout(() => { if (S) { S.combatLog = null; S._combatLogTimer = null; } }, 2200);

    // ボス捕縛可能チェック
    if (defender.isBoss && defender.hp <= Math.ceil(defender.maxHp * 0.3)) {
      _cb.onBossCaptureable && _cb.onBossCaptureable({ boss: defender });
    }

    // 指揮官死亡 → 即敗北
    if (attacker.isCommander && attacker.dead) { _endBattle(false); return; }
    if (defender.isCommander && defender.dead) { _endBattle(false); return; }

    _cb.onCombat && _cb.onCombat({ attacker, defender, atkDmg, defDmg });
  }

  function _checkAllActed() {
    const alive = S.units.filter(u => u.side==='player' && !u.dead);
    if (alive.length === 0) { _endBattle(false); return; }
    if (alive.every(u => u.hasActed)) {
      _cb.onAllActed && _cb.onAllActed();
    }
  }

  // ── 敵フェーズ AI ────────────────────────────────────
  function _doEnemyPhase() {
    if (!S) return;
    const enemies = S.units.filter(u => u.side==='enemy' && !u.dead);
    const players = () => S.units.filter(u => u.side==='player' && !u.dead);

    for (const enemy of enemies) {
      if (!S || S.phase !== 'enemy') return;
      const targets = players();
      if (targets.length === 0) { _endBattle(true); return; }

      // 最近のプレイヤーを探す
      let closest = targets.reduce((a,b) =>
        (Math.abs(a.c-enemy.c)+Math.abs(a.r-enemy.r)) <=
        (Math.abs(b.c-enemy.c)+Math.abs(b.r-enemy.r)) ? a : b
      );

      // 攻撃範囲内か確認
      const dist = Math.abs(enemy.c - closest.c) + Math.abs(enemy.r - closest.r);
      if (dist > enemy.rng) {
        // 接近する
        const dest = _pathfindToward(enemy, closest, enemy.mov);
        if (dest) { enemy.c = dest.c; enemy.r = dest.r; }
      }

      // 移動後に攻撃可能か
      const dist2 = Math.abs(enemy.c - closest.c) + Math.abs(enemy.r - closest.r);
      if (dist2 <= enemy.rng) {
        _combat(enemy, closest);
        if (!S) return;
        if (closest.dead) {
          _cb.onPlayerUnitDefeated && _cb.onPlayerUnitDefeated({ unit: closest });
          if (closest.isCommander) return; // _endBattle already called
        }
      }
    }

    if (!S) return;
    // 敵全滅チェック
    if (S.units.filter(u=>u.side==='enemy'&&!u.dead).length===0) { _endBattle(true); return; }

    // プレイヤーフェーズへ
    S.phase = 'player';
    S.turnNum++;
    S.units.filter(u => !u.dead).forEach(u => { u.hasMoved = false; u.hasActed = false; });
    S.selected = null; S.moveTargets = []; S.attackTargets = []; S.pendingMove = null;
    _cb.onPlayerPhaseStart && _cb.onPlayerPhaseStart({ turn: S.turnNum });
    _hudUpdate();
  }

  function _pathfindToward(unit, target, maxMov) {
    const blocked = new Set(
      S.units.filter(u => !u.dead && u.id!==unit.id).map(u=>`${u.c},${u.r}`)
    );
    const visited = new Map([[`${unit.c},${unit.r}`,0]]);
    const queue   = [{c:unit.c, r:unit.r, steps:0}];
    let best = null, bestDist = Infinity;
    while (queue.length) {
      const cur = queue.shift();
      if (cur.c!==unit.c||cur.r!==unit.r) {
        const d = Math.abs(cur.c-target.c)+Math.abs(cur.r-target.r);
        if (d<bestDist) { bestDist=d; best=cur; }
      }
      if (cur.steps>=maxMov) continue;
      for (const [dc,dr] of DIRS) {
        const nc=cur.c+dc, nr=cur.r+dr;
        if (nc<0||nc>=COLS||nr<0||nr>=ROWS) continue;
        const key=`${nc},${nr}`;
        if (visited.has(key)) continue;
        if (blocked.has(key)) continue;
        visited.set(key, cur.steps+1);
        queue.push({c:nc, r:nr, steps:cur.steps+1});
      }
    }
    return best;
  }

  function _defaultLayout() {
    return [
      {type:'grunt', c:6,r:1},{type:'grunt', c:6,r:5},
      {type:'grunt', c:7,r:2},{type:'grunt', c:7,r:4},
      {type:'archer',c:5,r:3},{type:'archer',c:7,r:0},
      {type:'elite', c:8,r:1},{type:'elite', c:8,r:5},
      {type:'heavy', c:8,r:3},
    ];
  }

  function _endBattle(victory) {
    S.phase = victory ? 'victory' : 'defeat';
    _hudUpdate();
    setTimeout(() => {
      const survivors = S ? S.units.filter(u=>u.side==='player'&&!u.dead) : [];
      stopBattle();
      _cb.onBattleEnd && _cb.onBattleEnd({ victory, survivors });
    }, 700);
  }

  // ── 描画 ──────────────────────────────────────────────
  function _drawLoop() {
    if (!S) return;
    _draw();
    _raf = requestAnimationFrame(_drawLoop);
  }

  function _draw() {
    if (!S || !_ctx) return;
    const W  = _canvas.width, H = _canvas.height;
    const cs = S.cellSize, ox = S.offsetX, oy = S.offsetY;

    _ctx.clearRect(0, 0, W, H);

    // 背景
    _ctx.fillStyle = '#0e1a0e';
    _ctx.fillRect(0, 0, W, H);

    // グリッドセル
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = ox + c*cs, y = oy + r*cs;
        _ctx.fillStyle = (c+r)%2===0 ? '#1e2e14' : '#192610';
        _ctx.fillRect(x, y, cs, cs);
        _ctx.strokeStyle = 'rgba(80,120,40,0.4)';
        _ctx.strokeRect(x, y, cs, cs);
      }
    }

    // 移動範囲（青）
    _ctx.fillStyle = 'rgba(50,130,255,0.32)';
    for (const t of S.moveTargets) {
      _ctx.fillRect(ox+t.c*cs+1, oy+t.r*cs+1, cs-2, cs-2);
    }

    // 攻撃範囲（赤）
    _ctx.fillStyle = 'rgba(255,60,60,0.42)';
    for (const t of S.attackTargets) {
      _ctx.fillRect(ox+t.c*cs+1, oy+t.r*cs+1, cs-2, cs-2);
    }

    // ホバー
    if (S.hoverCell && S.hoverCell.c>=0 && S.hoverCell.c<COLS && S.hoverCell.r>=0 && S.hoverCell.r<ROWS) {
      _ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      _ctx.lineWidth   = 2;
      _ctx.strokeRect(ox+S.hoverCell.c*cs+1, oy+S.hoverCell.r*cs+1, cs-2, cs-2);
      _ctx.lineWidth = 1;
    }

    // ユニット描画
    for (const unit of S.units) {
      if (unit.dead) continue;
      const x = ox + unit.c*cs + cs*0.5;
      const y = oy + unit.r*cs + cs*0.5;
      const r = cs * 0.36;

      // 選択リング
      const isSelected = unit.id===S.selected || (S.pendingMove&&S.pendingMove.unitId===unit.id);
      if (isSelected) {
        _ctx.strokeStyle = '#FFFFFF';
        _ctx.lineWidth   = 3;
        _ctx.beginPath(); _ctx.arc(x, y, r+3, 0, Math.PI*2); _ctx.stroke();
        _ctx.lineWidth   = 1;
      }

      // 捕縛可能ボスの輝き
      if (unit.isBoss && unit.hp <= Math.ceil(unit.maxHp*0.3)) {
        _ctx.strokeStyle = '#FFD700';
        _ctx.lineWidth   = 3;
        _ctx.setLineDash([4,4]);
        _ctx.beginPath(); _ctx.arc(x, y, r+5, 0, Math.PI*2); _ctx.stroke();
        _ctx.setLineDash([]);
        _ctx.lineWidth = 1;
      }

      // 本体（円）
      _ctx.fillStyle = unit.hasActed && unit.side==='player' ? '#445544' : unit.color;
      _ctx.beginPath(); _ctx.arc(x, y, r, 0, Math.PI*2); _ctx.fill();

      // 絵文字
      const emojiSz = Math.floor(cs * 0.44);
      _ctx.font = `${emojiSz}px sans-serif`;
      _ctx.textAlign = 'center'; _ctx.textBaseline = 'middle';
      _ctx.fillText(unit.emoji, x, y);

      // HPバー
      const hpPct = unit.hp / unit.maxHp;
      const bw = cs*0.75, bh = Math.max(4, cs*0.07);
      const bx = x - bw*0.5, by = y + r + 3;
      _ctx.fillStyle = '#222'; _ctx.fillRect(bx, by, bw, bh);
      _ctx.fillStyle = hpPct>0.5 ? '#4CFF7A' : hpPct>0.25 ? '#FFD700' : '#FF4444';
      _ctx.fillRect(bx, by, bw*hpPct, bh);
    }

    // 戦闘ログ
    if (S.combatLog) {
      const log = S.combatLog;
      const lw  = Math.min(300, W*0.7);
      const lx  = (W-lw)*0.5, ly = oy - 60;
      _ctx.fillStyle = 'rgba(0,0,0,0.82)';
      _ctx.fillRect(lx, ly, lw, 52);
      _ctx.strokeStyle = '#FFD700'; _ctx.lineWidth = 1.5;
      _ctx.strokeRect(lx, ly, lw, 52); _ctx.lineWidth = 1;
      _ctx.fillStyle = '#FFF'; _ctx.font = 'bold 13px sans-serif'; _ctx.textAlign = 'center';
      const atkLabel = log.atkDmg < 0 ? `${log.attacker.name}  +${-log.atkDmg}HP回復` : `${log.attacker.name} → ${log.defender.name}  -${log.atkDmg}`;
      _ctx.fillText(atkLabel, W*0.5, ly+20);
      if (log.defDmg > 0) _ctx.fillText(`${log.defender.name} → ${log.attacker.name}  -${log.defDmg}`, W*0.5, ly+40);
      _ctx.textAlign = 'left';
    }

    // フェーズ表示オーバーレイ
    if (S.phase === 'enemy') {
      _ctx.fillStyle = 'rgba(180,20,20,0.18)';
      _ctx.fillRect(0, 0, W, H);
      _ctx.fillStyle = 'rgba(180,20,20,0.75)';
      _ctx.font = `bold ${Math.min(36, cs*0.5)}px sans-serif`;
      _ctx.textAlign = 'center'; _ctx.textBaseline = 'middle';
      _ctx.fillText('敵フェーズ', W*0.5, oy - 25);
      _ctx.textAlign = 'left'; _ctx.textBaseline = 'alphabetic';
    }
  }

  function _hudUpdate() {
    if (!_cb.onHUDUpdate) return;
    _cb.onHUDUpdate({
      phase:       S ? S.phase : 'player',
      turnNum:     S ? S.turnNum : 1,
      units:       S ? S.units  : [],
      selected:    S ? (S.pendingMove ? S.pendingMove.unitId : S.selected) : null,
      pendingMove: S ? S.pendingMove : null,
      canCapture:  S ? S.canCapture  : false,
      enemyCount:  S ? S.units.filter(u=>u.side==='enemy'&&!u.dead).length : 0,
    });
  }

  return { startBattle, stopBattle, endPlayerTurn, selectWait, doCapture, useBattleItem, getState };
})();
