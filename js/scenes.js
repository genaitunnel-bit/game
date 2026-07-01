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

  function statusBar() {
    const allies = G.allies.filter(a => a.recruited);
    return `
    <div id="status-bar">
      <span class="stat-chip">🏰 自陣 <span class="stat-val">${G.player.baseHp}/${G.player.baseMaxHp}</span></span>
      <span class="stat-chip">💰 <span class="stat-val">${G.player.gold}G</span></span>
      <span class="stat-chip">📋 情報 <span class="stat-val">${G.intel.length}</span></span>
      <span class="stat-chip">🕊️ 仲間 <span class="stat-val">${allies.length}</span></span>
      <span class="stat-chip">🔄 第 <span class="stat-val">${G.turn}</span> 戦</span>
      <span class="game-title">情報戦略 ～Secret Hearts～</span>
    </div>`;
  }

  function intelCardHtml(intel, showNew) {
    const catClass = intel.cat === 'weakness' ? 'weakness' : intel.cat === 'own' ? 'own' : '';
    return `
    <div class="intel-card ${catClass} ${showNew && intel.isNew ? 'new' : ''}">
      <div class="intel-hdr">
        <span class="intel-name">${intel.name}</span>
        <span class="intel-acc" style="color:${accColor(intel.accuracy)}">確度 ${intel.accuracy}%</span>
      </div>
      <div class="intel-body">${intel.content}</div>
      <div class="intel-meta">情報源: ${intel.from} ／ 方法: ${intel.method}</div>
      ${intel.unlocks && intel.unlocks.length > 0
        ? `<div class="text-dim" style="margin-top:4px">📍 アンロック: ${intel.unlocks.map(id => getLocation(id)?.name || id).join('、')}</div>`
        : ''}
    </div>`;
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
        G.phase = 'map';
        setSystemDlg('ルミエル', '……まず「審判の法廷」に行きましょう。セラフィエルが処理命令の鍵を握っています。', '#B8E4FF');
      }
      render();
    };
  }

  /* ======================================================
     マップ画面
     ====================================================== */
  function renderMap() {
    const prisoners = G.prisoners;
    const allies    = G.allies.filter(a => a.recruited);
    const locCards  = LOCATIONS.map(loc => {
      const unlocked = isLocUnlocked(loc);
      const cleared  = G.clearedLocs.has(loc.id);
      const cls      = cleared ? 'cleared' : unlocked ? 'available' : 'locked';
      const missing  = loc.reqIntel.filter(id => !hasIntel(id));

      return `
      <div class="loc-card ${cls}" data-loc-id="${loc.id}" data-available="${unlocked && !cleared}">
        ${!unlocked ? '<div class="lock-badge">🔒</div>' : ''}
        <div class="loc-icon">${loc.icon}</div>
        <div class="loc-name">${loc.name}</div>
        <div class="loc-desc">${loc.desc}</div>
        ${cleared ? '<div class="chip">✅ 制圧済</div>' : ''}
        ${!unlocked && missing.length > 0
          ? `<div class="loc-req">必要情報: ${missing.map(id => INTEL_POOL.find(t=>t.id===id) ? INTEL_POOL.find(t=>t.id===id).name : id).join('、')}</div>`
          : ''}
        ${unlocked && !cleared
          ? `<button class="btn btn-lavender btn-sm loc-sortie-btn" data-loc-id="${loc.id}">出撃</button>`
          : ''}
      </div>`;
    }).join('');

    document.getElementById('root').innerHTML = `
    ${statusBar()}
    <div id="scene-map">
      <div class="map-content">
        <div class="phase-hdr"><h2>🗺️ 世界地図</h2><span class="sub">情報を集めて拠点をアンロックせよ</span></div>

        <div class="map-grid">${locCards}</div>

        ${prisoners.length > 0 ? `
        <div>
          <div class="section-label">🔗 捕虜（尋問待ち）</div>
          <div class="prisoner-queue" id="prisoner-queue">
            ${prisoners.map(id => {
              const a = getAngel(id);
              return `<button class="btn btn-pink prisoner-btn" data-angel-id="${id}">${a.emoji} ${a.name} を尋問する</button>`;
            }).join('')}
          </div>
        </div>` : ''}

        ${allies.length > 0 ? `
        <div>
          <div class="section-label">✨ 仲間になった天使</div>
          <div class="ally-row">
            ${allies.map(al => {
              const a = getAngel(al.id);
              return `<div class="ally-chip">${a.emoji} <strong>${a.name}</strong><span class="a-bonus">${a.recruitBonus}</span></div>`;
            }).join('')}
          </div>
        </div>` : ''}

        ${G.intel.length > 0 ? `
        <div>
          <div class="section-label" style="display:flex;justify-content:space-between;align-items:center">
            📋 収集済み情報
            <button class="btn btn-ghost btn-sm" id="btn-intel-view">一覧を見る</button>
          </div>
          ${G.intel.slice(-3).map(i => intelCardHtml(i, false)).join('')}
        </div>` : ''}
      </div>
    </div>`;

    // 捕虜ボタンを JS でバインド（onclick 属性を使わない）
    const pq = document.getElementById('prisoner-queue');
    if (pq) {
      pq.querySelectorAll('.prisoner-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Interrogation.begin(btn.dataset.angelId);
        });
      });
    }

    // 出撃ボタン
    document.querySelectorAll('.loc-sortie-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        App.openLocation(btn.dataset.locId);
      });
    });
    document.querySelectorAll('.loc-card[data-available="true"]').forEach(card => {
      card.addEventListener('click', () => App.openLocation(card.dataset.locId));
    });

    // 情報一覧
    const intelViewBtn = document.getElementById('btn-intel-view');
    if (intelViewBtn) intelViewBtn.addEventListener('click', () => { G.phase = 'intelView'; render(); });

    // Dialogue toast at bottom if exists
    const dlg = getDlg();
    if (dlg.text) {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:10;width:90%;max-width:640px;';
      toast.innerHTML = `
      <div style="background:rgba(10,4,25,.95);border:1px solid var(--border);border-radius:14px;padding:12px 18px;backdrop-filter:blur(8px)">
        ${dlg.speaker ? `<span style="font-size:12px;font-weight:700;color:${dlg.color};margin-bottom:4px;display:block">${dlg.speaker}</span>` : ''}
        <div id="toast-text" style="font-size:14px;line-height:1.8">${dlg.text}</div>
      </div>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    }
  }

  /* ======================================================
     戦闘前ブリーフィング（ファイアーエムブレム式・仲間選択）
     ====================================================== */
  function renderPreBattle(locationId) {
    const loc   = getLocation(locationId);
    const angel = getAngel(loc.angelId);
    const recruitedAllies = G.allies
      .filter(a => a.recruited)
      .map(a => getAngel(a.id))
      .filter(Boolean);
    const equipIds = [...new Set(G.inventory.filter(id => {
      const d = getItemDef(id);
      return d && d.cat === 'equipment' && !['gold_bonus','base_hp'].includes(d.effect);
    }))];

    const party = { allyIds: [], itemIds: [] };

    function allyCardHtml(a) {
      return `
      <button class="btn btn-ghost ally-sel-btn" data-ally-id="${a.id}" style="
        display:flex;align-items:center;gap:10px;padding:8px 14px;min-width:190px;
        border:1px solid rgba(200,159,255,0.25);border-radius:10px;text-align:left">
        <span style="font-size:22px">${a.emoji}</span>
        <span>
          <strong style="color:${a.color}">${a.name}</strong><br>
          <span style="font-size:11px;color:var(--dim)">HP:${a.hp} 攻:${a.atk} 防:${a.def} 速:${a.spd}</span>
        </span>
      </button>`;
    }

    document.getElementById('root').innerHTML = `
    ${statusBar()}
    <div class="prebattle-overlay">
      <div class="prebattle-box" style="max-width:820px">
        <h2>⚔️ 出撃ブリーフィング — ${loc.name}</h2>
        <div style="font-size:13px;color:var(--dim);text-align:center;margin-bottom:14px">
          ターン制シミュレーション。指揮官を守りつつ、目標天使のHPを30%以下にして隣接して捕縛せよ。
        </div>

        <div class="prebattle-combatants">
          <div class="combatant-card player">
            <div class="cc-emoji">${PLAYER_UNIT.emoji}</div>
            <div class="cc-name">${PLAYER_UNIT.name}</div>
            <div class="cc-stats">
              <div class="stat-row"><span>HP</span><span class="sv">${PLAYER_UNIT.hp}</span></div>
              <div class="stat-row"><span>攻撃</span><span class="sv">${PLAYER_UNIT.atk}</span></div>
              <div class="stat-row"><span>防御</span><span class="sv">${PLAYER_UNIT.def}</span></div>
              <div class="stat-row"><span>移動</span><span class="sv">${PLAYER_UNIT.mov}</span></div>
            </div>
          </div>
          <div class="vs-badge">VS</div>
          <div class="combatant-card enemy">
            <div class="cc-emoji">${angel.emoji}</div>
            <div class="cc-name" style="color:${angel.color}">${angel.name}<br><small>${angel.title}</small></div>
            <div class="cc-stats">
              <div class="stat-row"><span>HP</span><span class="sv">${angel.hp}</span></div>
              <div class="stat-row"><span>攻撃</span><span class="sv">${angel.atk}</span></div>
              <div class="stat-row"><span>防御</span><span class="sv">${angel.def}</span></div>
              <div class="stat-row"><span>護衛</span><span class="sv">9体</span></div>
            </div>
          </div>
        </div>

        ${recruitedAllies.length > 0 ? `
        <div style="margin:14px 0">
          <div class="section-label">✨ 仲間を選ぶ（最大3人）</div>
          <div id="ally-select" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
            ${recruitedAllies.map(allyCardHtml).join('')}
          </div>
        </div>` : `<div style="color:var(--dim);font-size:13px;margin:10px 0;text-align:center">
          仲間はまだいない。天使を尋問して招集しよう。
        </div>`}

        ${equipIds.length > 0 ? `
        <div style="margin:14px 0">
          <div class="section-label">🎒 装備アイテムを持っていく（複数可）</div>
          <div id="item-select" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
            ${equipIds.map(id => {
              const d = getItemDef(id);
              return `<button class="btn btn-ghost item-sel-btn" data-item-id="${id}" style="
                padding:6px 12px;border:1px solid rgba(100,220,100,0.25);border-radius:8px;text-align:left">
                ${d.icon} <strong>${d.name}</strong>
                <span style="font-size:11px;color:var(--dim);display:block">${d.desc}</span>
              </button>`;
            }).join('')}
          </div>
        </div>` : ''}

        <div class="row" style="justify-content:center;gap:14px;margin-top:18px">
          <button class="btn btn-lavender btn-lg" id="btn-fe-sortie">⚔️ 出撃！（仲間 0人）</button>
          <button class="btn btn-ghost" id="btn-cancel-battle">← キャンセル</button>
        </div>
      </div>
    </div>`;

    // 仲間ボタン
    document.getElementById('ally-select')?.querySelectorAll('.ally-sel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id  = btn.dataset.allyId;
        const idx = party.allyIds.indexOf(id);
        if (idx >= 0) {
          party.allyIds.splice(idx, 1);
          btn.style.background = '';
          btn.style.borderColor = 'rgba(200,159,255,0.25)';
        } else if (party.allyIds.length < 3) {
          party.allyIds.push(id);
          btn.style.background = 'rgba(200,159,255,0.2)';
          btn.style.borderColor = 'rgba(200,159,255,0.7)';
        }
        const sortieBtn = document.getElementById('btn-fe-sortie');
        if (sortieBtn) sortieBtn.textContent = `⚔️ 出撃！（仲間 ${party.allyIds.length}人）`;
      });
    });

    // 装備アイテムボタン
    document.getElementById('item-select')?.querySelectorAll('.item-sel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id  = btn.dataset.itemId;
        const idx = party.itemIds.indexOf(id);
        if (idx >= 0) {
          party.itemIds.splice(idx, 1);
          btn.style.background = '';
          btn.style.borderColor = 'rgba(100,220,100,0.25)';
        } else {
          party.itemIds.push(id);
          btn.style.background = 'rgba(100,220,100,0.15)';
          btn.style.borderColor = 'rgba(100,220,100,0.7)';
        }
      });
    });

    document.getElementById('btn-fe-sortie').addEventListener('click', () => App.startBattle(locationId, party));
    document.getElementById('btn-cancel-battle').addEventListener('click', () => { G.phase = 'map'; render(); });
  }

  /* ======================================================
     ファイアーエムブレム式ターン制戦闘画面
     ====================================================== */

  function _removeFEHUD() {
    const el = document.getElementById('fe-hud');
    if (el) el.remove();
  }

  function renderBattle(locationId, partyConfig) {
    const loc   = getLocation(locationId);
    const angel = getAngel(loc.angelId);
    partyConfig = partyConfig || { allyIds: [], itemIds: [] };

    recalcDropBoost();

    // キャンバスを準備（前の戦闘でDOMから削除されている場合は再作成）
    let canvas = document.getElementById('battle-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'battle-canvas';
      document.body.appendChild(canvas);
    }
    canvas.style.cssText = [
      'position:fixed','top:0','left:0','width:100vw',
      'height:calc(100vh - 60px)','z-index:15','display:block','cursor:crosshair',
    ].join(';') + ';';

    document.getElementById('root').innerHTML =
      '<div style="position:fixed;inset:0;background:#0a1520;z-index:5"></div>';

    _removeFEHUD();

    // 仲間ユニット組み立て
    const alliedAngels = (partyConfig.allyIds || [])
      .map(id => getAngel(id)).filter(Boolean)
      .map(a => ({
        id:a.id, name:a.name, emoji:a.emoji, color:a.color,
        hp:a.hp, atk:a.atk, def:a.def, spd:a.spd,
        mov:a.mov||4, rng:a.rng||1,
      }));

    // 装備効果組み立て
    const equipEffects = [];
    for (const itemId of (partyConfig.itemIds || [])) {
      const d = getItemDef(itemId);
      if (d && d.effect) equipEffects.push({ type: d.effect, value: d.value });
    }

    // FE HUD（body直下に追加）
    const hudEl = document.createElement('div');
    hudEl.id = 'fe-hud';
    hudEl.style.cssText = [
      'position:fixed','bottom:0','left:0','right:0','z-index:100',
      'display:flex','align-items:center','gap:10px','padding:8px 12px',
      'background:rgba(8,4,20,0.97)','border-top:1px solid rgba(200,159,255,0.25)',
      'flex-wrap:wrap','min-height:56px','font-size:13px',
    ].join(';') + ';';
    hudEl.innerHTML = `
      <div id="fe-phase" style="padding:4px 10px;background:rgba(60,120,255,0.2);border-radius:6px;font-weight:bold;color:#80B0FF;white-space:nowrap">
        プレイヤーフェーズ　ターン 1
      </div>
      <div id="fe-unit-info" style="flex:1;min-width:160px;color:#CCC">
        <span style="color:var(--dim)">ユニットを選択してください</span>
      </div>
      <div id="fe-action-btns" style="display:flex;gap:6px"></div>
      <div id="fe-item-btns"   style="display:flex;gap:6px"></div>
      <div id="fe-enemy-count" style="color:var(--dim);white-space:nowrap">敵: 10体</div>
      <button id="fe-retreat-btn" style="padding:5px 12px;background:rgba(200,60,60,0.3);border:1px solid rgba(200,60,60,0.5);color:#FF9090;border-radius:6px;cursor:pointer">撤退</button>`;
    document.body.appendChild(hudEl);

    hudEl.querySelector('#fe-retreat-btn').addEventListener('click', () => {
      FEBattle.stopBattle();
      _removeFEHUD();
      document.getElementById('battle-canvas')?.remove();
      G.phase = 'map';
      setSystemDlg('システム', '撤退した。また準備を整えて挑もう。', 'var(--gold)');
      render();
    });

    // 戦闘アイテムボタン
    const battleItems    = G.inventory.filter(id => { const d = getItemDef(id); return d && d.cat === 'battle'; });
    const uniqueBattleIds = [...new Set(battleItems)];
    const itemBtnsEl     = hudEl.querySelector('#fe-item-btns');
    uniqueBattleIds.forEach(id => {
      const d   = getItemDef(id);
      const cnt = battleItems.filter(x => x === id).length;
      const btn = document.createElement('button');
      btn.textContent = `${d.icon} ${d.name} ×${cnt}`;
      btn.style.cssText = 'padding:4px 10px;background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.3);border-radius:6px;color:#FFD700;cursor:pointer;font-size:12px';
      btn.addEventListener('click', () => {
        if (!removeItemFromInventory(id)) return;
        FEBattle.useBattleItem(id);
        const rem = G.inventory.filter(x => x === id).length;
        if (rem <= 0) btn.remove();
        else btn.textContent = `${d.icon} ${d.name} ×${rem}`;
      });
      itemBtnsEl.appendChild(btn);
    });

    // FEBattle 起動
    FEBattle.startBattle(canvas, {
      commanderUnit: PLAYER_UNIT,
      allies:        alliedAngels,
      equipEffects,
      enemyLayout:   loc.enemyLayout,
      angel: {
        name:angel.name, emoji:angel.emoji, color:angel.color,
        hp:angel.hp, atk:angel.atk, def:angel.def, spd:angel.spd,
        mov:angel.mov||3, rng:angel.rng||1,
      },
    }, {
      onHUDUpdate({ phase, turnNum, units, selected, pendingMove, canCapture, enemyCount }) {
        const phaseEl  = document.getElementById('fe-phase');
        const unitInfo = document.getElementById('fe-unit-info');
        const actionEl = document.getElementById('fe-action-btns');
        const cntEl    = document.getElementById('fe-enemy-count');

        if (phaseEl) {
          const isPlayer = phase === 'player';
          phaseEl.style.background = isPlayer ? 'rgba(60,120,255,0.2)' : 'rgba(200,40,40,0.2)';
          phaseEl.style.color      = isPlayer ? '#80B0FF' : '#FF8080';
          phaseEl.textContent = `${isPlayer ? '▶ プレイヤー' : '🔴 敵'}フェーズ　ターン ${turnNum}`;
        }
        if (cntEl) cntEl.textContent = `敵: ${enemyCount}体`;

        if (unitInfo && selected) {
          const st   = FEBattle.getState();
          const unit = st ? st.units.find(u => u.id === selected && !u.dead) : null;
          if (unit) {
            const hpColor = unit.hp/unit.maxHp > 0.5 ? '#4CFF7A' : unit.hp/unit.maxHp > 0.25 ? '#FFD700' : '#FF4444';
            unitInfo.innerHTML = `
              <span style="margin-right:8px">${unit.emoji} <strong>${unit.name}</strong></span>
              <span style="color:${hpColor}">HP ${unit.hp}/${unit.maxHp}</span>
              <span style="margin-left:8px;color:var(--dim)">攻:${unit.atk} 防:${unit.def} 速:${unit.spd}</span>`;
          }
        } else if (unitInfo) {
          unitInfo.innerHTML = '<span style="color:var(--dim)">ユニットを選択してください</span>';
        }

        if (actionEl) {
          actionEl.innerHTML = '';
          if (phase === 'player') {
            if (canCapture) {
              const capBtn = _makeHudBtn('🔗 捕縛！', '#FFD700', 'rgba(255,215,0,0.3)', '#FFD700');
              capBtn.style.fontWeight = 'bold';
              capBtn.onclick = () => FEBattle.doCapture();
              actionEl.appendChild(capBtn);
            }
            if (pendingMove) {
              const waitBtn = _makeHudBtn('待機', '#AAB8FF', 'rgba(100,100,200,0.3)', 'rgba(100,100,200,0.5)');
              waitBtn.onclick = () => FEBattle.selectWait();
              actionEl.appendChild(waitBtn);
            }
            const endBtn = _makeHudBtn('ターン終了 ▶', '#80FF80', 'rgba(60,200,60,0.2)', 'rgba(60,200,60,0.4)');
            endBtn.onclick = () => FEBattle.endPlayerTurn();
            actionEl.appendChild(endBtn);
          }
        }
      },

      onBossCaptureable({ boss }) {
        setSystemDlg('捕縛チャンス！', `${boss.name}のHPが30%以下！隣接して「捕縛」ボタンを押せ！`, 'var(--gold)');
      },

      onPlayerPhaseStart({ turn }) {
        setSystemDlg('フェーズ', `ターン ${turn}　プレイヤーフェーズ`, 'var(--lavender)');
      },

      onAllActed() {
        setSystemDlg('行動完了', '全ユニットが行動済み。「ターン終了」ボタンを押してください。', 'var(--green)');
      },

      onBattleEnd({ victory }) {
        _removeFEHUD();
        document.getElementById('battle-canvas')?.remove();

        if (victory) {
          const intelIds = G.intel.filter(i => i.isTrue).map(i => i.id);
          const drops    = rollDrops(loc, intelIds, G.dropBoostMult);
          applyDrops(drops);
          G._battleDrops = drops;
          onCapture(locationId, angel.id);
        } else {
          G.player.baseHp = Math.max(0, G.player.baseHp - 30);
          const defeatEl  = document.createElement('div');
          defeatEl.id     = 'fe-defeat-screen';
          defeatEl.style.cssText = 'position:fixed;inset:0;background:rgba(10,4,25,0.97);z-index:200;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px';
          defeatEl.innerHTML = `
            <div style="font-size:52px">💀</div>
            <h2 style="color:#FF5E7A;font-size:28px;margin:0">敗北</h2>
            <p style="color:#aaa;font-size:15px;text-align:center;max-width:360px">
              指揮官が倒された……。<br>
              自陣HP: <span style="color:#FF5E7A">${G.player.baseHp}/${G.player.baseMaxHp}</span>
            </p>
            <button id="btn-fe-defeat-back" style="padding:12px 32px;background:linear-gradient(135deg,#7B5EA7,#C89FFF);color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer">
              マップへ戻る
            </button>`;
          document.body.appendChild(defeatEl);
          document.getElementById('btn-fe-defeat-back').addEventListener('click', () => {
            defeatEl.remove();
            setSystemDlg('敗北', '指揮官が倒された……態勢を立て直せ。', 'var(--red)');
            G.phase = 'map';
            render();
          });
        }
      },
    });
  }

  function _makeHudBtn(label, color, bg, border) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `padding:5px 12px;background:${bg};border:1px solid ${border};border-radius:6px;color:${color};cursor:pointer;font-size:12px`;
    return b;
  }

  function onCapture(locationId, angelId) {
    G.clearedLocs.add(locationId);
    if (!G.prisoners.includes(angelId)) G.prisoners.push(angelId);
    G.turn++;

    const angel = getAngel(angelId);
    // Retaliation
    const retDmg = Math.round(20 + Math.random() * 20);
    G.player.baseHp = Math.max(0, G.player.baseHp - retDmg);

    G.phase = 'capture';
    G._capturedId = angelId;
    G._retDmg     = retDmg;
    render();
  }

  /* ======================================================
     捕縛シーン
     ====================================================== */
  function renderCapture() {
    const angel = getAngel(G._capturedId);
    document.getElementById('root').innerHTML = `
    ${statusBar()}
    <div class="capture-prompt">
      <div class="capture-box">
        <div class="capture-emoji">${angel.emoji}</div>
        <div class="capture-name" style="color:${angel.color}">${angel.name}を捕縛！</div>
        <div style="font-size:14px;color:var(--dim);margin:12px 0">
          ${angel.title}を確保。尋問が可能になった。<br>
          <span style="color:var(--red)">⚡ 敵の報復: 自陣に ${G._retDmg} ダメージ</span><br>
          <span style="color:var(--dim)">自陣HP: ${G.player.baseHp}/${G.player.baseMaxHp}</span>
          ${G._battleDrops && G._battleDrops.length > 0 ? `
          <div style="margin-top:10px;padding:10px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:8px">
            <div style="color:#FFD700;font-weight:bold;margin-bottom:6px">📦 ドロップアイテム</div>
            ${G._battleDrops.map(id => { const d=getItemDef(id); return d?`<span style="margin:3px;padding:3px 8px;background:rgba(255,255,255,0.08);border-radius:5px;font-size:13px">${d.icon} ${d.name}</span>`:''; }).join('')}
          </div>` : ''}
        </div>
        <div class="row" style="justify-content:center;gap:12px;margin-top:16px">
          <button class="btn btn-pink" id="btn-do-interrogate">🗣️ すぐ尋問する</button>
          <button class="btn btn-ghost" id="btn-back-to-map">🗺️ マップへ戻る</button>
        </div>
      </div>
    </div>`;

    document.getElementById('btn-do-interrogate').addEventListener('click', () => {
      G._battleDrops = null;
      Interrogation.begin(angel.id);
    });
    document.getElementById('btn-back-to-map').addEventListener('click', () => {
      G._battleDrops = null;
      G.phase = 'map'; render();
    });
  }

  /* ======================================================
     尋問シーン
     ====================================================== */
  function renderInterrogation() {
    const iq    = Interrogation.getState();
    const angelId = G.interrogation?.angelId;
    if (!angelId) { G.phase = 'map'; render(); return; }

    const angel = getAngel(angelId);
    const ally  = getAllyEntry(angelId);
    const dlg   = getDlg();
    const trust = ally.trust;
    const fear  = ally.fear || 0;

    // Emotion → portrait class
    const emoCls = dlg.emotionClass || '';

    document.getElementById('root').innerHTML = `
    ${statusBar()}
    <div id="scene-interrogation">
      <div class="interro-layout">

        <!-- 左：ポートレート + メーター -->
        <div class="interro-portrait-col">
          <div class="portrait-frame ${emoCls}" id="portrait-frame">
            <div class="portrait-bg" style="background:${angel.bgGrad}"></div>
            <div class="emotion-badge" id="emotion-badge">${emotionEmoji(emoCls)}</div>
            ${angel.portrait
              ? `<img class="portrait-img" src="${angel.portrait}"
                   onerror="this.style.display='none';document.getElementById('portrait-emoji-fb-${angelId}').style.display='block'"
                   alt="${angel.name}">
                 <div class="portrait-emoji" id="portrait-emoji-fb-${angelId}" style="display:none">${angel.emoji}</div>`
              : `<div class="portrait-emoji">${angel.emoji}</div>`}
            <div class="portrait-nameplate">
              <div class="pn-name" style="color:${angel.color}">${angel.name}</div>
              <div class="pn-title">${angel.title}</div>
            </div>
          </div>

          <div class="meter-group">
            <div class="section-label">好感度</div>
            <div class="meter-row">
              <div class="meter-label">
                <span class="m-name">信頼度</span>
                <span class="m-val" style="color:var(--green)">${trust}%</span>
              </div>
              <div class="meter-bar-wrap"><div class="meter-fill fill-trust" style="width:${trust}%"></div></div>
            </div>
            <div class="meter-row">
              <div class="meter-label">
                <span class="m-name">恐怖度</span>
                <span class="m-val" style="color:var(--red)">${fear}%</span>
              </div>
              <div class="meter-bar-wrap"><div class="meter-fill fill-fear" style="width:${fear}%"></div></div>
            </div>
          </div>

          <div style="font-size:13px;color:var(--dim);text-align:center">
            <div style="color:${angel.color};font-size:18px;letter-spacing:2px">${relHeart(trust)}</div>
            尋問 ${ally.sessions || 0} 回目
          </div>

          <button class="btn btn-ghost btn-sm" id="btn-leave-interro">← マップへ戻る</button>
        </div>

        <!-- 中央：台詞 + トピック一覧 -->
        <div class="interro-center-col">
          <div class="interro-dlg-area">
            ${dlg.speaker ? `<div class="dlg-speaker-plate" style="background:${dlg.color};color:#1a0a2e">${dlg.speaker}</div>` : ''}
            <div class="dlg-body" id="dlg-body">${dlg.text}</div>
          </div>

          <div class="interro-topics" id="interro-topics">
            <div class="topic-section-label">── 話題を選ぶ ──</div>
            ${Object.entries(angel.topics).map(([key, topic]) => {
              const minReq = topic.minTrustRequired || 0;
              const locked = trust < minReq;
              const revealed = ally.revealedTopics ? ally.revealedTopics.has(key) : false;
              const selected = iq ? iq.selectedTopic === key : false;
              return `
              <button class="topic-btn ${locked ? 'locked' : ''} ${revealed ? 'revealed' : ''} ${selected ? 'selected' : ''}"
                data-topic-key="${key}" ${locked ? 'disabled' : ''}>
                <span class="t-label">${topic.icon || '💬'} ${topic.label}</span>
                <span>
                  ${locked ? `<span class="t-trust-req">🔒 信頼度 ${minReq} 必要</span>` : ''}
                  ${revealed ? '<span class="t-check">✓</span>' : ''}
                </span>
              </button>`;
            }).join('')}
          </div>

          <!-- 既知情報チップ -->
          <div class="knowledge-log">
            <span class="kl-label">入手済:</span>
            ${G.intel.filter(i => (angel.knownIntel ? angel.knownIntel.includes(i.id) : false) || i.id === angel.weaknessId)
              .map(i => `<span class="kl-chip">✓ ${i.name}</span>`).join('') || '<span class="text-dim">なし</span>'}
          </div>
        </div>

        <!-- 右：尋問方法 -->
        <div class="interro-method-col">
          <div class="method-header">── 尋問方法 ──</div>
          <div id="method-list">
          ${METHODS.map(m => {
            const canAfford = !m.cost || m.cost <= G.player.gold;
            const selected  = iq ? iq.selectedMethod === m.id : false;
            return `
            <button class="method-btn ${selected ? 'selected' : ''}" data-method-id="${m.id}"
              ${!canAfford ? 'disabled' : ''}>
              <div class="mb-icon">${m.icon}</div>
              <div class="mb-name">${m.name}</div>
              ${m.cost ? `<div class="mb-cost">💰 ${m.cost}G</div>` : ''}
              <div class="mb-effect">
                <span class="pos">${m.posText}</span>
                ${m.negText ? `<br><span class="neg">${m.negText}</span>` : ''}
                ${!canAfford ? '<br><span class="neg">ゴールド不足</span>' : ''}
              </div>
            </button>`;
          }).join('')}
          </div>

          <!-- 尋問アイテムセクション -->
          ${(() => {
            const interroItems = G.inventory.filter(id => { const d=getItemDef(id); return d&&d.cat==='interrogation'; });
            const uniqueIds    = [...new Set(interroItems)];
            if (uniqueIds.length === 0) return '';
            return `<div class="method-header" style="margin-top:10px">── 尋問アイテム ──</div>
              <div id="interro-item-list" style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0">
              ${uniqueIds.map(id=>{
                const d=getItemDef(id);
                const cnt=interroItems.filter(x=>x===id).length;
                return `<button class="interro-item-btn" data-item-id="${id}" style="
                  display:flex;align-items:center;gap:6px;padding:6px 10px;
                  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);
                  border-radius:8px;cursor:pointer;font-size:12px;color:#E8E0F8;
                  " title="${d.desc}">
                  ${d.icon} ${d.name} ×${cnt}
                </button>`;
              }).join('')}
              </div>`;
          })()}

          <div class="exec-area">
            <button class="btn btn-pink btn-full" id="btn-execute"
              ${(!iq || !iq.selectedTopic || !iq.selectedMethod) ? 'disabled' : ''}>
              実行する ▶
            </button>
          </div>
        </div>
      </div>
    </div>`;

    // ---- JS バインド ----
    document.getElementById('btn-leave-interro').addEventListener('click', () => {
      Interrogation.leaveInterrogation();
    });

    document.getElementById('interro-topics').querySelectorAll('.topic-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => Interrogation.selectTopic(btn.dataset.topicKey));
    });

    document.getElementById('method-list').querySelectorAll('.method-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => Interrogation.selectMethod(btn.dataset.methodId));
    });

    document.getElementById('btn-execute').addEventListener('click', () => {
      Interrogation.execute();
    });

    // 尋問アイテム使用
    const itemListEl = document.getElementById('interro-item-list');
    if (itemListEl) {
      itemListEl.querySelectorAll('.interro-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.itemId;
          if (!removeItemFromInventory(id)) return;
          const d = getItemDef(id);
          const ally = getAllyEntry(angelId);
          if (d.trustMod)    ally.trust = Math.min(100, ally.trust + d.trustMod);
          if (d.fearMod)     ally.fear  = Math.min(100, (ally.fear||0) + d.fearMod);
          if (d.infoAccMod) {
            // Reflect in system dialog
          }
          setSystemDlg(angel.name, `${d.name}を渡した。${d.trustMod>0?`信頼度 +${d.trustMod}`:''}${d.fearMod>0?` 恐怖度 +${d.fearMod}`:''}`, angel.color);

          // Check event trigger
          const evtList2 = (typeof INTERROGATION_EVENTS !== 'undefined') ? INTERROGATION_EVENTS[angelId] : null;
          if (evtList2) {
            for (const evt of evtList2) {
              if (ally.trust >= evt.minTrust && !G.seenEvents.has(evt.id)) {
                setTimeout(() => Scenes.showEventScene(angelId, evt.id), 700);
                break;
              }
            }
          }
          render();
        });
      });
    }

    // typewriter for dialogue
    setTimeout(() => typewrite(document.getElementById('dlg-body'), dlg.text, 0.035), 50);
  }

  function emotionEmoji(cls) {
    const map = { sad:'😢', conflicted:'😟', firm:'😤', angry:'😠', happy:'😊', tearful:'😭', uncertain:'😕', broken:'💔', nostalgic:'🌸', worried:'😟', urgent:'❗', resigned:'😔', '':'😐' };
    return map[cls] || '😐';
  }

  /* ======================================================
     イベントシーンオーバーレイ
     ====================================================== */
  function showEventScene(angelId, eventId) {
    const evtList = INTERROGATION_EVENTS[angelId];
    if (!evtList) return;
    const evt = evtList.find(e => e.id === eventId);
    if (!evt) return;
    if (G.seenEvents.has(eventId)) return;

    const angel = getAngel(angelId);
    G.seenEvents.add(eventId);
    G.eventScene = { angelId, eventId, lineIdx: 0 };

    function renderLine(idx) {
      const existing = document.getElementById('event-overlay');
      if (existing) existing.remove();

      if (idx >= evt.lines.length) {
        // Scene complete
        const ally = getAllyEntry(angelId);
        ally.trust = Math.min(100, ally.trust + (evt.trustBonus || 0));
        G.eventScene = null;
        render();
        return;
      }

      const line   = evt.lines[idx];
      const isAngel = line.speaker !== '指揮官';
      const portraitHTML = isAngel && angel.portrait
        ? `<img id="event-portrait-img" src="${angel.portrait}"
               onerror="this.style.display='none';document.getElementById('evt-emoji-fb').style.display='block'"
               alt="${angel.name}">
           <div id="evt-emoji-fb" style="font-size:90px;display:none">${angel.emoji}</div>`
        : isAngel
          ? `<div id="event-portrait-emoji" style="font-size:90px">${angel.emoji}</div>`
          : '';

      const overlay = document.createElement('div');
      overlay.id = 'event-overlay';
      overlay.innerHTML = `
        <div id="event-scene-box">
          <div id="event-portrait-wrap">${portraitHTML}</div>
          <div id="event-dialog-box">
            <div id="event-speaker-name">${line.speaker}</div>
            <div id="event-dialog-text"></div>
            <button id="event-next-btn">${idx < evt.lines.length - 1 ? '次へ ▶' : '閉じる ✓'}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      // typewrite the line
      const textEl = document.getElementById('event-dialog-text');
      typewrite(textEl, line.text, 0.04);

      document.getElementById('event-next-btn').addEventListener('click', () => {
        renderLine(idx + 1);
      });
    }

    renderLine(0);
  }

  // Expose showEventScene globally so interrogation.js can call it
  const _showEventScene = showEventScene;

  /* ======================================================
     情報入手結果
     ====================================================== */
  function renderIntelResult() {
    const newIntel = G.lastIntel || [];
    const continueAngelId = G.interrogation ? G.interrogation.angelId : null;
    document.getElementById('root').innerHTML = `
    ${statusBar()}
    <div style="padding:20px;overflow-y:auto;flex:1">
      <div class="phase-hdr"><h2>📋 情報入手</h2></div>
      ${newIntel.length === 0
        ? '<div class="empty-hint">新しい情報は得られなかった。</div>'
        : newIntel.map(i => intelCardHtml(i, true)).join('')}
      <div class="card" style="border-left:3px solid var(--lavender);margin-top:8px;font-size:13px;line-height:1.9">
        <strong>確度について：</strong><br>
        確度70%以上→ほぼ正確。50-69%→誤情報の可能性あり。50%未満→要注意。<br>
        弱点情報（⚡）が判明すると、戦闘で弱点攻撃が選択可能になる。
      </div>
      <div class="row" style="margin-top:14px;gap:10px">
        ${continueAngelId ? `<button class="btn btn-pink" id="btn-continue-interro">🗣️ 尋問を続ける</button>` : ''}
        <button class="btn btn-ghost" id="btn-intel-back">🗺️ マップへ戻る</button>
      </div>
    </div>`;

    // バインド
    const continueBtn = document.getElementById('btn-continue-interro');
    const backBtn = document.getElementById('btn-intel-back');
    if (continueBtn) continueBtn.addEventListener('click', () => Interrogation.begin(continueAngelId));
    if (backBtn) backBtn.addEventListener('click', () => { G.phase = 'map'; render(); });
  }

  /* ======================================================
     情報一覧
     ====================================================== */
  function renderIntelView() {
    document.getElementById('root').innerHTML = `
    ${statusBar()}
    <div style="padding:20px;overflow-y:auto;flex:1">
      <div class="phase-hdr"><h2>📋 収集情報一覧</h2><span class="sub">${G.intel.length}件</span></div>
      ${G.intel.length === 0
        ? '<div class="empty-hint">まだ情報がありません。天使を尋問してください。</div>'
        : G.intel.map(i => intelCardHtml(i, false)).join('')}
      <button class="btn btn-ghost" style="margin-top:14px" id="btn-intelview-back">← マップへ戻る</button>
    </div>`;

    document.getElementById('btn-intelview-back').addEventListener('click', () => { G.phase = 'map'; render(); });
  }

  /* ======================================================
     招集シーン
     ====================================================== */
  function renderRecruiting() {
    const angel = getAngel(G.recruitingId);
    if (!angel) { G.phase = 'map'; render(); return; }

    document.getElementById('root').innerHTML = `
    <div class="recruit-overlay" id="recruit-overlay">
      <div class="sparkle" style="font-size:36px;animation:twinkle 1s infinite">✨</div>
      <div class="recruit-emoji">${angel.emoji}</div>
      <div class="recruit-name" style="color:${angel.color}">${angel.name}が仲間になった！</div>
      <div class="recruit-quote">"${angel.recruitDlg}"</div>
      <div class="recruit-bonus">特典: ${angel.recruitBonus}</div>
      <button class="btn btn-gold btn-lg" id="btn-finish-recruit">💫 タップして続ける</button>
    </div>`;

    document.getElementById('recruit-overlay').addEventListener('click', () => Interrogation.finishRecruit());
    document.getElementById('btn-finish-recruit').addEventListener('click', e => { e.stopPropagation(); Interrogation.finishRecruit(); });
  }

  /* ======================================================
     ゲームオーバー / エンディング
     ====================================================== */
  function renderGameOver(win, reason) {
    const allies = G.allies.filter(a => a.recruited);
    const icons   = { true: '🎉', false: '💀' };
    const colors  = { true: '#FFD700', false: '#FF5E7A' };
    document.getElementById('root').innerHTML = `
    <div class="overlay-screen">
      <div class="result-box" style="border-color:${colors[win]}">
        <div class="result-icon">${icons[win]}</div>
        <div class="result-title" style="color:${colors[win]}">${win ? '戦争終結！人類の勝利！' : 'ゲームオーバー'}</div>
        <div class="result-score-wrap"><div class="result-score-fill" style="width:${win?'100':'30'}%;background:${colors[win]}"></div></div>
        <div class="result-desc">${reason}</div>
        <div class="result-stats">
          仲間になった天使: ${allies.length > 0 ? allies.map(al => getAngel(al.id)?.emoji + getAngel(al.id)?.name).join('、') : 'なし'}<br>
          収集情報数: ${G.intel.length}件 ／ 生き残りターン: ${G.turn}<br>
          残金: ${G.player.gold}G ／ 自陣HP: ${G.player.baseHp}/${G.player.baseMaxHp}
        </div>
        <button class="btn btn-gold btn-lg" id="btn-retry">もう一度プレイ</button>
      </div>
    </div>`;

    document.getElementById('btn-retry').addEventListener('click', () => { initGameState(); G.phase = 'title'; render(); });
  }

  /* ======================================================
     Public
     ====================================================== */
  return {
    renderTitle, renderStory, renderMap, renderPreBattle,
    renderBattle, renderCapture, renderInterrogation,
    renderIntelResult, renderIntelView, renderRecruiting,
    renderGameOver, showEventScene,
  };
})();

/* ======================================================
   メインレンダラー  (main.js から呼ばれる)
   ====================================================== */
function render() {
  try {
    // 前のシーンの root.onclick を必ずクリア（ストーリー画面のクリックが残留するのを防ぐ）
    const _root = document.getElementById('root');
    if (_root) _root.onclick = null;

    // 戦闘フェーズ以外のとき、残留している battle UI をDOMから完全に削除
    if (G.phase !== 'battle') {
      ['fe-hud', 'fe-defeat-screen', 'battle-canvas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
    }

    // ゲームオーバーチェック
    if (G.player && G.player.baseHp <= 0 && G.phase !== 'title' && G.phase !== 'story') {
      Scenes.renderGameOver(false, '自陣が壊滅してしまった……。天使の粛清を止めることはできなかった。');
      return;
    }

    switch (G.phase) {
      case 'title':         Scenes.renderTitle();       break;
      case 'story':         Scenes.renderStory();       break;
      case 'map':           Scenes.renderMap();          break;
      case 'prebattle':     Scenes.renderPreBattle(G._preBattleLoc); break;
      case 'battle':
        document.getElementById('root').innerHTML =
          '<div style="position:fixed;inset:0;background:#0a1520;z-index:5"></div>';
        break;
      case 'capture':       Scenes.renderCapture();     break;
      case 'interrogation': Scenes.renderInterrogation(); break;
      case 'intelResult':   Scenes.renderIntelResult(); break;
      case 'intelView':     Scenes.renderIntelView();   break;
      case 'recruiting':    Scenes.renderRecruiting();  break;
      default:              Scenes.renderMap();          break;
    }
  } catch(e) {
    document.getElementById('root').innerHTML = `
    <div style="padding:30px;color:#FF5E7A;font-family:monospace">
      <h2>⚠️ レンダリングエラー (phase: ${G.phase})</h2>
      <pre style="margin-top:12px;font-size:12px;white-space:pre-wrap;color:#EEE">${e.stack || e.message}</pre>
      <button style="margin-top:20px;padding:10px 24px;background:#C89FFF;color:#1a0a2e;border:none;border-radius:20px;cursor:pointer;font-size:14px" onclick="G.phase='map';render()">マップへ戻る</button>
    </div>`;
    console.error('[render]', e);
  }
}
