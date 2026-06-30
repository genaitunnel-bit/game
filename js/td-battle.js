/* ======================================================
   js/td-battle.js  —  タワーディフェンス戦闘エンジン
   ====================================================== */
"use strict";

const TDBattle = (() => {

  // ──────────────────────────────────────
  // グリッド定数
  // ──────────────────────────────────────
  const COLS = 22, ROWS = 13;

  // ──────────────────────────────────────
  // タワー定義
  // ──────────────────────────────────────
  const TOWER_DEFS = {
    archer: { name:'弓兵',   icon:'🏹', cost:60,  color:'#5090C0', range:3.5, dmg:15,  rate:1.5, aoe:0,   slow:0,   desc:'遠距離・単体攻撃。基本タワー。' },
    mage:   { name:'魔術師', icon:'🔮', cost:120, color:'#9060C0', range:2.5, dmg:50,  rate:0.6, aoe:1.2, slow:0,   desc:'中距離・範囲魔法。密集した敵に有効。' },
    ice:    { name:'氷術師', icon:'❄️',  cost:90,  color:'#60C0D0', range:2.5, dmg:10,  rate:1.0, aoe:0,   slow:0.5, desc:'敵の移動速度を50%低下させる。' },
    cannon: { name:'大砲',   icon:'💣', cost:200, color:'#C09020', range:2.2, dmg:100, rate:0.3, aoe:1.5, slow:0,   desc:'超威力・超範囲爆発。ボス特効。' },
  };

  // ──────────────────────────────────────
  // 敵タイプ定義
  // ──────────────────────────────────────
  const ENEMY_DEFS = {
    grunt:  { name:'雑魚兵', hp:60,   speed:55, gold:5,   color:'#FF5050', size:10, icon:'💀', isBoss:false },
    elite:  { name:'精鋭兵', hp:160,  speed:40, gold:15,  color:'#FF8820', size:13, icon:'⚔️',  isBoss:false },
    heavy:  { name:'重装兵', hp:450,  speed:25, gold:28,  color:'#AA4400', size:16, icon:'🛡️', isBoss:false },
    boss:   { name:'ボス',   hp:1200, speed:20, gold:120, color:'#FF40FF', size:20, icon:'👑', isBoss:true  },
  };

  // ──────────────────────────────────────
  // 拠点別パス定義（グリッド座標）
  // ──────────────────────────────────────
  function makePath(segments) {
    const pts = [];
    for (let s = 0; s < segments.length - 1; s++) {
      const [c0, r0] = segments[s];
      const [c1, r1] = segments[s + 1];
      const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
      let c = c0, r = r0;
      while (c !== c1 || r !== r0 + dr * Math.abs(r1 - r0) || (c === c1 && r === r1) === false) {
        if (!pts.find(p => p.c === c && p.r === r)) pts.push({ c, r });
        if (c !== c1) c += dc;
        else if (r !== r1) r += dr;
        if (c === c1 && r === r1) break;
      }
      if (!pts.find(p => p.c === c1 && p.r === r1)) pts.push({ c: c1, r: r1 });
    }
    return pts;
  }

  const LOCATION_PATHS = {
    outpost: makePath([
      [0,6],[4,6],[4,2],[10,2],[10,9],[16,9],[16,3],[21,3]
    ]),
    front_base: makePath([
      [0,3],[5,3],[5,10],[10,10],[10,1],[16,1],[16,11],[21,11]
    ]),
    supply_base: makePath([
      [0,9],[4,9],[4,3],[12,3],[12,10],[17,10],[17,2],[21,2]
    ]),
    hq: makePath([
      [0,6],[2,6],[2,1],[8,1],[8,11],[14,11],[14,1],[21,1]
    ]),
    final_bastion: makePath([
      [0,6],[2,6],[2,2],[6,2],[6,10],[12,10],[12,1],[16,1],[16,11],[21,11]
    ]),
  };

  // ──────────────────────────────────────
  // 状態変数
  // ──────────────────────────────────────
  let _canvas, _ctx, _raf = null;
  let S = null;
  let _cb = {};
  let _uid = 0;

  // ──────────────────────────────────────
  // Public API
  // ──────────────────────────────────────
  function startBattle(canvasEl, config, callbacks) {
    _canvas = canvasEl;
    _ctx    = canvasEl.getContext('2d');
    _cb     = callbacks || {};

    _canvas.width  = window.innerWidth;
    _canvas.height = Math.floor(window.innerHeight * 0.62);
    _canvas.style.display = 'block';
    _canvas.style.cursor  = 'crosshair';

    const path    = LOCATION_PATHS[config.locationId] || LOCATION_PATHS.outpost;
    const pathSet = new Set(path.map(p => `${p.c},${p.r}`));

    S = {
      locationId:   config.locationId,
      angel:        config.angel,
      waves:        config.waves,
      waveIdx:      -1,
      phase:        'prep',  // prep | wave | between | victory | defeat
      prepTimer:    config.waves[0].prepTime || 30,

      gold:         config.startGold || 200,
      baseHp:       config.baseHp    || 20,
      baseMaxHp:    config.baseHp    || 20,

      cellW: _canvas.width  / COLS,
      cellH: _canvas.height / ROWS,
      path, pathSet,

      towers:      [],
      enemies:     [],
      projectiles: [],
      effects:     [],
      floatTexts:  [],
      spawnQueue:  [],
      spawnTimer:  0,

      selectedType: null,
      hoverCell:    null,

      intelEffects: config.intelEffects || {},
      dropBoostMult: config.dropBoostMult || 1,

      stats: { killed:0, goldEarned:0, bossCaptured:false },
      lastTime: 0,
    };

    _canvas.onclick     = _onCanvasClick;
    _canvas.onmousemove = _onMouseMove;

    if (_raf) cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(_loop);
    _hudUpdate();
  }

  function stopBattle() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_canvas) {
      _canvas.style.display = 'none';
      _canvas.onclick = null;
      _canvas.onmousemove = null;
      _canvas.style.cursor = 'default';
    }
    S = null;
  }

  function selectTowerType(type) {
    if (!S) return;
    S.selectedType = (S.selectedType === type) ? null : type;
    _hudUpdate();
  }

  function startWaveEarly() {
    if (!S) return;
    if (S.phase === 'prep' || S.phase === 'between') _advanceWave();
  }

  function useBattleItem(itemId) {
    if (!S) return;
    if (itemId === 'bomb') {
      // Damage all enemies on screen
      for (const e of S.enemies) {
        _damageEnemy(e, 200, 0);
      }
      _addFloat(_canvas.width/2, _canvas.height/2, '💣 爆弾！', '#FFD700', 1200, 20);
    } else if (itemId === 'heal_kit') {
      S.baseHp = Math.min(S.baseMaxHp, S.baseHp + 3);
      _addFloat(_canvas.width - 60, _canvas.height * 0.5, '+3 HP', '#5EFF9E', 1000);
      _hudUpdate();
    }
  }

  function getTowerDefs() { return TOWER_DEFS; }
  function getState()     { return S; }

  // ──────────────────────────────────────
  // Game Loop
  // ──────────────────────────────────────
  function _loop(now) {
    if (!S) return;
    const dt = Math.min(now - (S.lastTime || now), 50);
    S.lastTime = now;
    _update(dt, now);
    _draw(now);
    if (S.phase !== 'victory' && S.phase !== 'defeat') {
      _raf = requestAnimationFrame(_loop);
    }
  }

  // ──────────────────────────────────────
  // Update
  // ──────────────────────────────────────
  function _update(dt, now) {
    const sec = dt / 1000;

    // Phase timers
    if (S.phase === 'prep' || S.phase === 'between') {
      S.prepTimer -= sec;
      _hudUpdate();
      if (S.prepTimer <= 0) _advanceWave();
    }

    // Wave spawning
    if (S.phase === 'wave') {
      S.spawnTimer -= sec;
      if (S.spawnTimer <= 0 && S.spawnQueue.length > 0) {
        _spawnEnemy(S.spawnQueue.shift());
        S.spawnTimer = S.spawnQueue.length > 0 ? (S.spawnQueue[0].delay || 0) : 0;
      }
      if (S.spawnQueue.length === 0 && S.enemies.length === 0) {
        _waveComplete();
      }
    }

    _updateEnemies(sec);
    _updateTowers(sec);
    _updateProjectiles(sec);

    // Effects & floats
    S.effects    = S.effects.filter(ef => { ef.life -= dt; return ef.life > 0; });
    S.floatTexts = S.floatTexts.filter(ft => {
      ft.life -= dt; ft.y -= 40 * sec; ft.alpha = Math.max(0, ft.life / ft.maxLife);
      return ft.life > 0;
    });
  }

  function _advanceWave() {
    S.waveIdx++;
    if (S.waveIdx >= S.waves.length) { _endBattle(true); return; }
    const wd = S.waves[S.waveIdx];
    S.phase = 'wave';
    S.spawnQueue = _buildQueue(wd);
    S.spawnTimer = 0;
    _hudUpdate();
    _cb.onWaveStart && _cb.onWaveStart({ wave: S.waveIdx + 1, total: S.waves.length });
  }

  function _waveComplete() {
    if (S.waveIdx >= S.waves.length - 1) { _endBattle(true); return; }
    const nextPrep = S.waves[S.waveIdx + 1].prepTime || 20;
    S.phase = 'between';
    S.prepTimer = nextPrep;
    _hudUpdate();
    _cb.onWaveClear && _cb.onWaveClear({ wave: S.waveIdx + 1, total: S.waves.length, prepTimer: nextPrep });
  }

  function _endBattle(victory) {
    S.phase = victory ? 'victory' : 'defeat';
    setTimeout(() => {
      stopBattle();
      _cb.onBattleEnd && _cb.onBattleEnd({ victory, stats: S ? S.stats : {}, dropBoostMult: S ? S.dropBoostMult : 1 });
    }, 800);
  }

  function _buildQueue(waveData) {
    const q = [];
    for (const grp of waveData.enemies) {
      const interval = grp.spawnInterval || 1.5;
      for (let i = 0; i < grp.count; i++) {
        q.push({ type: grp.type, bossAngelId: grp.bossAngelId || null, hpMod: grp.hpMod || 1, delay: i * interval });
      }
    }
    return q;
  }

  // ──────────────────────────────────────
  // Enemies
  // ──────────────────────────────────────
  function _spawnEnemy(spec) {
    const def = ENEMY_DEFS[spec.type] || ENEMY_DEFS.grunt;
    const hp  = Math.round(def.hp * spec.hpMod);
    S.enemies.push({
      id: ++_uid, type: spec.type, bossAngelId: spec.bossAngelId,
      isBoss: def.isBoss, pathIdx: 0, pathFrac: 0,
      hp, maxHp: hp, speed: def.speed, baseSpeed: def.speed,
      slowTimer: 0, gold: def.gold, color: def.color, size: def.size, icon: def.icon,
      dead: false,
    });
  }

  function _updateEnemies(sec) {
    for (const e of S.enemies) {
      if (e.dead) continue;
      if (e.slowTimer > 0) { e.slowTimer -= sec; if (e.slowTimer <= 0) e.speed = e.baseSpeed; }
      _moveEnemy(e, e.speed * sec);
      // Reached base
      if (e.pathIdx >= S.path.length - 1 && e.pathFrac >= 0.99) {
        S.baseHp = Math.max(0, S.baseHp - (e.isBoss ? 5 : 1));
        _addFloat(_canvas.width - 40, _canvas.height * 0.4, e.isBoss ? '-5 BASE' : '-1', '#FF5E7A', 800);
        e.dead = true;
        _hudUpdate();
        if (S.baseHp <= 0) { _endBattle(false); return; }
      }
    }
    S.enemies = S.enemies.filter(e => !e.dead);
  }

  function _moveEnemy(e, pixels) {
    let rem = pixels;
    while (rem > 0 && e.pathIdx < S.path.length - 1) {
      const cur  = S.path[e.pathIdx];
      const nxt  = S.path[Math.min(e.pathIdx + 1, S.path.length - 1)];
      const cx = cur.c * S.cellW + S.cellW/2, cy = cur.r * S.cellH + S.cellH/2;
      const nx = nxt.c * S.cellW + S.cellW/2, ny = nxt.r * S.cellH + S.cellH/2;
      const seg = Math.hypot(nx - cx, ny - cy);
      const done = seg - e.pathFrac * seg;
      if (rem >= done) { rem -= done; e.pathIdx++; e.pathFrac = 0; }
      else { e.pathFrac += rem / seg; rem = 0; }
    }
  }

  function _enemyPos(e) {
    if (e.pathIdx >= S.path.length - 1) {
      const p = S.path[S.path.length - 1];
      return { x: p.c * S.cellW + S.cellW/2, y: p.r * S.cellH + S.cellH/2 };
    }
    const cur = S.path[e.pathIdx];
    const nxt = S.path[e.pathIdx + 1];
    return {
      x: (cur.c + (nxt.c - cur.c) * e.pathFrac) * S.cellW + S.cellW/2,
      y: (cur.r + (nxt.r - cur.r) * e.pathFrac) * S.cellH + S.cellH/2,
    };
  }

  // ──────────────────────────────────────
  // Towers
  // ──────────────────────────────────────
  function _canPlace(c, r) {
    if (!S || c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    if (S.pathSet.has(`${c},${r}`)) return false;
    if (S.towers.some(t => t.c === c && t.r === r)) return false;
    return true;
  }

  function _placeTower(c, r, type) {
    const def  = TOWER_DEFS[type]; if (!def) return false;
    const cost = Math.round(def.cost * (S.intelEffects.cheaperTowers ? 0.8 : 1));
    if (S.gold < cost) return false;
    S.gold -= cost;
    S.towers.push({ id:++_uid, type, c, r, def, cooldown:0, level:1 });
    _hudUpdate();
    return true;
  }

  function _updateTowers(sec) {
    for (const t of S.towers) {
      if ((t.cooldown -= sec) > 0) continue;
      const tx = t.c * S.cellW + S.cellW/2, ty = t.r * S.cellH + S.cellH/2;
      const rng = t.def.range * S.cellW * (t.rangeBonus || 1);
      let best = null, bestProg = -1;
      for (const e of S.enemies) {
        if (e.dead) continue;
        const ep = _enemyPos(e);
        if (Math.hypot(ep.x - tx, ep.y - ty) <= rng) {
          const prog = e.pathIdx + e.pathFrac;
          if (prog > bestProg) { bestProg = prog; best = e; }
        }
      }
      if (best) { _fireProjectile(t, best); t.cooldown = 1 / (t.def.rate * (t.rateBonus || 1)); }
    }
  }

  function _fireProjectile(tower, target) {
    const tx = tower.c * S.cellW + S.cellW/2, ty = tower.r * S.cellH + S.cellH/2;
    S.projectiles.push({
      id: ++_uid, x: tx, y: ty,
      targetId: target.id,
      dmg: Math.round(tower.def.dmg * (tower.dmgBonus || 1)),
      aoe: tower.def.aoe || 0,
      slow: tower.def.slow || 0,
      speed: 280, color: tower.def.color, done: false,
    });
  }

  function _updateProjectiles(sec) {
    for (const p of S.projectiles) {
      if (p.done) continue;
      const tgt = S.enemies.find(e => e.id === p.targetId && !e.dead);
      if (!tgt) { p.done = true; continue; }
      const tp = _enemyPos(tgt);
      const dx = tp.x - p.x, dy = tp.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= p.speed * sec) {
        _hitEnemy(tgt, p); p.done = true;
      } else {
        const step = p.speed * sec / dist;
        p.x += dx * step; p.y += dy * step;
      }
    }
    S.projectiles = S.projectiles.filter(p => !p.done);
  }

  function _hitEnemy(target, proj) {
    const tp = _enemyPos(target);
    if (proj.aoe > 0) {
      const r = proj.aoe * S.cellW;
      S.enemies.filter(e => !e.dead && Math.hypot(_enemyPos(e).x - tp.x, _enemyPos(e).y - tp.y) <= r)
               .forEach(e => _damageEnemy(e, proj.dmg, proj.slow));
      S.effects.push({ type:'explosion', x:tp.x, y:tp.y, r, life:300, maxLife:300 });
    } else {
      _damageEnemy(target, proj.dmg, proj.slow);
    }
  }

  function _damageEnemy(e, dmg, slow) {
    if (e.dead) return;
    if (e.isBoss && S.intelEffects.bossWeakness) dmg = Math.round(dmg * 1.6);
    e.hp -= dmg;
    const p = _enemyPos(e);
    _addFloat(p.x, p.y, `-${dmg}`, e.isBoss ? '#FFD700' : '#FFF', 500);
    if (slow > 0) { e.speed = Math.round(e.baseSpeed * (1 - slow)); e.slowTimer = 2.5; }
    if (e.hp <= 0) _killEnemy(e);
  }

  function _killEnemy(e) {
    const p = _enemyPos(e);
    e.dead = true;
    S.gold += e.gold; S.stats.killed++; S.stats.goldEarned += e.gold;
    _addFloat(p.x, p.y - 14, `+${e.gold}G`, '#FFD700', 900);
    S.effects.push({ type:'death', x:p.x, y:p.y, r:0, life:400, maxLife:400 });
    if (e.isBoss) {
      S.stats.bossCaptured = true;
      setTimeout(() => _cb.onBossKilled && _cb.onBossKilled({ angelId: e.bossAngelId, dropBoostMult: S.dropBoostMult }), 600);
    }
    _hudUpdate();
  }

  // ──────────────────────────────────────
  // Drawing
  // ──────────────────────────────────────
  function _draw(now) {
    const w = _canvas.width, h = _canvas.height;
    _ctx.clearRect(0, 0, w, h);
    _drawBg(w, h);
    _drawPath();
    _drawGrid(w, h);
    _drawBase();
    _drawEntry();
    _drawEffects();
    _drawTowers();
    _drawHoverPreview();
    _drawProjectiles();
    _drawEnemies(now);
    _drawFloats();
    if (S.phase === 'prep' || S.phase === 'between') _drawPrepBanner(w, h);
  }

  function _drawBg(w, h) {
    const g = _ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#0a1520'); g.addColorStop(1,'#0e0a18');
    _ctx.fillStyle = g; _ctx.fillRect(0,0,w,h);
  }

  function _drawGrid(w, h) {
    _ctx.strokeStyle = 'rgba(255,255,255,0.04)'; _ctx.lineWidth = 0.5;
    for (let c=0; c<=COLS; c++) { _ctx.beginPath(); _ctx.moveTo(c*S.cellW,0); _ctx.lineTo(c*S.cellW,h); _ctx.stroke(); }
    for (let r=0; r<=ROWS; r++) { _ctx.beginPath(); _ctx.moveTo(0,r*S.cellH); _ctx.lineTo(w,r*S.cellH); _ctx.stroke(); }
  }

  function _drawPath() {
    for (let i=0; i<S.path.length; i++) {
      const { c, r } = S.path[i];
      _ctx.fillStyle = 'rgba(100,60,10,0.55)';
      _ctx.fillRect(c*S.cellW+1, r*S.cellH+1, S.cellW-2, S.cellH-2);
    }
    _ctx.fillStyle = 'rgba(255,200,80,0.2)';
    _ctx.font = `${Math.floor(S.cellH*0.45)}px sans-serif`;
    _ctx.textAlign = 'center'; _ctx.textBaseline = 'middle';
    for (let i=0; i<S.path.length-1; i+=4) {
      const a=S.path[i], b=S.path[i+1];
      const arrow = b.c>a.c?'→':b.c<a.c?'←':b.r>a.r?'↓':'↑';
      _ctx.fillText(arrow, a.c*S.cellW+S.cellW/2, a.r*S.cellH+S.cellH/2);
    }
    _ctx.textAlign = 'left';
  }

  function _drawTowers() {
    for (const t of S.towers) {
      const x=t.c*S.cellW, y=t.r*S.cellH, cw=S.cellW, ch=S.cellH;
      _ctx.fillStyle = t.def.color + 'BB';
      _ctx.beginPath(); _ctx.roundRect(x+3,y+3,cw-6,ch-6,5); _ctx.fill();
      _ctx.strokeStyle = t.def.color; _ctx.lineWidth = 1.5;
      _ctx.beginPath(); _ctx.roundRect(x+3,y+3,cw-6,ch-6,5); _ctx.stroke();
      _ctx.font = `${Math.floor(Math.min(cw,ch)*0.48)}px sans-serif`;
      _ctx.textAlign = 'center'; _ctx.textBaseline = 'middle';
      _ctx.fillText(t.def.icon, x+cw/2, y+ch/2);
      _ctx.textAlign = 'left';
    }
  }

  function _drawHoverPreview() {
    if (!S.selectedType || !S.hoverCell) return;
    const { c, r } = S.hoverCell;
    const ok = _canPlace(c, r);
    const x=c*S.cellW, y=r*S.cellH;
    _ctx.fillStyle = ok ? 'rgba(94,255,158,0.18)' : 'rgba(255,94,94,0.18)';
    _ctx.fillRect(x,y,S.cellW,S.cellH);
    _ctx.strokeStyle = ok ? '#5EFF9E' : '#FF5E7A'; _ctx.lineWidth = 2;
    _ctx.strokeRect(x,y,S.cellW,S.cellH);
    if (ok && TOWER_DEFS[S.selectedType]) {
      _ctx.strokeStyle = 'rgba(200,159,255,0.3)'; _ctx.lineWidth = 1;
      _ctx.beginPath();
      _ctx.arc(x+S.cellW/2, y+S.cellH/2, TOWER_DEFS[S.selectedType].range*S.cellW, 0, Math.PI*2);
      _ctx.stroke();
    }
  }

  function _drawEnemies(now) {
    for (const e of S.enemies) {
      if (e.dead) continue;
      const p = _enemyPos(e), r = e.size;
      _ctx.fillStyle = 'rgba(0,0,0,0.25)';
      _ctx.beginPath(); _ctx.ellipse(p.x, p.y+r*0.8, r*0.75, r*0.28, 0, 0, Math.PI*2); _ctx.fill();
      if (e.isBoss) {
        _ctx.shadowColor = e.color; _ctx.shadowBlur = 14 + Math.sin(now*0.005)*6;
      }
      _ctx.fillStyle = e.slowTimer > 0 ? '#9AD8FF' : e.color;
      _ctx.beginPath(); _ctx.arc(p.x, p.y, r, 0, Math.PI*2); _ctx.fill();
      if (e.isBoss) { _ctx.shadowBlur = 0; }
      _ctx.font = `${Math.floor(r*1.1)}px sans-serif`;
      _ctx.textAlign = 'center'; _ctx.textBaseline = 'middle';
      _ctx.fillText(e.icon, p.x, p.y);
      _ctx.textAlign = 'left';
      // HP bar
      const bw=r*2.6, bh=4, bx=p.x-bw/2, by=p.y-r-8;
      _ctx.fillStyle = '#222'; _ctx.fillRect(bx,by,bw,bh);
      const pct = Math.max(0, e.hp/e.maxHp);
      _ctx.fillStyle = pct>0.5?'#5EFF9E':pct>0.25?'#FFD700':'#FF5E7A';
      _ctx.fillRect(bx,by,bw*pct,bh);
    }
  }

  function _drawProjectiles() {
    for (const p of S.projectiles) {
      _ctx.fillStyle = p.color;
      _ctx.beginPath(); _ctx.arc(p.x, p.y, 4, 0, Math.PI*2); _ctx.fill();
    }
  }

  function _drawEffects() {
    for (const ef of S.effects) {
      const pct = 1 - ef.life/ef.maxLife;
      if (ef.type === 'explosion') {
        _ctx.strokeStyle = `rgba(255,180,50,${(1-pct)*0.8})`; _ctx.lineWidth = 2;
        _ctx.beginPath(); _ctx.arc(ef.x, ef.y, ef.r*pct, 0, Math.PI*2); _ctx.stroke();
      } else if (ef.type === 'death') {
        _ctx.fillStyle = `rgba(255,100,50,${(1-pct)*0.7})`;
        for (let i=0;i<5;i++) {
          const a=(i/5)*Math.PI*2;
          _ctx.beginPath(); _ctx.arc(ef.x+Math.cos(a)*pct*22, ef.y+Math.sin(a)*pct*22, 3*(1-pct), 0, Math.PI*2); _ctx.fill();
        }
      }
    }
  }

  function _drawFloats() {
    for (const ft of S.floatTexts) {
      _ctx.globalAlpha = ft.alpha;
      _ctx.font = `bold ${ft.size||14}px sans-serif`;
      _ctx.textAlign = 'center';
      _ctx.strokeStyle='#000'; _ctx.lineWidth=2;
      _ctx.strokeText(ft.text, ft.x, ft.y);
      _ctx.fillStyle = ft.color; _ctx.fillText(ft.text, ft.x, ft.y);
      _ctx.textAlign='left'; _ctx.globalAlpha=1;
    }
  }

  function _drawBase() {
    const last = S.path[S.path.length-1];
    const bx=last.c*S.cellW+S.cellW/2, by=last.r*S.cellH+S.cellH/2;
    _ctx.font = `${Math.floor(S.cellH*0.7)}px sans-serif`;
    _ctx.textAlign='center'; _ctx.textBaseline='middle';
    _ctx.fillText('🏰', bx, by); _ctx.textAlign='left';
    const pct=S.baseHp/S.baseMaxHp, bw=S.cellW*2;
    const barX=bx-bw/2, barY=by+S.cellH/2+4;
    _ctx.fillStyle='#333'; _ctx.fillRect(barX,barY,bw,5);
    _ctx.fillStyle=pct>0.5?'#5EFF9E':pct>0.25?'#FFD700':'#FF5E7A';
    _ctx.fillRect(barX,barY,bw*pct,5);
  }

  function _drawEntry() {
    const first = S.path[0];
    _ctx.font=`${Math.floor(S.cellH*0.55)}px sans-serif`;
    _ctx.textAlign='center'; _ctx.textBaseline='middle';
    _ctx.fillText('⚠️', first.c*S.cellW+S.cellW/2, first.r*S.cellH+S.cellH/2);
    _ctx.textAlign='left';
  }

  function _drawPrepBanner(w, h) {
    const t = Math.ceil(S.prepTimer);
    _ctx.fillStyle='rgba(0,0,0,0.45)'; _ctx.fillRect(w/2-90,8,180,46);
    _ctx.fillStyle='#FFD700'; _ctx.font='bold 13px sans-serif'; _ctx.textAlign='center';
    const label = S.phase==='prep' ? `Wave ${S.waveIdx+2} まで` : `次の Wave まで`;
    _ctx.fillText(`${label}  ${t}s`, w/2, 24);
    _ctx.fillStyle='#AAA'; _ctx.font='11px sans-serif';
    _ctx.fillText('タワーを配置 → 早期開始ボタンで即攻', w/2, 44);
    _ctx.textAlign='left';
  }

  // ──────────────────────────────────────
  // Input
  // ──────────────────────────────────────
  function _onCanvasClick(ev) {
    if (!S || !S.selectedType) return;
    const rect=_canvas.getBoundingClientRect();
    const x=(ev.clientX-rect.left)*(_canvas.width/rect.width);
    const y=(ev.clientY-rect.top)*(_canvas.height/rect.height);
    const c=Math.floor(x/S.cellW), r=Math.floor(y/S.cellH);
    if (_placeTower(c, r, S.selectedType)) {
      _cb.onGoldChange && _cb.onGoldChange(S.gold);
    }
  }

  function _onMouseMove(ev) {
    if (!S) return;
    const rect=_canvas.getBoundingClientRect();
    const x=(ev.clientX-rect.left)*(_canvas.width/rect.width);
    const y=(ev.clientY-rect.top)*(_canvas.height/rect.height);
    S.hoverCell = { c:Math.floor(x/S.cellW), r:Math.floor(y/S.cellH) };
  }

  // ──────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────
  function _addFloat(x, y, text, color, life, size) {
    S.floatTexts.push({ x, y, text, color, alpha:1, life, maxLife:life, size:size||14 });
  }

  function _hudUpdate() {
    if (!S) return;
    _cb.onHUDUpdate && _cb.onHUDUpdate({
      gold:S.gold, baseHp:S.baseHp, baseMaxHp:S.baseMaxHp,
      wave:S.waveIdx+1, totalWaves:S.waves.length,
      phase:S.phase, prepTimer:Math.ceil(S.prepTimer),
      killed:S.stats.killed,
    });
  }

  // ──────────────────────────────────────
  // Apply equipment bonuses to towers
  // ──────────────────────────────────────
  function applyEquipmentBonus(bonus) {
    if (!S) return;
    for (const t of S.towers) {
      if (bonus.type === 'archer_dmg'   && t.type === 'archer') t.dmgBonus = (t.dmgBonus||1) * (1 + bonus.value/100);
      if (bonus.type === 'mage_dmg'     && t.type === 'mage')   t.dmgBonus = (t.dmgBonus||1) * (1 + bonus.value/100);
      if (bonus.type === 'cannon_dmg'   && t.type === 'cannon') t.dmgBonus = (t.dmgBonus||1) * (1 + bonus.value/100);
      if (bonus.type === 'all_range') t.rangeBonus = (t.rangeBonus||1) + bonus.value;
    }
  }

  // ──────────────────────────────────────
  // Public export
  // ──────────────────────────────────────
  return {
    startBattle, stopBattle,
    selectTowerType, startWaveEarly, useBattleItem,
    applyEquipmentBonus,
    getTowerDefs, getState,
  };
})();
