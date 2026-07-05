/* ======================================================
   js/main.js  —  エントリーポイント・アプリ制御
   ====================================================== */
"use strict";

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
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
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
   グローバル公開
   ====================================================== */
window.G      = G;
window.render = render;

/* ======================================================
   キーボードショートカット
   ====================================================== */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (G.phase === 'stage_prep' || G.phase === 'interrogation') {
      G.phase = 'stage_select';
      render();
    }
  }
});

/* ======================================================
   起動
   ====================================================== */
spawnStarField();
initGameState();
G.phase = 'title';
render();
