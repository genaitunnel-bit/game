/* ======================================================
   js/interrogation.js  —  尋問システム（メインゲームプレイ）
   ====================================================== */
"use strict";

const Interrogation = (() => {
  /* 現在の尋問状態 */
  let iq = null; // { angelId, selectedTopic, selectedMethod }

  /* -------- 尋問開始 -------- */
  function begin(angelId) {
    const angel = getAngel(angelId);
    if (!angel) return;
    const ally  = getAllyEntry(angelId);
    ally.sessions = (ally.sessions || 0) + 1;

    iq = { angelId, selectedTopic: null, selectedMethod: null };
    G.interrogation = { angelId };
    G.phase = 'interrogation';

    // 最初の台詞
    const greet = ally.sessions === 1
      ? angel.topics.mission.responses[0].text
      : '……また来たのですね。';
    setSystemDlg(angel.name, greet, angel.color);
    render();
  }

  /* -------- トピック選択 -------- */
  function selectTopic(topicKey) {
    if (!iq) return;
    const angel = getAngel(iq.angelId);
    const topic = angel.topics[topicKey];
    if (!topic) return;
    const ally  = getAllyEntry(iq.angelId);

    // 信頼度チェック
    const minReq = topic.minTrustRequired || 0;
    if (ally.trust < minReq) {
      setSystemDlg('システム', `信頼度が足りない（必要: ${minReq} / 現在: ${ally.trust}）`, '#FF5E7A');
      render(); return;
    }

    iq.selectedTopic = topicKey;
    // 反応をプレビュー表示
    const resp = bestResponse(topic.responses, ally.trust);
    setSystemDlg(angel.name, resp ? resp.text : '……。', angel.color, emotionClass(resp?.emotion));
    render();
  }

  /* -------- メソッド選択 -------- */
  function selectMethod(methodId) {
    if (!iq) return;
    iq.selectedMethod = methodId;
    render();
  }

  /* -------- 実行 -------- */
  function execute() {
    if (!iq || !iq.selectedTopic || !iq.selectedMethod) {
      setSystemDlg('システム', '話題と尋問方法を選んでください。', '#FF5E7A');
      render(); return;
    }

    const angel  = getAngel(iq.angelId);
    const ally   = getAllyEntry(iq.angelId);
    const method = METHODS.find(m => m.id === iq.selectedMethod);
    const topic  = angel.topics[iq.selectedTopic];

    // コスト
    if (method.cost && method.cost > G.player.gold) {
      setSystemDlg('システム', 'ゴールドが足りません！', '#FF5E7A');
      render(); return;
    }
    if (method.cost) G.player.gold -= method.cost;

    // 信頼度・恐怖度更新
    const prevTrust = ally.trust;
    ally.trust = Math.min(100, Math.max(0, ally.trust + method.trustMod));
    ally.fear  = Math.min(100, Math.max(0, (ally.fear || 0) + (method.fearMod || 0)));
    const newTrust  = ally.trust;

    // イベントシーントリガーチェック
    const evtList = (typeof INTERROGATION_EVENTS !== 'undefined') ? INTERROGATION_EVENTS[iq.angelId] : null;
    let pendingEventId = null;
    if (evtList) {
      for (const evt of evtList) {
        if (prevTrust < evt.minTrust && newTrust >= evt.minTrust) {
          if (!G.seenEvents.has(evt.id)) { pendingEventId = evt.id; break; }
        }
      }
    }

    // 精度計算
    const acc = calcAccuracy(angel, method);

    // 最適な台詞を選択
    const resp = bestResponse(topic.responses, ally.trust);
    const emotion = resp?.emotion || 'neutral';

    if (resp) {
      setSystemDlg(angel.name, resp.text, angel.color, emotionClass(emotion));

      // 情報獲得
      let gained = null;
      if (resp.intelId && !hasIntel(resp.intelId)) {
        const isTrue = Math.random() * 100 < acc;
        const def    = getIntelDef(resp.intelId);
        if (def) {
          const entry = {
            id: resp.intelId, name: def.name, cat: def.cat,
            content: isTrue ? def.trueText : def.falseText,
            accuracy: acc, isTrue,
            unlocks:  def.unlocks || [],
            relevantFor: def.relevantFor || [],
            from: angel.name, method: method.name, isNew: true,
          };
          G.intel.push(entry);
          G.lastIntel = [entry];
          gained = entry;
        }
      }

      // トピック既読
      ally.revealedTopics = ally.revealedTopics || new Set();
      ally.revealedTopics.add(iq.selectedTopic);

      // 招集チェック
      const canRecruit = method.canRecruit && !ally.recruited;
      if (pendingEventId) {
        // イベントシーン優先表示
        setTimeout(() => Scenes.showEventScene(iq.angelId, pendingEventId), 900);
      } else if (canRecruit && ally.trust >= angel.recruitTrust) {
        // 招集シーンへ
        setTimeout(() => triggerRecruitScene(angel.id), 900);
      } else if (gained) {
        // 情報入手結果へ
        G.lastIntel = [gained];
        setTimeout(() => { G.phase = 'intelResult'; render(); }, 900);
      } else {
        // そのまま尋問継続
        setTimeout(() => { render(); }, 600);
      }
    } else {
      setSystemDlg(angel.name, '……。', angel.color, 'sad');
    }

    iq.selectedTopic  = null;
    iq.selectedMethod = null;
    render();
  }

  function triggerRecruitScene(angelId) {
    const angel = getAngel(angelId);
    const ally  = getAllyEntry(angelId);
    ally.recruited = true;
    angel.recruitEffect && angel.recruitEffect(G);
    G.prisoners = G.prisoners.filter(id => id !== angelId);
    G.recruitingId = angelId;
    G.phase = 'recruiting';
    render();
  }

  function finishRecruit() {
    G.recruitingId = null;
    G.phase = 'map';
    render();
  }

  function leaveInterrogation() {
    G.phase = 'map';
    G.interrogation = null;
    iq = null;
    render();
  }

  /* -------- ヘルパー -------- */
  function bestResponse(responses, trust) {
    // 信頼度以下の最大のものを返す
    const eligible = responses.filter(r => r.minTrust <= trust);
    return eligible.length ? eligible[eligible.length - 1] : null;
  }

  function emotionClass(emotion) {
    const map = {
      sad:'sad', tearful:'sad', conflicted:'conflicted', firm:'firm',
      angry:'angry', nostalgic:'happy', happy:'happy', guilty:'sad',
      uncertain:'conflicted', worried:'conflicted', resigned:'sad',
      confused:'conflicted', urgent:'angry', broken:'sad', regret:'sad',
      cold:'firm', reluctant:'conflicted', neutral:'',
    };
    return map[emotion] || '';
  }

  /* -------- 現在の尋問データを返す (scenes.js 用) -------- */
  function getState() { return iq; }

  return { begin, selectTopic, selectMethod, execute, leaveInterrogation, finishRecruit, getState };
})();

/* -------- dialogue ヘルパー (scenes.js/main.js 共通) -------- */
let _dlgState = { speaker:'', text:'', color:'#C89FFF', emotionClass:'' };

function setSystemDlg(speaker, text, color, emoCls) {
  _dlgState = { speaker, text: text || '', color: color || '#C89FFF', emotionClass: emoCls || '' };
}

function getDlg() { return _dlgState; }
