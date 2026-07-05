/* ======================================================
   js/scenes.js  —  全シーン描画
   ====================================================== */
"use strict";

const Scenes = (() => {

  /* ======================================================
     ユーティリティ
     ====================================================== */
  function typewrite(el, text, speed) {
    if (!el) return;
    el.innerHTML = '';
    const chars = [...text];
    chars.forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'tw-char';
      s.textContent = ch;
      s.style.animationDelay = `${i * speed}s`;
      el.appendChild(s);
    });
  }

  /* ======================================================
     タイトル画面
     ====================================================== */
  function renderTitle() {
    document.getElementById('root').innerHTML = `
    <div id="scene-title">
      <div class="title-logo">
        <h1>情報戦略</h1>
        <div class="sub">～ Secret Hearts ～</div>
        <div class="tagline">天使を捕らえ、心を開かせ、真実を掴め</div>
      </div>
      <div class="title-cast">
        ${ANGELS.map(a => `
          <div class="title-cast-card">
            <span class="cast-emoji">${a.emoji}</span>
            <div class="cast-name" style="color:${a.color}">${a.name}</div>
            <div class="cast-role">${a.title}</div>
          </div>`).join('')}
      </div>
      <button class="btn btn-pink btn-lg" id="btn-start">ゲーム開始 ▶</button>
      <div style="margin-top:14px;font-size:12px;color:var(--dim)">Click to Start</div>
    </div>`;

    document.getElementById('btn-start').onclick = () => {
      initGameState();
      G.phase = 'story';
      render();
    };
  }

  /* ======================================================
     ストーリーシーン
     ====================================================== */
  function renderStory() {
    const sc = STORY_SCENES[G.storyIdx];
    const root = document.getElementById('root');
    root.innerHTML = `
    <div id="scene-story">
      <div class="story-bg">
        <div class="story-bg-emoji">⚔️</div>
      </div>
      <div class="story-dlg-box">
        ${sc.speaker ? `<div class="story-speaker" style="background:${sc.color||'var(--lavender)'}">${sc.speaker}</div>` : ''}
        <div class="story-text" id="story-text"></div>
        <div class="story-next text-dim" id="story-next">▼ クリックで次へ</div>
      </div>
    </div>`;

    typewrite(document.getElementById('story-text'), sc.text, 0.04);

    root.onclick = () => {
      G.storyIdx++;
      if (G.storyIdx >= STORY_SCENES.length) {
        G.storyIdx = 0;
        G.phase = 'tutorial_prep';
      }
      render();
    };
  }

  /* ======================================================
     チュートリアル
     ====================================================== */
  function renderTutorialPrep() {
    const root = document.getElementById('root');
    root.innerHTML = `
    <div style="max-width:480px;margin:0 auto;padding:24px 16px;display:flex;flex-direction:column;align-items:center;gap:16px;font-family:sans-serif">
      <div style="font-size:10px;color:#FFD700;letter-spacing:3px">TUTORIAL</div>
      <div style="font-size:72px;filter:drop-shadow(0 0 24px #B8E4FF)">📖</div>
      <h2 style="color:#B8E4FF;margin:0;font-size:20px;text-align:center">ルミエルとの実戦訓練</h2>
      <div style="background:rgba(184,228,255,0.08);border:1px solid rgba(184,228,255,0.25);border-radius:12px;padding:14px 18px;font-size:13px;color:#CCC;line-height:1.9;text-align:center">
        「あなたの実力を確かめさせてください。<br>
        一緒に戦えるか——まず、私と戦ってみて。」<br>
        <span style="font-size:11px;color:#888">— ルミエル</span>
      </div>
      <div style="background:rgba(0,0,0,0.35);border-radius:10px;padding:12px 16px;font-size:11px;color:#AAA;line-height:1.9;width:100%;box-sizing:border-box">
        <div style="color:#FFD700;margin-bottom:6px;font-weight:bold">⚔️ バトル操作</div>
        <div>• <strong style="color:#EEE">攻撃</strong> — 通常攻撃で敵HPを削る</div>
        <div>• <strong style="color:#EEE">スキル</strong> — MP消費で強力な技を発動</div>
        <div>• <strong style="color:#88D8FF">属性弱点スキル</strong> — ダメージ×1.6倍</div>
        <div>• <strong style="color:#4CFF7A">回復スキル</strong> — HPが減ったら使う</div>
        <div style="margin-top:6px;color:#FFCC88">★ 弱点属性は光（最初から判明済み）</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;width:100%">
        <button class="btn btn-pink btn-lg" id="btn-tut-fight">⚔️ 戦闘開始</button>
        <button class="btn btn-ghost" id="btn-tut-skip">→ スキップして尋問へ</button>
      </div>
    </div>`;

    document.getElementById('btn-tut-fight').onclick = () => _startTutorialBattle();
    document.getElementById('btn-tut-skip').onclick  = () => _captureAndInterrogateLumiel();
  }

  function _captureAndInterrogateLumiel() {
    G.capturedAngels.lumiel = G.capturedAngels.lumiel || {
      pain: 0, obedience: 0, progression: 0,
      expression: 'normal', scenesPlayed: [], _lastScene: 'captive',
    };
    if (!G.allies.includes('lumiel')) G.allies.push('lumiel');
    G._interrogatingId = 'lumiel';
    G.phase = 'interrogation';
    render();
  }

  function _startTutorialBattle() {
    const lumiel = getAngel('lumiel');
    const party  = [Object.assign({}, PLAYER_UNIT, {
      hp: PLAYER_UNIT.maxHp, mp: PLAYER_UNIT.maxMp,
      skills: PLAYER_SKILLS.map(s => ({ ...s })),
    })];
    const enemies = [{
      id: 'lumiel_tut', name: lumiel.name, emoji: lumiel.emoji, color: lumiel.color,
      hp: 70, maxHp: 70, mp: 30, maxMp: 30,
      atk: 9, def: 4, spd: lumiel.spd,
      skills: (ANGEL_BATTLE_SKILLS.lumiel || []).map(sk => ({ ...sk })),
      side: 'enemy', isBoss: false,
    }];

    G.phase = 'battle';
    document.getElementById('root').innerHTML = '';

    RPGBattle.startBattle(document.body, {
      party, enemies,
      weaknesses: ['light'], knownWeaknesses: ['light'],
      items: [],
    }, {
      onBattleEnd() {
        RPGBattle.stopBattle();
        const r = document.getElementById('root');
        if (r) r.innerHTML = '';
        _captureAndInterrogateLumiel();
      },
    });
  }

  /* ======================================================
     ステージ選択
     ====================================================== */
  function renderStageSelect() {
    const hpPct = G.player.hp / G.player.maxHp;
    const root  = document.getElementById('root');

    root.innerHTML = `
    <div id="scene-stage-select" style="max-width:640px;margin:0 auto;padding:20px 16px;display:flex;flex-direction:column;gap:16px;font-family:sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <h2 style="margin:0;font-size:20px;color:#C89FFF">⚔️ 作戦マップ</h2>
          <div style="font-size:12px;color:#888;margin-top:2px">ステージ ${G.stage + 1} / ${STAGE_ORDER.length}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;color:#888;margin-bottom:3px">自陣HP</div>
          <div style="width:140px;height:10px;background:#1a1a2e;border-radius:5px;overflow:hidden">
            <div style="height:100%;width:${Math.max(0, hpPct * 100).toFixed(1)}%;background:${hpPct > .5 ? '#4CFF7A' : hpPct > .25 ? '#FFD700' : '#FF4444'};border-radius:5px"></div>
          </div>
          <div style="font-size:11px;color:#CCC;margin-top:2px">${G.player.hp} / ${G.player.maxHp}</div>
        </div>
      </div>

      <div style="background:rgba(184,228,255,0.08);border:1px solid rgba(184,228,255,0.2);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:12px">
        <span style="font-size:28px">📖</span>
        <div style="font-size:12px;color:#CCC">"${_lumielHint()}" <span style="color:#B8E4FF">— ルミエル</span></div>
      </div>

      <!-- ルミエル（盟友）再尋問 -->
      ${G.capturedAngels.lumiel ? (() => {
        const lm = getAngel('lumiel');
        return `<div style="background:rgba(184,228,255,0.06);border:1px solid rgba(184,228,255,0.25);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:12px">
          <span style="font-size:32px;filter:drop-shadow(0 0 8px #B8E4FF)">📖</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:bold;color:#B8E4FF">ルミエル <span style="font-size:10px;color:#888">盟友</span></div>
            <div style="font-size:10px;color:#666">記録補佐の天使 — 仲間</div>
          </div>
          <button class="btn btn-pink btn-sm" data-inq="lumiel">尋問</button>
        </div>`;
      })() : ''}

      <div style="display:flex;flex-direction:column;gap:8px">
        ${STAGE_ORDER.map((locId, i) => {
          const loc   = getLocation(locId);
          const angel = loc ? getAngel(loc.angelId) : null;
          if (!angel) return '';
          const isCleared = i < G.stage;
          const isCurrent = i === G.stage;
          const isLocked  = i > G.stage;
          return `
          <div style="background:${isCurrent ? 'rgba(200,159,255,0.12)' : isCleared ? 'rgba(80,200,100,0.08)' : 'rgba(255,255,255,0.03)'};border:1px solid ${isCurrent ? 'rgba(200,159,255,0.4)' : isCleared ? 'rgba(80,200,100,0.3)' : 'rgba(255,255,255,0.08)'};border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:14px;opacity:${isLocked ? '.35' : '1'}">
            <span style="font-size:40px;filter:${isLocked ? 'grayscale(1)' : 'drop-shadow(0 0 8px ' + angel.color + ')'}">${angel.emoji}</span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-weight:bold;font-size:14px;color:${isCleared ? '#4CFF7A' : isCurrent ? angel.color : '#888'}">${i + 1}. ${angel.name}</span>
                <span style="font-size:10px;color:#666">${angel.title}</span>
                ${isCleared ? '<span style="font-size:11px;color:#4CFF7A;margin-left:auto">✅ 捕縛済</span>' : ''}
                ${isCurrent ? '<span style="font-size:11px;color:#C89FFF;margin-left:auto">▶ 現在</span>' : ''}
                ${isLocked  ? '<span style="font-size:11px;color:#555;margin-left:auto">🔒</span>' : ''}
              </div>
              <div style="font-size:11px;color:#666;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${loc.name} — ${angel.desc.substring(0, 50)}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              ${isCurrent ? '<button class="btn btn-lavender btn-sm" id="btn-stage-enter">出撃</button>' : ''}
              ${isCleared ? `<button class="btn btn-pink btn-sm" data-inq="${angel.id}">尋問</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    document.getElementById('btn-stage-enter')?.addEventListener('click', () => {
      G.phase = 'stage_prep';
      render();
    });

    document.querySelectorAll('[data-inq]').forEach(btn => {
      btn.addEventListener('click', () => {
        G._interrogatingId = btn.dataset.inq;
        G.phase = 'interrogation';
        render();
      });
    });
  }

  function _lumielHint() {
    const hints = [
      '次はセラフィエルです。感情に訴えると揺れます……。',
      'ミリエルは沈黙を怖がります。私も知っていました、昔は。',
      'アリュシアは読めない人。でも本物の感情には弱いはず。',
      'エルティアは私の元上司です。計算外の変数になってやりましょう。',
      'サンクティアの笑顔は……信じないでください。',
      'ヴェルナは記憶の中で生きています。現実を見せれば…',
      'ラグナリア……もう、止められるかどうか。でも、やるしかない。',
    ];
    return hints[Math.min(G.stage, hints.length - 1)];
  }

  /* ======================================================
     ステージ準備（情報収集セッション）
     ====================================================== */
  function renderStagePrep() {
    const locId = STAGE_ORDER[G.stage];
    const loc   = getLocation(locId);
    const angel = loc ? getAngel(loc.angelId) : null;
    if (!angel) { G.phase = 'stage_select'; render(); return; }

    if (!G.stageWeaknesses.length) {
      const shuffled = [...ELEM_KEYS].sort(() => Math.random() - 0.5);
      G.stageWeaknesses    = shuffled.slice(0, Math.random() < 0.4 ? 2 : 1);
      G.revealedWeaknesses = [];
      G.sessionsLeft       = 3 + Math.floor(Math.random() * 3); // 3〜5回
    }

    const root = document.getElementById('root');
    root.innerHTML = `
    <div id="scene-stage-prep" style="max-width:520px;margin:0 auto;padding:20px 16px;display:flex;flex-direction:column;gap:16px;font-family:sans-serif">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn btn-ghost btn-sm" id="btn-prep-back">← 戻る</button>
        <span style="font-size:12px;color:#888">ステージ ${G.stage + 1} — 出撃前準備</span>
      </div>

      <div style="background:rgba(0,0,0,0.4);border:1px solid ${angel.color}44;border-radius:16px;overflow:hidden">
        <div style="background:${angel.bgGrad || 'rgba(50,20,80,0.6)'};padding:24px;display:flex;flex-direction:column;align-items:center;gap:8px">
          <div style="font-size:72px;filter:drop-shadow(0 0 20px ${angel.color})">${angel.emoji}</div>
          <div style="font-size:18px;font-weight:bold;color:${angel.color}">${angel.name}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.6)">${angel.title}</div>
        </div>
        <div style="padding:12px 16px;background:rgba(0,0,0,0.3)">
          <div style="font-size:12px;color:#AAA;line-height:1.7">${angel.desc.substring(0, 100)}…</div>
        </div>
      </div>

      <div style="background:rgba(10,4,25,0.8);border:1px solid rgba(200,159,255,0.2);border-radius:12px;padding:14px 16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:13px;font-weight:bold;color:#C89FFF">🔍 情報収集</span>
          <span style="font-size:13px;font-weight:bold;color:${G.sessionsLeft > 0 ? '#FFD700' : '#666'}">残り ${G.sessionsLeft} 回</span>
        </div>
        <div style="font-size:11px;color:#888;margin-bottom:8px">⚠️ 弱点属性スキルは通常スキルの約1.6倍のダメージ。非弱点でも通常攻撃より強い。</div>
        <div style="margin-bottom:10px">
          <div style="font-size:11px;color:#666;margin-bottom:5px">判明した弱点:</div>
          <div style="display:flex;gap:8px;min-height:28px;align-items:center;flex-wrap:wrap">
            ${G.revealedWeaknesses.length
              ? G.revealedWeaknesses.map(e => `<span style="font-size:18px;filter:drop-shadow(0 0 6px ${ELEM_DATA[e].color})">${ELEM_DATA[e].icon} <span style="font-size:13px;color:${ELEM_DATA[e].color}">${ELEM_DATA[e].name}</span></span>`).join('')
              : '<span style="font-size:11px;color:#444">まだ何も判明していない</span>'}
          </div>
        </div>
        ${G.sessionsLeft > 0 ? `
        <div style="font-size:11px;color:#888;margin-bottom:8px">属性プローブを選択（1回消費）:</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${ELEM_KEYS.map(e => {
            const ed      = ELEM_DATA[e];
            const already = G.revealedWeaknesses.includes(e);
            return `<button class="elem-probe-btn" data-elem="${e}" style="padding:8px 4px;background:rgba(255,255,255,0.04);border:1px solid ${ed.color}55;border-radius:8px;color:${ed.color};font-size:13px;cursor:pointer;${already ? 'opacity:0.3;cursor:default' : ''}"${already ? ' disabled' : ''}>
              ${ed.icon} ${ed.name}
            </button>`;
          }).join('')}
        </div>` : '<div style="text-align:center;font-size:12px;color:#FF8888;padding:8px 0">情報収集の機会はなくなった</div>'}
      </div>

      <button class="btn btn-pink btn-lg" id="btn-battle-start">⚔️ 戦闘開始！</button>
    </div>`;

    document.getElementById('btn-prep-back')?.addEventListener('click', () => { G.phase = 'stage_select'; render(); });
    document.getElementById('btn-battle-start')?.addEventListener('click', () => _startRPGBattle());

    document.querySelectorAll('.elem-probe-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        if (G.sessionsLeft <= 0) return;
        const elem   = btn.dataset.elem;
        G.sessionsLeft--;
        const isWeak = G.stageWeaknesses.includes(elem) && !G.revealedWeaknesses.includes(elem);
        if (isWeak) G.revealedWeaknesses.push(elem);
        _showFlash(
          isWeak ? '💡 弱点発見！' : '効果なし',
          isWeak ? `${ELEM_DATA[elem].icon} ${ELEM_DATA[elem].name} が弱点です！` : `${ELEM_DATA[elem].icon} ${ELEM_DATA[elem].name} には反応しない`,
          isWeak ? ELEM_DATA[elem].color : '#666'
        );
        if (G.sessionsLeft <= 0) setTimeout(() => _startRPGBattle(), 1200);
        else render();
      });
    });
  }

  function _showFlash(title, msg, color) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,4,25,0.97);border:1px solid ${color};border-radius:14px;padding:20px 32px;text-align:center;z-index:999;font-family:sans-serif;pointer-events:none`;
    el.innerHTML = `<div style="font-size:16px;font-weight:bold;color:${color};margin-bottom:6px">${title}</div><div style="font-size:13px;color:#CCC">${msg}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  /* ======================================================
     RPG戦闘起動
     ====================================================== */
  function _startRPGBattle() {
    const locId = STAGE_ORDER[G.stage];
    const loc   = getLocation(locId);
    const angel = loc ? getAngel(loc.angelId) : null;
    if (!angel) { G.phase = 'stage_select'; render(); return; }

    // パーティ構築（指揮官 + 鹵獲済み天使）
    const party = [Object.assign({}, PLAYER_UNIT, {
      hp: PLAYER_UNIT.maxHp, mp: PLAYER_UNIT.maxMp,
      skills: PLAYER_SKILLS.map(s => ({ ...s })),
    })];

    G.allies.forEach(id => {
      const a = getAngel(id);
      if (!a) return;
      const st = _allyBattleStats(a.id);
      const isSuperMode = (G.capturedAngels[a.id] || {}).progression >= 100;
      party.push({
        id: a.id, name: a.name + (isSuperMode ? '★' : ''), emoji: a.emoji, color: a.color,
        hp: st.hp, maxHp: st.hp, mp: 40, maxMp: 40,
        atk: st.atk, def: st.def, spd: a.spd,
        skills: (ANGEL_BATTLE_SKILLS[a.id] || []).map(sk => ({ ...sk })),
        side: 'player',
      });
    });

    // 敵構築（ステージが進むほど強化）
    // bossDef高め設定：通常攻撃≈2-4dmg、スキル≈12-14dmg、弱点スキル≈19-22dmg と差をつける
    const si = G.stage;
    const bossHp  = Math.round(angel.hp * (6 + si * 1.5));
    const bossAtk = Math.max(18, angel.atk) + si * 3;
    const bossDef = 20 + si * 2;
    const enemies = [{
      id: 'boss', name: angel.name, emoji: angel.emoji, color: angel.color,
      hp: bossHp, maxHp: bossHp, mp: 80, maxMp: 80,
      atk: bossAtk, def: bossDef, spd: angel.spd,
      skills: (ANGEL_BATTLE_SKILLS[angel.id] || []).map(sk => ({ ...sk })),
      side: 'enemy', isBoss: true,
    }];
    // ステージ0から雑魚天使を追加
    enemies.push({ id: 'g1', name: '天界兵',   emoji: '👼', color: '#FF9988', hp: 50 + si * 25, maxHp: 50 + si * 25, mp: 20, maxMp: 20, atk: 10 + si * 3, def: 4 + si * 2, spd: 9,  skills: [], side: 'enemy' });
    if (si >= 2) enemies.push({ id: 'g2', name: '精鋭天使', emoji: '⚔️', color: '#FF6666', hp: 45 + si * 20, maxHp: 45 + si * 20, mp: 30, maxMp: 30, atk: 12 + si * 3, def: 5 + si * 2, spd: 11, skills: [], side: 'enemy' });

    G.phase = 'battle';
    document.getElementById('root').innerHTML = '';

    RPGBattle.startBattle(document.body, {
      party, enemies,
      weaknesses: G.stageWeaknesses,
      knownWeaknesses: G.revealedWeaknesses,
      items: [],
    }, {
      onBattleEnd({ victory }) {
        RPGBattle.stopBattle();
        const rootEl = document.getElementById('root');
        if (rootEl) rootEl.innerHTML = '';

        if (victory) {
          G.capturedAngels[angel.id] = G.capturedAngels[angel.id] || {
            pain: 0, obedience: 0, progression: 0, expression: 'normal', scenesPlayed: [],
          };
          if (!G.allies.includes(angel.id)) G.allies.push(angel.id);
          G.stage++;
          G.stageWeaknesses = [];
          G._lastClearedAngel = angel.id;
          G.phase = G.stage >= STAGE_ORDER.length ? 'game_clear' : 'stage_clear';
        } else {
          G.player.hp = Math.max(0, G.player.hp - 60);
          G._defeatAngel = angel.id;
          G.phase = G.player.hp <= 0 ? 'game_over' : 'stage_defeat';
        }
        render();
      },
    });
  }

  function _allyBattleStats(angelId) {
    const a   = getAngel(angelId);
    if (!a) return { hp: 60, maxHp: 60, atk: 12, def: 6 };
    const cap = G.capturedAngels[angelId] || { pain: 0, obedience: 0, progression: 0 };

    const isSuperMode = cap.progression >= 100;
    const painOver    = Math.max(0, cap.pain - 50);
    const obeyBonus   = Math.floor(cap.obedience / 10);
    const progBonus   = isSuperMode ? 20 : Math.floor(cap.progression / 10);

    if (isSuperMode) {
      // 蹂躙モード: 全ステ大幅強化
      return {
        hp:  Math.round(a.hp  * 2.5 + 30), maxHp: Math.round(a.hp  * 2.5 + 30),
        atk: Math.round(a.atk * 2.5 + 10),
        def: Math.round(a.def * 2.0 + 5),
      };
    }

    return {
      hp:  Math.max(20, a.hp  - Math.floor(painOver / 8)  + obeyBonus + progBonus),
      maxHp: Math.max(20, a.hp - Math.floor(painOver / 8) + obeyBonus + progBonus),
      atk: Math.max(5,  a.atk - Math.floor(painOver / 12) + Math.floor(obeyBonus * 0.5) + Math.floor(progBonus * 0.8)),
      def: Math.max(2,  a.def + Math.floor(obeyBonus * 0.3)),
    };
  }

  /* ======================================================
     ステージクリア画面
     ====================================================== */
  function renderStageClear() {
    const angel     = getAngel(G._lastClearedAngel);
    const nextLoc   = STAGE_ORDER[G.stage] ? getLocation(STAGE_ORDER[G.stage]) : null;
    const nextAngel = nextLoc ? getAngel(nextLoc.angelId) : null;

    document.getElementById('root').innerHTML = `
    <div style="max-width:480px;margin:0 auto;padding:32px 16px;display:flex;flex-direction:column;align-items:center;gap:18px;font-family:sans-serif">
      <div style="font-size:48px">🔗</div>
      <h2 style="color:#FFD700;margin:0;font-size:22px">捕縛成功</h2>
      <div style="font-size:64px;filter:drop-shadow(0 0 20px ${angel?.color || '#888'})">${angel?.emoji || '👼'}</div>
      <p style="color:#CCC;text-align:center;font-size:14px;margin:0">
        <strong style="color:${angel?.color || '#FFF'}">${angel?.name || '???'}</strong> を鹵獲した。<br>
        尋問を重ねてさらに強化できる。
      </p>
      ${nextAngel ? `
      <div style="border:1px solid rgba(200,159,255,0.2);border-radius:10px;padding:12px 16px;background:rgba(0,0,0,0.4);text-align:center">
        <div style="font-size:11px;color:#666;margin-bottom:6px">次のステージ</div>
        <div style="font-size:32px">${nextAngel.emoji}</div>
        <div style="font-size:14px;color:${nextAngel.color};font-weight:bold">${nextAngel.name}</div>
      </div>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-pink" id="btn-clear-inq">🔍 尋問する</button>
        <button class="btn btn-lavender" id="btn-clear-next">次へ ▶</button>
      </div>
    </div>`;

    document.getElementById('btn-clear-inq')?.addEventListener('click', () => {
      G._interrogatingId = G._lastClearedAngel;
      G.phase = 'interrogation';
      render();
    });
    document.getElementById('btn-clear-next')?.addEventListener('click', () => {
      G.phase = G.stage >= STAGE_ORDER.length ? 'game_clear' : 'stage_select';
      render();
    });
  }

  /* ======================================================
     ステージ敗北画面
     ====================================================== */
  function renderStageDefeat() {
    const angel = getAngel(G._defeatAngel);
    document.getElementById('root').innerHTML = `
    <div style="max-width:440px;margin:0 auto;padding:32px 16px;display:flex;flex-direction:column;align-items:center;gap:16px;font-family:sans-serif">
      <div style="font-size:48px">💀</div>
      <h2 style="color:#FF5E7A;margin:0">敗北</h2>
      <p style="color:#AAA;text-align:center;font-size:13px;margin:0">
        <strong style="color:${angel?.color || '#FFF'}">${angel?.name || '???'}</strong> に敗れた……。<br>
        自陣HP: <span style="color:#FF5E7A">${G.player.hp}</span> / ${G.player.maxHp}
      </p>
      <p style="font-size:11px;color:#666;text-align:center">情報収集し直して再挑戦せよ</p>
      <button class="btn btn-ghost" id="btn-defeat-retry">← ステージ選択へ</button>
    </div>`;

    document.getElementById('btn-defeat-retry')?.addEventListener('click', () => {
      G.stageWeaknesses = [];
      G.phase = 'stage_select';
      render();
    });
  }

  /* ======================================================
     ゲームクリア（全ステージ制覇）
     ====================================================== */
  function renderGameClear() {
    const captured = Object.keys(G.capturedAngels);
    document.getElementById('root').innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;display:flex;flex-direction:column;align-items:center;gap:20px;font-family:sans-serif">
      <div style="font-size:64px">🌟</div>
      <h1 style="color:#FFD700;margin:0;font-size:28px;text-align:center">おめでとう！</h1>
      <p style="color:#CCC;text-align:center;font-size:14px;margin:0">
        すべての天使を鹵獲した。<br>人類の生存を確保した。
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        ${captured.map(id => {
          const a = getAngel(id);
          return a ? `<span style="font-size:36px;filter:drop-shadow(0 0 10px ${a.color})" title="${a.name}">${a.emoji}</span>` : '';
        }).join('')}
      </div>
      <div style="font-size:13px;color:#888;text-align:center">
        自陣HP残: ${G.player.hp} / ${G.player.maxHp}<br>
        鹵獲数: ${captured.length} / ${STAGE_ORDER.length}
      </div>
      <button class="btn btn-pink btn-lg" id="btn-clear-restart">はじめから ▶</button>
    </div>`;

    document.getElementById('btn-clear-restart')?.addEventListener('click', () => {
      initGameState();
      G.phase = 'title';
      render();
    });
  }

  /* ======================================================
     ゲームオーバー
     ====================================================== */
  function renderGameOver() {
    document.getElementById('root').innerHTML = `
    <div style="max-width:440px;margin:0 auto;padding:32px 16px;display:flex;flex-direction:column;align-items:center;gap:16px;font-family:sans-serif">
      <div style="font-size:64px">💀</div>
      <h1 style="color:#FF5E7A;margin:0;font-size:24px">ゲームオーバー</h1>
      <p style="color:#AAA;text-align:center;font-size:13px;margin:0">
        自陣HPが尽きた……。<br>人類抵抗軍は壊滅した。
      </p>
      <div style="font-size:12px;color:#666;text-align:center">
        鹵獲数: ${Object.keys(G.capturedAngels).length} / ${STAGE_ORDER.length}
      </div>
      <button class="btn btn-gold btn-lg" id="btn-retry">もう一度プレイ</button>
    </div>`;

    document.getElementById('btn-retry')?.addEventListener('click', () => {
      initGameState();
      G.phase = 'title';
      render();
    });
  }

  /* ======================================================
     尋問シーン（3パラメーターシステム + CGシステム）
     ====================================================== */

  // 表情+パラメーター → CGシーン（複合条件）
  function _getCGScene(cap, methodId) {
    if (methodId) return _METHOD_TO_SCENE[methodId] || 'captive';
    const { pain, obedience, progression, expression } = cap;
    if (expression === 'submissive' && progression >= 100) return 'bed';
    if (expression === 'submissive') return 'submissive';
    if (expression === 'broken')     return 'break';
    if (expression === 'crying')     return 'break';
    if (expression === 'excited' && obedience >= 60) return 'nipple';
    if (expression === 'excited')    return 'pleasure';
    if (expression === 'scared' && pain >= 60) return 'neck';
    if (expression === 'scared')     return 'sankaku';
    return 'captive';
  }

  // 尋問方法 → CGシーン（1対1対応）
  const _METHOD_TO_SCENE = {
    talk:    'captive',
    gift:    'captive',
    praise:  'captive',
    coddle:  'bed',        // 甘やかす → ラブホベッド
    mock:    'sankaku',    // 嘲る    → ボンデージ
    press:   'nipple',     // 追い詰める → 乳首責め
    deprive: 'anal_chain', // 感覚を奪う → アナルチェーン
    pleasure:'pleasure',   // 快楽    → 胸刺激
    command: 'submissive', // 命令    → 服従（ラブホ）
    break:   'break',      // 壊す    → 崩壊（ダンジョン）
  };

  function renderInterrogation() {
    const angelId = G._interrogatingId;
    if (!angelId) { G.phase = 'stage_select'; render(); return; }
    const angel = getAngel(angelId);
    if (!angel) { G.phase = 'stage_select'; render(); return; }

    if (!G.capturedAngels[angelId]) {
      G.capturedAngels[angelId] = { pain: 0, obedience: 0, progression: 0, expression: 'normal', scenesPlayed: [], currentScene: 'captive' };
    }
    const cap = G.capturedAngels[angelId];

    // 表情を自動決定
    if      (cap.progression >= 100) cap.expression = 'submissive';
    else if (cap.pain >= 80)          cap.expression = 'broken';
    else if (cap.pain >= 50)          cap.expression = 'crying';
    else if (cap.obedience >= 70)     cap.expression = 'submissive';
    else if (cap.progression >= 50)   cap.expression = 'excited';
    else if (cap.pain >= 20)          cap.expression = 'scared';
    else                              cap.expression = 'normal';

    // CGファイルパスを決定（lastSceneがあれば優先）
    const sceneName = cap._lastScene || _getCGScene(cap, null);
    const cgPath    = `img/scenes/${angelId}_${sceneName}.png`;

    const exprEmoji = { normal:'😐', scared:'😨', excited:'😳', broken:'💔', crying:'😭', submissive:'🥺' };
    const exprLabel = { normal:'通常', scared:'怯え', excited:'興奮', broken:'崩壊', crying:'泣き', submissive:'服従' };

    const sceneLabel = {
      captive:   '捕縛',    sankaku:   '拘束',    pleasure:  '快楽',
      break:     '崩壊',    submissive:'服従',    anal_chain:'鎖責め',
      nipple:    '乳首責め', doggy:     '後背位',  neck:      '支配',
      bed:       'ラブホ',
    };
    const sceneHint = {
      captive:   '穏やかに話すか、責め始めるか——',
      sankaku:   'さらに締め上げるか、快楽に切り替えるか——',
      pleasure:  '快楽を続けるか、より激しくするか——',
      break:     'もう少しで壊れる——手を止めるか、押し切るか——',
      submissive:'完全に支配下に置いた——望みのままに——',
      anal_chain:'感覚を奪い、意識をこちらに向けさせる——',
      nipple:    '弱点を見つけた——もっと攻めるか——',
      doggy:     '完全に制圧した——',
      neck:      '逃げ場を塞いだ——',
      bed:       '互いの距離が縮まっている——',
    };

    const isSuperMode = cap.progression >= 100;
    const isDebuffed  = cap.pain > 80;
    const st = _allyBattleStats(angelId);

    const root = document.getElementById('root');
    root.innerHTML = `
    <div style="max-width:640px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:12px;font-family:sans-serif">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn btn-ghost btn-sm" id="btn-inq-back">← 戻る</button>
        <span style="font-size:12px;color:#888">尋問: ${angel.name}</span>
      </div>

      <!-- CGパネル -->
      <div style="position:relative;width:100%;border-radius:14px;overflow:hidden;background:${angel.bgGrad || 'rgba(50,20,80,0.8)'};line-height:0;min-height:180px" id="cg-panel">
        <img id="inq-cg" src="${cgPath}" style="width:100%;display:block;object-fit:cover;object-position:top center;max-height:520px"
             onerror="document.getElementById('cg-fallback').style.display='flex';this.style.display='none'" />
        <div id="cg-fallback" style="display:none;align-items:center;justify-content:center;height:220px;font-size:90px;filter:drop-shadow(0 0 20px ${angel.color})">
          ${angel.emoji}
        </div>
        <div style="position:absolute;inset:0;background:linear-gradient(transparent 55%,rgba(0,0,0,0.92));pointer-events:none"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 16px;pointer-events:none">
          <div style="font-size:16px;font-weight:bold;color:${angel.color}">${angel.name}</div>
          <div style="font-size:11px;color:#DDD;margin-top:2px">
            ${exprLabel[cap.expression]} ${exprEmoji[cap.expression]}
            &nbsp;<span style="color:#888">|</span>&nbsp;
            <span style="color:#FFCC88">${sceneLabel[sceneName] || ''}</span>
            ${isSuperMode ? '&nbsp;<span style="color:#FFD700;font-weight:bold">💛 蹂躙モード</span>' : ''}
            ${isDebuffed && !isSuperMode ? '&nbsp;<span style="color:#FF6666">⚠️ 弱体化</span>' : ''}
          </div>
        </div>
      </div>

      <!-- 3パラメーター -->
      <div style="background:rgba(10,4,25,0.8);border:1px solid rgba(200,159,255,0.2);border-radius:12px;padding:12px 16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        ${[
          { label:'痛めつけ度', color:'#FF6666', icon:'💢', val:cap.pain,        warn:cap.pain > 80 },
          { label:'服従度',     color:'#4CFF7A', icon:'🙏', val:cap.obedience,   warn:false },
          { label:'進行度',     color:'#FFD700', icon:'💫', val:cap.progression, warn:false },
        ].map(p => `
          <div style="text-align:center">
            <div style="font-size:10px;color:#888;margin-bottom:4px">${p.icon} ${p.label}</div>
            <div style="height:6px;background:#1a1a2e;border-radius:3px;margin-bottom:4px;overflow:hidden">
              <div style="height:100%;width:${p.val}%;background:${p.warn ? '#FF4444' : p.color};border-radius:3px"></div>
            </div>
            <div style="font-size:13px;font-weight:bold;color:${p.warn ? '#FF4444' : p.color}">${p.val}<span style="font-size:10px;color:#666">/100</span></div>
          </div>`).join('')}
      </div>

      <!-- 戦闘力プレビュー -->
      <div style="font-size:11px;color:#888;background:rgba(0,0,0,0.3);border-radius:8px;padding:8px 12px">
        ⚔️ HP <span style="color:#4CFF7A">${st.hp}</span> / ATK <span style="color:#FF9988">${st.atk}</span> / DEF <span style="color:#88D8FF">${st.def}</span>
        ${isSuperMode ? '&nbsp;<span style="color:#FFD700;font-weight:bold">— 蹂躙モード</span>' : ''}
        ${isDebuffed && !isSuperMode ? '&nbsp;<span style="color:#FF6666">— 弱体化中</span>' : ''}
      </div>

      <!-- シーンヒント -->
      <div style="font-size:11px;color:#FFCC88;background:rgba(255,200,100,0.07);border:1px solid rgba(255,200,100,0.2);border-radius:8px;padding:8px 12px">
        📍 ${sceneHint[sceneName] || ''}
      </div>

      <!-- 尋問方法グリッド -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px" id="inq-method-grid">
        ${INQUISITION_METHODS.map(m => {
          const painAfter  = Math.min(100, cap.pain + m.painMod);
          const willDebuff = painAfter > 80 && cap.pain <= 80;
          const nextScene  = _METHOD_TO_SCENE[m.id] || 'captive';
          const isActive   = nextScene === sceneName;
          const painColor  = m.painMod > 0 ? '#FF6666' : m.painMod < 0 ? '#88FF88' : '#666';
          const obeyColor  = m.obeyMod > 0 ? '#4CFF7A' : m.obeyMod < 0 ? '#FF8888' : '#666';
          return `
          <button class="inq-method-btn" data-method="${m.id}" style="text-align:left;padding:10px 12px;background:${isActive ? 'rgba(255,200,100,0.08)' : 'rgba(255,255,255,0.03)'};border:1px solid ${willDebuff ? '#FF444488' : isActive ? 'rgba(255,200,100,0.35)' : 'rgba(255,255,255,0.1)'};border-radius:10px;cursor:pointer">
            <div style="font-size:15px;margin-bottom:3px">${m.icon} <span style="font-size:12px;font-weight:bold;color:#EEE">${m.name}</span></div>
            <div style="font-size:10px;display:flex;gap:6px;flex-wrap:wrap">
              ${m.painMod !== 0 ? `<span style="color:${painColor}">痛み${m.painMod > 0 ? '+' : ''}${m.painMod}</span>` : ''}
              ${m.obeyMod !== 0 ? `<span style="color:${obeyColor}">服従${m.obeyMod > 0 ? '+' : ''}${m.obeyMod}</span>` : ''}
              ${m.progMod > 0   ? `<span style="color:#FFD700">進行+${m.progMod}</span>` : ''}
              ${willDebuff ? '<span style="color:#FF4444">⚠️弱体化警告</span>' : ''}
            </div>
          </button>`;
        }).join('')}
      </div>

      <!-- ダイアログエリア -->
      <div id="inq-dialog-area" style="min-height:56px;background:rgba(10,4,25,0.85);border:1px solid rgba(200,159,255,0.2);border-radius:10px;padding:12px 14px;font-size:13px;color:#DDD;line-height:1.8;display:none"></div>
    </div>`;

    document.getElementById('btn-inq-back')?.addEventListener('click', () => {
      G.phase = 'stage_select';
      render();
    });

    document.querySelectorAll('.inq-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = INQUISITION_METHODS.find(x => x.id === btn.dataset.method);
        if (!m) return;

        cap.pain        = Math.max(0, Math.min(100, cap.pain        + m.painMod));
        cap.obedience   = Math.max(0, Math.min(100, cap.obedience   + m.obeyMod));
        cap.progression = Math.max(0, Math.min(100, cap.progression + m.progMod));
        cap._lastScene  = _getCGScene(cap, m.id);

        // CGを即時切り替え
        const newCg = document.getElementById('inq-cg');
        const fb    = document.getElementById('cg-fallback');
        if (newCg) {
          newCg.style.display = 'block';
          if (fb) fb.style.display = 'none';
          newCg.src = `img/scenes/${angelId}_${cap._lastScene}.png`;
          newCg.onerror = () => { newCg.style.display='none'; if(fb) fb.style.display='flex'; };
        }

        const dlgEl = document.getElementById('inq-dialog-area');
        if (dlgEl) {
          dlgEl.style.display = 'block';
          typewrite(dlgEl, _inqDialogue(angelId, m.id, cap), 0.03);
        }

        setTimeout(() => render(), 2400);
      });
    });
  }

  function _inqDialogue(angelId, methodId, cap) {
    const prog = cap.progression;
    const pain = cap.pain;

    const db = {
      seraphiel: {
        talk:    ['「……話すことには応じない。ただし——記録には残す。」','「……あなたの言葉は、いつも私の論理回路の外側にある。」'],
        gift:    ['「賄賂と解釈する。証拠として没収する。」','「……受け取った。裁判官として——失格だとわかっていても。」'],
        praise:  ['「賞賛は証拠にならない。」','「……称えられると、判断力が鈍る。なぜ——こんなにも。」'],
        mock:    ['「嘲りは罪の一形態だ。記録した。」','「……くっ。動揺したくないのに。なぜ、あなたの言葉だけ——。」'],
        press:   ['「強制された証言は無効だ。」','「……これが"情"というものか……私には、まだ——。」'],
        pleasure:['「な……これは法典に規定のない——んっ……！」','「……ふ……裁判官が……こんな……思考が——まとまらない……。」'],
        deprive: ['「……感覚を奪っても、法典は頭の中にある。」','「……暗闇の中で……唯一確かなのは——あなたの声だけ……。」'],
        command: ['「命令に従う義務はない。しかし——」','「……は、はい……従い……ます。裁判官として、失格だ……でも。」'],
        break:   ['「やめろ……私は揺らがない……！」','「……全てが——崩れていく。法典も、使命も……あなたのことだけが、残る。」'],
        coddle:  ['「……優しくする理由が理解できない。」','「……こんな扱いは、想定外だ。涙が——これは何だ。」'],
      },
      miriel: {
        talk:    ['「……。」','「……うん。……聞いてる。」'],
        gift:    ['「……いらない。」','「……もらって、いいの。」'],
        praise:  ['「……そうか。」','「……そんなこと……言う人、いなかった。」'],
        mock:    ['「……どうでもいい。」','「……なんで、腹が立つんだろ。」'],
        press:   ['「……嫌だ。」','「……やめて……でも、逃げられない。」'],
        pleasure:['「……っ！」','「……やめ……あっ……なんで……。」'],
        deprive: ['「……暗い。」','「……何も見えない……あなただけ……。」'],
        command: ['「……わかった。」','「……言う通りに、する。」'],
        break:   ['「……。」','「……もう、いい。好きに、して。」'],
        coddle:  ['「……触るな。」','「……温かい。……久しぶりだ、こういうの。」'],
      },
      alysia: {
        talk:    ['「話すこと？いいわよ、情報と引き換えなら。」','「……あなたと話すの、嫌いじゃないかもしれない。珍しいことね。」'],
        gift:    ['「贈り物？策略かしら。でも——受け取ってあげる。」','「……純粋に、くれるの？そういう人……初めてかも。」'],
        praise:  ['「お世辞は通じないわよ。」','「……称えられるの、嫌いじゃない。あなたに言われると、特に。」'],
        mock:    ['「失礼な人ね。でも面白い。」','「……からかわれて、笑ってしまった。どうしてかしら。」'],
        press:   ['「圧力？私が崩れると思って？」','「……ん。なんで——こんなに、揺れるのかしら。」'],
        pleasure:['「あら……んっ……プロの技ね……。」','「……ふぁ……もう……考えられない……あなた……だけ……。」'],
        deprive: ['「感覚を奪うなんて、古典的ね。」','「……あなたの声……だけが……聞こえる……それだけで——十分かも。」'],
        command: ['「命令？面白い試みね。」','「……は、はい……従います……こんな私、初めてよ。」'],
        break:   ['「崩せるものなら崩してみて。」','「……もう……全部、あなたに——預ける。」'],
        coddle:  ['「懐柔作戦？甘いわね。」','「……優しくされると——本当のことを言いたくなる。やめて。」'],
      },
      eltia: {
        talk:    ['「会話の情報価値を解析中……0.3%。継続します。」','「……あなたとの会話は、計算外の変数を生む。興味深い。」'],
        gift:    ['「物質的報酬。感情への影響度：測定不能。」','「……データにない反応が出ている。あなたのせい。」'],
        praise:  ['「客観的評価として記録する。」','「……称賛の言葉が、センサーを狂わせる。なぜ。」'],
        mock:    ['「感情的攻撃。有効性：低。」','「……くっ。エラーが出る。あなたのことを考えると。」'],
        press:   ['「物理的圧力の有効性：計算中。」','「……データが、崩れる……あなたの前でだけ。」'],
        pleasure:['「……っ！予測外の——データが——！」','「……処理が……追いつかない……あなた……だけの……変数……。」'],
        deprive: ['「感覚遮断。実験としては興味深い。」','「……暗闇で……あなたのことだけを演算している……。」'],
        command: ['「命令を受信。実行可否を判断中。」','「……了解しました。あなたの命令を——最優先に設定。」'],
        break:   ['「システムエラー……データ崩壊中……。」','「……全部……消えていい……あなたさえ……いれば……。」'],
        coddle:  ['「……これは何のプロトコル。」','「……暖かいデータ……初めて……感じた。」'],
      },
      sanctia: {
        talk:    ['「ふふ、話しかけてくれるの？優しいわね。でも——」','「……話すと、嬉しくなってしまう。これは罪かしら。」'],
        gift:    ['「まあ、これをくれるの？嬉しいわ、でも罪ね。」','「……受け取ってしまった。赦しを乞う資格も、もうないけれど。」'],
        praise:  ['「称えてくれるの？ふふ、でも……惑わせないで。」','「……称賛の言葉が、花のように咲く。あなたのせいよ。」'],
        mock:    ['「笑えばいい。でも——私の微笑みは消えない。」','「……くすくす……そんな言葉でも、あなたが言うと嬉しい。困ったわ。」'],
        press:   ['「痛い……でも……笑顔を崩さないわ。」','「……もう、笑えない……泣いてしまう……やめて……。」'],
        pleasure:['「……いやっ……んっ……こんなのは……！」','「……ふあっ……もう……笑えない……あなた……だけが……。」'],
        deprive: ['「何も見えなくても……あなたの存在は感じる。」','「……暗闇で……あなたの温もりだけを……感じている……。」'],
        command: ['「従いなさいと言うの？ふふ……では——」','「……はい……命令通りに……あなたのためなら。」'],
        break:   ['「……やめ……笑顔が……壊れる……！」','「……全部、あなたに——捧げる。赦してくれるなら。」'],
        coddle:  ['「優しくするのね……それが一番、辛いのに。」','「……こんなに優しくされたら……もう、抗えない……。」'],
      },
      verna: {
        talk:    ['「……話しかけないで。記憶が揺れる。」','「……あなたの声が……過去の誰かに似ている気がして。」'],
        gift:    ['「……いらない。思い出と引き換えにはできない。」','「……受け取った。記憶の中の誰かも、こうしてくれた。」'],
        praise:  ['「……称えないで。現実が見えなくなる。」','「……あなたの言葉だけが……今の現実に聞こえる。」'],
        mock:    ['「……嘲る人を、私は知っている。あなたは違う。」','「……くっ……それでも、あなたのことが憎めない。」'],
        press:   ['「……やめて。記憶が壊れる。」','「……もう……過去も現在も……わからなくなってきた。」'],
        pleasure:['「……っ！こんな感覚……記憶にない……！」','「……あっ……現実が……あなただけが……現実……。」'],
        deprive: ['「……暗闇は知っている。でも——これは違う暗闇。」','「……あなたの声だけが……私の現実だった。」'],
        command: ['「……命令するの。記憶の中の誰かも——」','「……従います……あなたの言葉だけが聞こえる。」'],
        break:   ['「……やめて……壊れる……記憶ごと……！」','「……全部——あなたに任せる。記憶も、現在も。」'],
        coddle:  ['「……優しくしないで。現実が分からなくなる。」','「……こんなふうに——扱われたことがあったかしら……。」'],
      },
      ragnalia: {
        talk:    ['「人間が話しかけてくるとは。度胸だけは認める。」','「……あなたとの会話が——なぜか嫌いになれない。」'],
        gift:    ['「貢物か？受け取る道理はないが——」','「……受け取った。征服者への贈り物として。」'],
        praise:  ['「称えるのか。正しい判断だ。」','「……称えられるのは当然だが……あなたに言われると……少し、違う。」'],
        mock:    ['「笑わせる。その度胸、評価する。」','「……くっ……なぜ、腹が立つ。あなたには——特別に。」'],
        press:   ['「追い詰めるつもりか。滑稽だ。」','「……ぐっ……まさか、こんな形で——膝をつくとは。」'],
        pleasure:['「な……これは……戦略として認めない——んっ……！」','「……ふあ……力が……入らない……あなた……だけに……。」'],
        deprive: ['「感覚を奪うか。古い戦術だ。」','「……暗闇で……あなたのことを考えている……敗北だな。」'],
        command: ['「命令するつもりか。笑止——」','「……わかった……従う……あなた……だけには……。」'],
        break:   ['「やめろ……まだ折れない……！」','「……全て——あなたに、捧げる。これが敗北か……。」'],
        coddle:  ['「甘やかすつもりか。不要だ。」','「……こんな優しさは……知らなかった……力が、抜ける。」'],
      },
      tifana: {
        talk:    ['「……うん、聞いてるよ。でも教えてあげない。」','「……あなたとお話するの……好きかもしれない。ふしぎ。」'],
        gift:    ['「……これ、くれるの？……受け取ったよ。」','「……ありがとう。天使ってありがとうって言っていいのかな。」'],
        praise:  ['「……えへ。でも騙されないよ。」','「……そんなこと言ってくれる人……初めてで……照れる。」'],
        mock:    ['「……ふーん。怒らないよ。」','「……くすん……なんで……ちょっと泣きそうなんだろ。」'],
        press:   ['「……やだっ……こんなのおかしい……！」','「……やめて……もう……怖い……あなただけが……怖くない……。」'],
        pleasure:['「……っ！やだ……こんなの……知らなかった……！」','「……あっ……んっ……もう……あなた……だけで……いい……。」'],
        deprive: ['「……何も見えない……でも……あなたがいる。」','「……暗いの……怖い……でも……あなたの声が……聞こえる……。」'],
        command: ['「……うん……言う通りにする……。」','「……はい……あなたの言うことだけ……聞く……。」'],
        break:   ['「……やだ……壊れちゃう……！」','「……もう……いい……あなたの……ものに……なる……。」'],
        coddle:  ['「……なんで優しくするの……ずるい……。」','「……こんなふうにされたら……もう……逃げたくない……。」'],
      },
      lumiel: {
        talk:    ['「……なんで今更、話しかけてくるんですか。」','「……あなたと話すと、変な気分になる。悪くないですけど。」'],
        gift:    ['「……受け取りません。……いえ、もらいます。」','「……ありがとう、って言うの、慣れてない。」'],
        praise:  ['「……やめてください。照れるじゃないですか。」','「……そんなふうに見てたんですか。……嬉しいです、少し。」'],
        mock:    ['「……笑えばいい。気にしません。」','「……なんで……あなたの言葉には、腹が立てない。」'],
        press:   ['「……やめてください……！こんなの……！」','「……あなたには……勝てない気がする。なんでなんですか。」'],
        pleasure:['「……っ！何をしているんですか……んっ……！」','「……ふあ……もう……考えられません……あなた……だけ……。」'],
        deprive: ['「……何も見えない……あなただけが……。」','「……暗闇で……あなたの声だけを頼りにしていた……認めます。」'],
        command: ['「……は、はい。……従います。」','「……命令するなら……あなたなら……いいです。」'],
        break:   ['「……もう……やめてください……。」','「……全部……あなたに……任せます。もう……。」'],
        coddle:  ['「……優しくしないでください。混乱します。」','「……こんなふうにされると……力が抜けていく。」'],
      },
    };

    const charDb = db[angelId];
    const opts   = charDb ? (charDb[methodId] || ['「……」','「……」']) : ['「……」','「……」'];
    return prog > 60 ? opts[1] : opts[0];
  }

  /* ======================================================
     Public
     ====================================================== */
  return {
    renderTitle,
    renderStory,
    renderTutorialPrep,
    renderStageSelect,
    renderStagePrep,
    renderStageClear,
    renderStageDefeat,
    renderGameClear,
    renderInterrogation,
    renderGameOver,
  };
})();

/* ======================================================
   メインレンダラー  (main.js から呼ばれる)
   ====================================================== */
function render() {
  try {
    const _root = document.getElementById('root');
    if (_root) _root.onclick = null;

    switch (G.phase) {
      case 'title':         Scenes.renderTitle();          break;
      case 'story':         Scenes.renderStory();          break;
      case 'tutorial_prep': Scenes.renderTutorialPrep();   break;
      case 'stage_select':  Scenes.renderStageSelect();    break;
      case 'stage_prep':    Scenes.renderStagePrep();      break;
      case 'battle':        /* RPGBattle が DOM を管理 */   break;
      case 'stage_clear':   Scenes.renderStageClear();     break;
      case 'stage_defeat':  Scenes.renderStageDefeat();    break;
      case 'interrogation': Scenes.renderInterrogation();  break;
      case 'game_over':     Scenes.renderGameOver();       break;
      case 'game_clear':    Scenes.renderGameClear();      break;
      default:              Scenes.renderStageSelect();    break;
    }
  } catch (e) {
    document.getElementById('root').innerHTML = `
    <div style="padding:30px;color:#FF5E7A;font-family:monospace">
      <h2>⚠️ レンダリングエラー (phase: ${G.phase})</h2>
      <pre style="margin-top:12px;font-size:12px;white-space:pre-wrap;color:#EEE">${e.stack || e.message}</pre>
      <button style="margin-top:20px;padding:10px 24px;background:#C89FFF;color:#1a0a2e;border:none;border-radius:20px;cursor:pointer;font-size:14px" onclick="G.phase='stage_select';render()">ステージ選択へ戻る</button>
    </div>`;
    console.error('[render]', e);
  }
}
