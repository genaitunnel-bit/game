/* ======================================================
   js/battle.js  —  Canvas アニメーション戦闘システム
   Fire Emblem 風ミニキャラ対戦
   ====================================================== */
"use strict";

/* ======================================================
   Sprite クラス
   ====================================================== */
class BattleSprite {
  constructor(isAngel, charDef, x, y, facing) {
    this.isAngel  = isAngel;
    this.def      = charDef;
    this.baseX    = x;
    this.baseY    = y;
    this.x        = x;
    this.y        = y;
    this.facing   = facing;   // 1=右向き, -1=左向き
    this.hp       = charDef.hp || charDef.maxHp || 60;
    this.maxHp    = charDef.hp || charDef.maxHp || 60;
    this.state    = 'idle';   // idle | walkFwd | attack | walkBack | hit | dead | captured
    this.stateTimer = 0;
    this.flashAlpha = 0;
    this.damageNums = [];
    this.t          = 0;      // global time for bob
  }

  update(dt, canvas) {
    this.t += dt;
    this.stateTimer += dt;

    // Damage number animations
    this.damageNums = this.damageNums.filter(d => d.alpha > 0);
    this.damageNums.forEach(d => { d.y -= 0.8; d.alpha -= 0.018; });

    // Flash fade
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - 0.06);

    // State-based movement
    const speed = canvas ? canvas.width * 0.003 : 2;
    switch (this.state) {
      case 'idle':
        this.x = this.baseX;
        this.y = this.baseY + Math.sin(this.t * 0.0025) * 3;
        break;
      case 'walkFwd':
        this.x += this.facing * speed * 1.8;
        this.y = this.baseY + Math.sin(this.t * 0.012) * 5;
        break;
      case 'attack':
        this.x = this.baseX + this.facing * Math.sin(this.stateTimer * 0.06) * 12;
        break;
      case 'walkBack':
        this.x -= this.facing * speed * 1.4;
        this.y = this.baseY + Math.sin(this.t * 0.012) * 4;
        break;
      case 'hit':
        this.x = this.baseX + Math.sin(this.stateTimer * 0.18) * 8;
        break;
      case 'captured':
        this.x = this.baseX;
        this.y = this.baseY + Math.sin(this.t * 0.001) * 1;
        break;
    }
  }

  draw(ctx, scale) {
    const s = scale || 1;
    ctx.save();
    ctx.translate(this.x, this.y);

    // flash overlay
    if (this.flashAlpha > 0 && this.state !== 'dead') {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = '#ffffff';
    }

    if (this.state === 'dead') {
      ctx.globalAlpha = 0.35;
      ctx.translate(0, 20);
      ctx.rotate(this.facing * 0.4);
    }

    ctx.scale(s, s);
    ctx.globalAlpha = (ctx.globalAlpha || 1);

    if (this.isAngel) this._drawAngel(ctx);
    else               this._drawHuman(ctx);

    ctx.restore();

    // Draw damage numbers
    this.damageNums.forEach(d => {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.font = `bold ${d.big ? 26 : 20}px sans-serif`;
      ctx.fillStyle = d.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(d.text, d.x - 10, d.y);
      ctx.fillText(d.text, d.x - 10, d.y);
      ctx.restore();
    });
  }

  _drawHuman(ctx) {
    const bob = this.state === 'idle' ? Math.sin(this.t * 0.0025) * 3 : 0;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 36 + bob, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.fillStyle = '#2C4A6E';
    ctx.fillRect(-13, 8 + bob, 11, 28);
    ctx.fillRect(2,   8 + bob, 11, 28);

    // Boot
    ctx.fillStyle = '#1a2e42';
    ctx.fillRect(-14, 30 + bob, 13, 6);
    ctx.fillRect(1,   30 + bob, 13, 6);

    // Body armor
    ctx.fillStyle = '#3D6A8A';
    ctx.beginPath();
    ctx.roundRect(-16, -22 + bob, 32, 32, 4);
    ctx.fill();

    // Shoulder pads
    ctx.fillStyle = '#5090B0';
    ctx.beginPath();
    ctx.ellipse(-16, -14 + bob, 8, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(16, -14 + bob, 8, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#FFCBA4';
    ctx.beginPath();
    ctx.arc(0, -34 + bob, 13, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#4A7A96';
    ctx.beginPath();
    ctx.arc(0, -39 + bob, 11, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-11, -39 + bob, 22, 8);

    // Visor
    ctx.fillStyle = '#7EBFDF';
    ctx.fillRect(-8, -40 + bob, 16, 4);

    // Eye
    ctx.fillStyle = '#1a3050';
    ctx.fillRect(-4, -35 + bob, 8, 3);

    // Sword (right side)
    ctx.save();
    ctx.translate(16 * this.facing, -16 + bob);
    ctx.fillStyle = '#C8C8D8';
    ctx.fillRect(0, -28, 4, 36);  // blade
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-3, -5, 10, 5);   // guard
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(0, -4, 4, 14);    // grip
    ctx.restore();

    // Shield (left side)
    ctx.save();
    ctx.translate(-18 * this.facing, -10 + bob);
    ctx.fillStyle = '#8B2525';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C03030';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawAngel(ctx) {
    const bob     = this.state === 'idle' ? Math.sin(this.t * 0.0025) * 3 : 0;
    const wingFlap= Math.sin(this.t * 0.004) * 12;
    const hairCol = this.def.hairColor || '#FFD700';
    const eyeCol  = this.def.eyeColor  || '#87CEEB';

    // Flip to face left
    ctx.scale(-1, 1);

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#FFFFF0';
    ctx.beginPath();
    ctx.ellipse(0, 38 + bob, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- Wings (behind body) ----
    const drawWing = (side) => {
      ctx.fillStyle = 'rgba(255, 255, 230, 0.55)';
      ctx.strokeStyle = 'rgba(255, 220, 180, 0.4)';
      ctx.lineWidth = 1.5;
      const sx = side * 8;
      const ex = side * (48 + wingFlap * 0.5);
      const cy = -20 + bob;
      ctx.beginPath();
      ctx.moveTo(sx, cy);
      ctx.quadraticCurveTo(ex, cy - 28 - wingFlap, ex * 0.7, cy + 30);
      ctx.quadraticCurveTo(sx * 2, cy + 18, sx, cy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Secondary feather
      ctx.beginPath();
      ctx.moveTo(sx, cy + 4);
      ctx.quadraticCurveTo(ex * 0.8, cy - 10 - wingFlap * 0.5, ex * 0.5, cy + 26);
      ctx.quadraticCurveTo(sx * 1.5, cy + 20, sx, cy + 8);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,240,0.35)';
      ctx.fill();
    };
    drawWing(-1);
    drawWing(1);

    // ---- Robe ----
    ctx.fillStyle = '#FFFEF4';
    ctx.beginPath();
    ctx.moveTo(-16, -20 + bob);
    ctx.lineTo(16, -20 + bob);
    ctx.lineTo(22, 38 + bob);
    ctx.lineTo(-22, 38 + bob);
    ctx.closePath();
    ctx.fill();

    // Gold trim
    ctx.strokeStyle = 'rgba(255,200,100,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -20 + bob);
    ctx.lineTo(16, -20 + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-22, 38 + bob);
    ctx.lineTo(22, 38 + bob);
    ctx.stroke();

    // Ribbon / belt
    ctx.fillStyle = 'rgba(180,140,255,0.5)';
    ctx.fillRect(-14, 4 + bob, 28, 5);

    // ---- Head ----
    ctx.fillStyle = '#FFE8DC';
    ctx.beginPath();
    ctx.arc(0, -32 + bob, 15, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = hairCol;
    ctx.beginPath();
    ctx.arc(0, -40 + bob, 13, Math.PI, Math.PI * 2);
    ctx.fill();
    // Bangs
    ctx.beginPath();
    ctx.moveTo(-13, -34 + bob);
    ctx.quadraticCurveTo(-8, -26 + bob, -4, -30 + bob);
    ctx.quadraticCurveTo(0, -24 + bob, 4, -30 + bob);
    ctx.quadraticCurveTo(8, -26 + bob, 13, -34 + bob);
    ctx.fill();
    // Side hair
    ctx.fillRect(-16, -38 + bob, 5, 18);
    ctx.fillRect(11,  -38 + bob, 5, 18);

    // Eyes
    ctx.fillStyle = eyeCol;
    ctx.beginPath();
    ctx.ellipse(-6, -31 + bob, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -31 + bob, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupil
    ctx.fillStyle = '#1a0a2e';
    ctx.beginPath();
    ctx.ellipse(-6, -30 + bob, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -30 + bob, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(-5, -32 + bob, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(7,  -32 + bob, 1.5, 0, Math.PI*2); ctx.fill();
    // Eyelash
    ctx.fillStyle = '#2a1040';
    ctx.fillRect(-11, -38 + bob, 10, 2.5);
    ctx.fillRect(1,   -38 + bob, 10, 2.5);

    // Blush
    ctx.fillStyle = 'rgba(255,180,180,0.45)';
    ctx.beginPath(); ctx.ellipse(-11, -27 + bob, 7, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11,  -27 + bob, 7, 4, 0, 0, Math.PI*2); ctx.fill();

    // Halo
    ctx.strokeStyle = 'rgba(255,215,0,0.9)';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(255,215,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, -52 + bob, 18, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Weapon (spear) on the right side (which is left because of flip)
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(16, -55 + bob, 4, 75);  // shaft
    ctx.fillStyle = '#F0E0C0';
    ctx.beginPath();
    ctx.moveTo(14, -55 + bob);
    ctx.lineTo(22, -55 + bob);
    ctx.lineTo(18, -76 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(120,200,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(18, -65 + bob, 4, 10, 0, 0, Math.PI*2);
    ctx.fill();
  }

  hitEffect(dmg, isCrit) {
    this.flashAlpha = 0.85;
    this.stateTimer = 0;
    this.damageNums.push({
      x: this.x + (Math.random() - 0.5) * 30,
      y: this.y - 50,
      text:  isCrit ? `${dmg}!!` : `${dmg}`,
      color: isCrit ? '#FFD700' : '#FF5555',
      alpha: 1, big: isCrit,
    });
    this.hp = Math.max(0, this.hp - dmg);
  }

  setState(s) {
    this.state = s;
    this.stateTimer = 0;
  }
}

/* ======================================================
   BattleScene — 戦闘全体管理
   ====================================================== */
const BattleScene = (() => {
  let canvas, ctx;
  let playerSprite, enemySprite;
  let turn = 0;       // 0=player, 1=enemy
  let phase = 'idle'; // idle | playerTurn | animating | enemyTurn | result
  let animQueue = [];
  let raf = null;
  let battleData = {};
  let onDone = null;
  let lastTime = 0;
  let bgStars = [];
  let bgParticles = [];

  function initBg(w, h) {
    bgStars = [];
    for (let i = 0; i < 80; i++) {
      bgStars.push({ x: Math.random()*w, y: Math.random()*h, r: Math.random()*1.8+0.3, a: Math.random() });
    }
    bgParticles = [];
  }

  function drawBackground(t) {
    const w = canvas.width, h = canvas.height;

    // Sky gradient (ruined city at dusk)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0,   '#0a0520');
    grad.addColorStop(0.4, '#1a0838');
    grad.addColorStop(0.7, '#2d0a14');
    grad.addColorStop(1,   '#1a0408');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    bgStars.forEach(s => {
      ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t * 0.001 + s.a * 10)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Moon
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.shadowColor = 'rgba(255,240,200,0.5)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.12, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ruined city silhouette
    ctx.fillStyle = '#08020E';
    const buildings = [
      [0, 0.5, 0.08, 0.35],  [0.06, 0.42, 0.07, 0.5], [0.12, 0.38, 0.05, 0.5],
      [0.16, 0.48, 0.09, 0.4],[0.24, 0.35, 0.06, 0.5], [0.29, 0.45, 0.08, 0.4],
      [0.36, 0.32, 0.07, 0.5],[0.42, 0.44, 0.1, 0.4],  [0.51, 0.3, 0.05, 0.5],
      [0.55, 0.42, 0.08, 0.4],[0.62, 0.36, 0.07, 0.5], [0.68, 0.48, 0.09, 0.4],
      [0.76, 0.33, 0.06, 0.5],[0.81, 0.46, 0.1, 0.4],  [0.9, 0.4, 0.1, 0.5],
    ];
    buildings.forEach(([lx, ly, lw, lh]) => {
      ctx.fillRect(lx*w, ly*h, lw*w, lh*h);
    });

    // Ground
    const grd = ctx.createLinearGradient(0, h*0.72, 0, h);
    grd.addColorStop(0, '#1a0a0a');
    grd.addColorStop(1, '#0a0404');
    ctx.fillStyle = grd;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    // Atmospheric particles (floating embers)
    bgParticles.forEach(p => {
      ctx.fillStyle = `rgba(255,${100+p.g},50,${p.a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    });
    if (Math.random() < 0.08) {
      bgParticles.push({ x: Math.random()*w, y: h, r: Math.random()*2+0.5, a: 0.7, g: Math.floor(Math.random()*100) });
    }
    bgParticles.forEach(p => { p.y -= 0.4; p.x += Math.sin(t*0.001+p.r)*0.3; p.a -= 0.003; });
    bgParticles = bgParticles.filter(p => p.a > 0 && p.y > 0);
  }

  function drawHpBars() {
    const w = canvas.width, h = canvas.height;
    const barH = 10, barW = Math.min(200, w * 0.25);
    const y = h * 0.72 + 10;

    // Player bar (left)
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(20, y, barW, barH);
    const pPct = Math.max(0, playerSprite.hp / playerSprite.maxHp);
    const pCol = pPct > 0.5 ? '#5EFF9E' : pPct > 0.25 ? '#FFD700' : '#FF5E7A';
    ctx.fillStyle = pCol;
    ctx.fillRect(20, y, barW * pPct, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${playerSprite.def.name || 'SOLDIER'}  HP ${playerSprite.hp}/${playerSprite.maxHp}`, 20, y - 6);

    // Enemy bar (right)
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(w - 20 - barW, y, barW, barH);
    const ePct = Math.max(0, enemySprite.hp / enemySprite.maxHp);
    const eCol = ePct > 0.5 ? '#FF5E7A' : ePct > 0.25 ? '#FFD700' : '#FF2255';
    ctx.fillStyle = eCol;
    ctx.fillRect(w - 20 - barW + barW*(1-ePct), y, barW * ePct, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${enemySprite.def.name}  HP ${enemySprite.hp}/${enemySprite.maxHp}`, w - 20, y - 6);
    ctx.textAlign = 'left';
  }

  function loop(now) {
    const dt = now - (lastTime || now);
    lastTime = now;

    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    drawBackground(now);

    playerSprite.update(dt, canvas);
    enemySprite.update(dt, canvas);

    const scale = Math.min(1.2, h / 400);
    playerSprite.draw(ctx, scale);
    enemySprite.draw(ctx, scale);

    drawHpBars();

    // Process animation queue
    if (animQueue.length > 0) {
      const step = animQueue[0];
      step.elapsed = (step.elapsed || 0) + dt;
      if (step.elapsed >= step.duration) {
        step.onEnd && step.onEnd();
        animQueue.shift();
        if (animQueue.length === 0 && onDone) {
          // animation done — wait a beat then resolve
          setTimeout(() => resolveAfterAnim(), 400);
        }
      }
    }

    if (phase !== 'done') raf = requestAnimationFrame(loop);
  }

  /* -------- Animation sequence builders -------- */
  function queueAttack(attacker, defender, dmg, isCrit, onFinish) {
    animQueue = [];

    animQueue.push({
      duration: 400,
      onEnd: () => attacker.setState('walkFwd'),
    });
    animQueue.push({
      duration: 450,
      onEnd: () => {
        attacker.setState('attack');
        defender.hitEffect(dmg, isCrit);
        defender.setState('hit');
      },
    });
    animQueue.push({
      duration: 380,
      onEnd: () => {
        attacker.setState('walkBack');
        defender.setState(defender.hp <= 0 ? 'dead' : 'idle');
      },
    });
    animQueue.push({
      duration: 400,
      onEnd: () => {
        attacker.setState('idle');
        onFinish && onFinish();
      },
    });
  }

  /* -------- Damage calculation -------- */
  function calcDmg(atk, def, weakMulti, critBonus) {
    let dmg = Math.max(1, atk - Math.floor(def * 0.5) + Math.floor(Math.random() * 6) - 2);
    const isCrit = Math.random() < (0.1 + critBonus);
    if (isCrit) dmg = Math.round(dmg * 1.5);
    dmg = Math.round(dmg * weakMulti);
    return { dmg, isCrit };
  }

  /* -------- Post-animation resolve -------- */
  function resolveAfterAnim() {
    if (enemySprite.hp <= 0) {
      // Enemy defeated — check capture
      const capThreshold = Math.floor(enemySprite.maxHp * (battleData.angel.captureAt / 100));
      phase = 'done';
      onDone({ result: 'victory', canCapture: true, angelId: battleData.angel.id, playerHpLeft: playerSprite.hp });
      return;
    }
    if (playerSprite.hp <= 0) {
      phase = 'done';
      onDone({ result: 'defeat', angelId: battleData.angel.id });
      return;
    }
    // Continue — hand back to UI
    phase = 'playerTurn';
    battleData.onTurnReady && battleData.onTurnReady({ playerHp: playerSprite.hp, enemyHp: enemySprite.hp });
  }

  /* ======================================================
     Public API
     ====================================================== */
  function startBattle(canvasEl, bd, doneCallback) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    battleData = bd;
    onDone     = doneCallback;
    phase      = 'playerTurn';
    animQueue  = [];
    lastTime   = 0;

    canvas.style.display = 'block';
    canvas.width  = canvas.clientWidth  || window.innerWidth;
    canvas.height = (canvas.clientWidth || window.innerWidth) * 0.58;

    initBg(canvas.width, canvas.height);

    const w = canvas.width, h = canvas.height;
    const groundY = h * 0.68;

    playerSprite = new BattleSprite(false, bd.playerUnit, w * 0.2,  groundY, 1);
    enemySprite  = new BattleSprite(true,  bd.angel,      w * 0.8,  groundY, -1);

    // Adjust hp for weakness if already known
    playerSprite.hp    = bd.playerUnit.hp;
    playerSprite.maxHp = bd.playerUnit.hp;
    enemySprite.hp     = bd.angel.hp;
    enemySprite.maxHp  = bd.angel.hp;

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function playerAttack(useWeakness) {
    if (phase !== 'playerTurn') return;
    phase = 'animating';

    const wm   = useWeakness ? battleData.weaknessMulti : 1;
    const crit = G.player.critBonus || 0;
    const { dmg, isCrit } = calcDmg(battleData.playerUnit.atk, battleData.angel.def, wm, crit);

    queueAttack(playerSprite, enemySprite, dmg, isCrit, () => {
      if (enemySprite.hp > 0) {
        // Enemy counter
        const { dmg: edm, isCrit: ec } = calcDmg(battleData.angel.atk, battleData.playerUnit.def, 1, 0);
        queueAttack(enemySprite, playerSprite, edm, ec, null);
      }
    });
  }

  function stopBattle() {
    phase = 'done';
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (canvas) canvas.style.display = 'none';
  }

  return { startBattle, playerAttack, stopBattle, getPhase: () => phase };
})();
