/* ======================================================
   js/main.js  —  エントリーポイント・アプリ制御
   ====================================================== */
"use strict";

/* ======================================================
   App — UI から呼ばれる公開 API
   ====================================================== */
const App = {
  /** 拠点カードをクリックしたとき */
  openLocation(locationId) {
    G._preBattleLoc = locationId;
    G.phase = 'prebattle';
    render();
  },

  /** 戦闘開始 (partyConfig = { allyIds:[], itemIds:[] }) */
  startBattle(locationId, partyConfig) {
    G.phase = 'battle';
    render();
    Scenes.renderBattle(locationId, partyConfig);
  },

  /** 尋問開始 */
  beginInterrogate(angelId) {
    Interrogation.begin(angelId);
  },

  /** 情報一覧を開く */
  openIntelView() {
    G.phase = 'intelView';
    render();
  },
};

/* ======================================================
   スター背景生成
   ====================================================== */
function spawnStarField() {
  let field = document.querySelector('.star-field');
  if (field) return;
  field = document.createElement('div');
  field.className = 'star-field';
  for (let i = 0; i < 70; i++) {
    const s  = document.createElement('div');
    const sz = Math.random() * 2.5 + 0.5;
    s.className = 'star';
    s.style.cssText = `
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      width:${sz}px; height:${sz}px;
      --d:${2 + Math.random() * 5}s;
      --o:${0.3 + Math.random() * 0.7};
      animation-delay:${Math.random() * 5}s;
    `;
    field.appendChild(s);
  }
  document.body.prepend(field);
}

/* ======================================================
   グローバル公開（HTML の onclick から参照される）
   ====================================================== */
window.App          = App;
window.Interrogation= Interrogation;
window.G            = G;
window.render       = render;

/* ======================================================
   キーボードショートカット
   ====================================================== */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (G.phase === 'intelView' || G.phase === 'prebattle') {
      G.phase = 'map';
      render();
    }
  }
});

/* ======================================================
   ウィンドウリサイズ時に Canvas を再調整
   ====================================================== */
window.addEventListener('resize', () => {
  const canvas = document.getElementById('battle-canvas');
  if (canvas && canvas.style.display !== 'none') {
    canvas.width  = window.innerWidth;
    canvas.height = Math.max(200, window.innerHeight - 60);
  }
});

/* ======================================================
   起動
   ====================================================== */
spawnStarField();
initGameState();
G.phase = 'title';
render();
