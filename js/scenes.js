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
        setSystemDlg('システム', '作戦を開始せよ。まず敵の哨戒拠点から天使を捕縛し、情報を集めろ。', 'var(--lavender)');
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
     戦闘前ブリーフィング
     ====================================================== */
  function renderPreBattle(locationId) {
    const loc   = getLocation(locationId);
    const angel = getAngel(loc.angelId);
    const wm    = getWeaknessMulti(angel.id);
    const hasWk = hasIntel(angel.weaknessId);

    document.getElementById('root').innerHTML = `
    ${statusBar()}
    <div class="prebattle-overlay">
      <div class="prebattle-box">
        <h2>⚔️ 出撃ブリーフィング — ${loc.name}</h2>

        <div class="prebattle-combatants">
          <div class="combatant-card player">
            <div class="cc-emoji">${PLAYER_UNIT.emoji}</div>
            <div class="cc-name">${PLAYER_UNIT.name}</div>
            <div class="cc-stats">
              <div class="stat-row"><span>HP</span><span class="sv">${PLAYER_UNIT.hp}</span></div>
              <div class="stat-row"><span>攻撃</span><span class="sv">${PLAYER_UNIT.atk}</span></div>
              <div class="stat-row"><span>防御</span><span class="sv">${PLAYER_UNIT.def}</span></div>
              <div class="stat-row"><span>速度</span><span class="sv">${PLAYER_UNIT.spd}</span></div>
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
              <div class="stat-row"><span>速度</span><span class="sv">${angel.spd}</span></div>
            </div>
          </div>
        </div>

        <div class="prebattle-intel">
          ${hasWk
            ? `<span class="weakness-highlight">⚡ 弱点情報あり: ${angel.weaknessName}</span><br>
               <span class="text-dim">弱点攻撃でダメージ×${wm.toFixed(1)}</span>`
            : `<span class="text-dim">弱点情報なし。尋問で情報を集めると有利になる。</span>`}
        </div>

        <div class="row" style="justify-content:center;gap:14px">
          ${hasWk ? `<button class="btn btn-gold" id="btn-weak-battle">⚡ 弱点を突いて戦闘</button>` : ''}
          <button class="btn btn-lavender" id="btn-normal-battle">⚔️ 通常戦闘</button>
          <button class="btn btn-ghost" id="btn-cancel-battle">← キャンセル</button>
        </div>
      </div>
    </div>`;

    if (hasWk) document.getElementById('btn-weak-battle').addEventListener('click', () => App.startBattle(locationId, true));
    document.getElementById('btn-normal-battle').addEventListener('click', () => App.startBattle(locationId, false));
    document.getElementById('btn-cancel-battle').addEventListener('click', () => { G.phase = 'map'; render(); });
  }

  /* ======================================================
     タワーディフェンス戦闘画面
     ====================================================== */
  function renderBattle(locationId, useWeakness) {
    const loc   = getLocation(locationId);
    const angel = getAngel(loc.angelId);
    const intelIds = G.intel.filter(i=>i.isTrue).map(i=>i.id);

    // Intel効果の計算
    const intelEffects = {
      bossWeakness:  useWeakness && hasIntel(angel.weaknessId),
      cheaperTowers: hasIntel('supply_base_loc') && G.intel.find(i=>i.id==='supply_base_loc')?.isTrue,
    };

    recalcDropBoost();

    const canvas = document.getElementById('battle-canvas');
    canvas.style.position = 'fixed';
    canvas.style.top    = '0';
    canvas.style.left   = '0';
    canvas.style.width  = '100vw';
    canvas.style.height = '62vh';
    canvas.style.zIndex = '15';

    // Build battle items for use during fight
    const battleItems = G.inventory.filter(id => { const d = getItemDef(id); return d && d.cat === 'battle'; });
    const itemSlotsHTML = battleItems.slice(0, 4).map(id => {
      const d = getItemDef(id);
      const count = G.inventory.filter(x=>x===id).length;
      return `<div class="td-item-slot" data-item-id="${id}" title="${d.name}: ${d.desc}">
        ${d.icon}<span class="slot-count">${count}</span>
      </div>`;
    }).join('');

    // Tower buttons
    const towerDefs = TDBattle.getTowerDefs();
    const towerBtnsHTML = Object.entries(towerDefs).map(([type, def]) => `
      <button class="td-tower-btn" data-type="${type}">
        <span class="tw-icon">${def.icon}</span>
        <span class="tw-name">${def.name}</span>
        <span class="tw-cost">${def.cost}G</span>
      </button>`).join('');

    document.getElementById('root').innerHTML = `
    <div id="td-battle-wrap" style="padding-top:62vh">
      <div id="td-hud">
        <div id="td-wave-bar-wrap">
          <div id="td-wave-label">WAVE 1 / ${loc.waves.length}</div>
          <div id="td-wave-bar-bg"><div id="td-wave-bar" style="width:100%"></div></div>
        </div>
        <div class="td-stat"><span class="label">GOLD</span><span id="td-gold-val">--G</span></div>
        <div class="td-stat"><span class="label">拠点HP</span><span id="td-hp-val">--</span></div>
        <div class="td-stat"><span class="label">撃破</span><span id="td-kill-val">0</span></div>
        <div id="td-phase-label" class="prep">準備中</div>
        <div id="td-tower-panel">${towerBtnsHTML}</div>
        <div id="td-item-bar">${itemSlotsHTML || '<span style="color:#555;font-size:12px">アイテムなし</span>'}</div>
        <button id="td-early-btn">▶ 早期開始</button>
        <button id="td-retreat-btn">撤退</button>
      </div>
    </div>`;

    // Bind tower buttons
    document.getElementById('td-tower-panel').querySelectorAll('.td-tower-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        TDBattle.selectTowerType(btn.dataset.type);
        document.querySelectorAll('.td-tower-btn').forEach(b => b.classList.toggle('selected', b.dataset.type === btn.dataset.type && TDBattle.getState() && TDBattle.getState().selectedType === btn.dataset.type));
      });
    });

    // Bind item slots
    document.getElementById('td-item-bar').querySelectorAll('.td-item-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const id = slot.dataset.itemId;
        if (removeItemFromInventory(id)) {
          TDBattle.useBattleItem(id);
          slot.remove();
        }
      });
    });

    document.getElementById('td-early-btn').addEventListener('click', () => TDBattle.startWaveEarly());
    document.getElementById('td-retreat-btn').addEventListener('click', () => {
      TDBattle.stopBattle();
      G.phase = 'map';
      setSystemDlg('システム', '撤退した。また準備を整えて挑もう。', 'var(--gold)');
      render();
    });

    // Apply equipment bonuses
    for (const eff of G.equippedEffects) {
      TDBattle.applyEquipmentBonus(eff);
    }

    // Start TD engine
    TDBattle.startBattle(canvas, {
      locationId:    loc.id,
      angel:         angel,
      waves:         loc.waves,
      startGold:     loc.startGold || 200,
      baseHp:        loc.baseHp    || 20,
      intelEffects,
      dropBoostMult: G.dropBoostMult,
    }, {
      onHUDUpdate: ({ gold, baseHp, baseMaxHp, wave, totalWaves, phase, prepTimer, killed }) => {
        const goldEl  = document.getElementById('td-gold-val');
        const hpEl    = document.getElementById('td-hp-val');
        const killEl  = document.getElementById('td-kill-val');
        const waveEl  = document.getElementById('td-wave-label');
        const barEl   = document.getElementById('td-wave-bar');
        const phaseEl = document.getElementById('td-phase-label');
        const earlyBtn= document.getElementById('td-early-btn');

        if (goldEl)  goldEl.textContent  = `${gold}G`;
        if (hpEl)    hpEl.textContent    = `${baseHp}/${baseMaxHp}`;
        if (killEl)  killEl.textContent  = killed;

        if (phase === 'prep' || phase === 'between') {
          const maxPrep = loc.waves[Math.min(wave, loc.waves.length-1)]?.prepTime || 30;
          const pct     = Math.min(1, prepTimer / maxPrep);
          if (barEl)   barEl.style.width  = `${pct*100}%`;
          if (waveEl)  waveEl.textContent = phase === 'prep' ? `Wave ${wave+1} / ${totalWaves} 準備中 ${prepTimer}s` : `次のWave まで ${prepTimer}s`;
          if (phaseEl) { phaseEl.textContent = `準備 ${prepTimer}s`; phaseEl.className='prep'; }
          if (earlyBtn) earlyBtn.disabled = false;
        } else if (phase === 'wave') {
          if (waveEl)  waveEl.textContent = `WAVE ${wave} / ${totalWaves} 進行中`;
          if (barEl)   barEl.style.width  = '100%';
          if (phaseEl) { phaseEl.textContent = `Wave ${wave} 進行中`; phaseEl.className='wave'; }
          if (earlyBtn) earlyBtn.disabled = true;
        }
      },
      onWaveStart: ({ wave, total }) => {
        setSystemDlg('ウェーブ', `Wave ${wave} / ${total} 開始！`, 'var(--red)');
      },
      onWaveClear: ({ wave, total }) => {
        setSystemDlg('ウェーブクリア', `Wave ${wave} / ${total} 完了。次のウェーブまで準備を。`, 'var(--green)');
      },
      onBossKilled: ({ angelId }) => {
        setSystemDlg('ボス撃破！', `${angel.name}を撃破した！捕縛に成功！`, 'var(--gold)');
      },
      onBattleEnd: ({ victory, stats }) => {
        if (victory) {
          // Roll drops
          const drops = rollDrops(loc, intelIds, G.dropBoostMult);
          applyDrops(drops);

          // Apply any pending equipment effects
          for (const id of G.inventory.filter(i => { const d = getItemDef(i); return d && d.cat === 'equipment'; })) {
            const d = getItemDef(id);
            if (d.effect && !['gold_bonus','base_hp'].includes(d.effect)) {
              G.equippedEffects.push({ effect:d.effect, value:d.value, itemName:d.name });
            }
          }

          G._battleDrops = drops;
          onCapture(locationId, angel.id, false /* don't call BattleScene.stop */);
        } else {
          G.player.baseHp = Math.max(0, G.player.baseHp - 40);
          // 敗北結果画面を表示してからマップへ
          document.getElementById('root').innerHTML = `
          <div style="position:fixed;inset:0;background:rgba(10,4,25,0.96);z-index:20;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px">
            <div style="font-size:52px">💀</div>
            <h2 style="color:#FF5E7A;font-size:28px;margin:0">拠点陥落</h2>
            <p style="color:#aaa;font-size:15px;text-align:center;max-width:360px">
              天使の波状攻撃を防ぎきれなかった。<br>
              自陣HP: <span style="color:#FF5E7A">${G.player.baseHp}/${G.player.baseMaxHp}</span>
            </p>
            <button id="btn-defeat-back" style="
              padding:12px 32px;background:linear-gradient(135deg,#7B5EA7,#C89FFF);
              color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:bold;cursor:pointer">
              マップへ戻る
            </button>
          </div>`;
          document.getElementById('btn-defeat-back').addEventListener('click', () => {
            setSystemDlg('敗北', '拠点が突破された……態勢を立て直せ。', 'var(--red)');
            G.phase = 'map';
            render();
          });
        }
      },
    });
  }

  function onCapture(locationId, angelId, doStopBattle) {
    G.clearedLocs.add(locationId);
    if (!G.prisoners.includes(angelId)) G.prisoners.push(angelId);
    G.turn++;
    if (doStopBattle !== false) TDBattle.stopBattle();

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
