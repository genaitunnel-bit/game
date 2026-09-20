/**
 * ひなたのアバター。
 *
 * 外部のモデルファイルもライブラリも使わない、その場で描く SVG のリグ。
 * 理由はふたつ: 家の中で完結する（画像を取りに行かない）ことと、
 * 表情とリップシンクをエージェントの内面にそのまま繋ぎたいこと。
 *
 *   const avatar = createAvatar(document.getElementById('avatar'));
 *   avatar.setExpression('sulky');   // 内面の expression をそのまま渡す
 *   avatar.speak('ゴミ出しの時間だよ'); // かなを読んで口を動かす
 *
 * Live2D / VRM に差し替えたいときは、この 4 つ（setExpression / speak /
 * stopSpeaking / poke）を持つオブジェクトを返す別実装を用意すれば入れ替わる。
 */

const C = {
  hair: '#f3b3c5',
  hairDark: '#e295ac',
  hairLight: '#ffd9e4',
  skin: '#fdeade',
  skinShade: '#f8d5c6',
  line: '#c08a99',
  iris: '#79c6ae',
  irisDark: '#4f9e88',
  pupil: '#3c2f36',
  mouth: '#c9707f',
  blush: '#f79fb2',
  cloth: '#fffafb',
  clothShade: '#f0e2e7',
  ribbon: '#ef8aa4',
};

// 表情ごとのパラメータ。数値は「目の開き / 眉の角度 / 口の形 / 頬の赤み」。
export const FACES = {
  happy:   { lid: 0.02, browY: -2.5, browTilt: -6, mouth: 'smile', mouthSize: 1.15, blush: 0.55, tilt: 1.5, sparkle: 1, sweat: 0, zzz: 0, pupil: 1.0 },
  normal:  { lid: 0.05, browY: 0,    browTilt: 0,  mouth: 'smile', mouthSize: 0.9,  blush: 0.35, tilt: 0,   sparkle: 0, sweat: 0, zzz: 0, pupil: 1.0 },
  sad:     { lid: 0.3,  browY: 3,    browTilt: 22, mouth: 'wavy',  mouthSize: 0.8,  blush: 0.3,  tilt: -2,  sparkle: 0, sweat: 0, zzz: 0, pupil: 1.05 },
  sulky:   { lid: 0.42, browY: 1.5,  browTilt: -16,mouth: 'pout',  mouthSize: 0.85, blush: 0.6,  tilt: -3,  sparkle: 0, sweat: 1, zzz: 0, pupil: 0.95 },
  sleepy:  { lid: 0.62, browY: 2.5,  browTilt: 6,  mouth: 'small', mouthSize: 0.7,  blush: 0.3,  tilt: 3,   sparkle: 0, sweat: 0, zzz: 1, pupil: 0.95 },
  lonely:  { lid: 0.12, browY: 2.5,  browTilt: 18, mouth: 'small', mouthSize: 0.75, blush: 0.4,  tilt: -2,  sparkle: 0, sweat: 0, zzz: 0, pupil: 1.1 },
  surprise:{ lid: 0,    browY: -4,   browTilt: -2, mouth: 'o',     mouthSize: 1.2,  blush: 0.5,  tilt: 0,   sparkle: 0, sweat: 0, zzz: 0, pupil: 1.15 },
};

// 口の形（母音）。リップシンクはこの 6 種類の行き来でできている。
export const MOUTHS = {
  closed: { rx: 0, ry: 0, smile: true },
  smile: { rx: 0, ry: 0, smile: true },
  small: { rx: 4.5, ry: 2.6 },
  wavy: { rx: 0, ry: 0, smile: true, wavy: true },
  pout: { rx: 5.5, ry: 4.6, pout: true },
  a: { rx: 9, ry: 8 },
  i: { rx: 10, ry: 2.8 },
  u: { rx: 5.2, ry: 5.4 },
  e: { rx: 8.5, ry: 5.4 },
  o: { rx: 7, ry: 8 },
  n: { rx: 4, ry: 2 },
};

const VOWELS = [
  ['あかさたなはまやらわがざだばぱゃァアカサタナハマヤラワガザダバパ', 'a'],
  ['いきしちにひみりぎじぢびぴィイキシチニヒミリギジヂビピ', 'i'],
  ['うくすつぬふむゆるぐずづぶぷゅゥウクスツヌフムユルグズヅブプ', 'u'],
  ['えけせてねへめれげぜでべぺェエケセテネヘメレゲゼデベペ', 'e'],
  ['おこそとのほもよろをごぞどぼぽょォオコソトノホモヨロヲゴゾドボポ', 'o'],
  ['んンっッ', 'n'],
];

/** 文字列を「口の形の並び」に変える。漢字は読めないので、やわらかく開閉させる。 */
export function moraShapes(text) {
  const shapes = [];
  for (const char of String(text ?? '')) {
    if (/[ー〜]/.test(char)) {
      shapes.push(shapes.at(-1) ?? 'a'); // 伸ばし棒は直前の母音を伸ばす
      continue;
    }
    if (/[\s、。「」！？!?,.…]/.test(char)) {
      shapes.push('closed');
      continue;
    }
    const row = VOWELS.find(([set]) => set.includes(char));
    if (row) {
      shapes.push(row[1]);
      continue;
    }
    // 漢字・アルファベットは読みが分からないので、母音を散らして口を動かす
    shapes.push(['a', 'o', 'e', 'u'][shapes.length % 4]);
  }
  return shapes;
}

const lerp = (a, b, t) => a + (b - a) * t;

const SVG = `
<svg viewBox="0 0 200 236" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="ha-iris" cx="50%" cy="35%" r="70%">
      <stop offset="0%" stop-color="${C.iris}"/>
      <stop offset="100%" stop-color="${C.irisDark}"/>
    </radialGradient>
    <linearGradient id="ha-hair" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.hairLight}"/>
      <stop offset="55%" stop-color="${C.hair}"/>
      <stop offset="100%" stop-color="${C.hairDark}"/>
    </linearGradient>
    <clipPath id="ha-eye-l"><ellipse cx="74" cy="106" rx="15" ry="17"/></clipPath>
    <clipPath id="ha-eye-r"><ellipse cx="126" cy="106" rx="15" ry="17"/></clipPath>
  </defs>

  <style>
    #ha-all, #ha-head, #ha-body, #ha-ahoge, #ha-brow-l, #ha-brow-r, #ha-iris-l, #ha-iris-r {
      transform-box: fill-box;
      transform-origin: center;
    }
    #ha-head { transform-origin: center bottom; }
    #ha-body { transform-origin: center bottom; }
    #ha-ahoge { transform-origin: left bottom; }
  </style>

  <g id="ha-all">
    <g id="ha-body">
      <path d="M62 178c-20 8-32 24-36 58h148c-4-34-16-50-36-58-10 16-24 24-38 24s-28-8-38-24z"
            fill="${C.cloth}" stroke="${C.line}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M78 180l22 20 22-20-8-6-14 10-14-10z" fill="${C.clothShade}"/>
      <circle cx="100" cy="204" r="8" fill="${C.ribbon}"/>
      <path d="M100 204l-16-8v16zM100 204l16-8v16z" fill="${C.ribbon}"/>
    </g>

    <path id="ha-hair-back" d="M100 22c46 0 70 32 70 80 0 36-4 66-8 90-9-9-20-11-29-7 5-30 5-68 3-94H64c-2 26-2 64 3 94-9-4-20-2-29 7-4-24-8-54-8-90 0-48 24-80 70-80z" fill="url(#ha-hair)"/>

    <g id="ha-head">
      <ellipse cx="50" cy="104" rx="7" ry="11" fill="${C.skin}" stroke="${C.line}" stroke-width="1.8"/>
      <ellipse cx="150" cy="104" rx="7" ry="11" fill="${C.skin}" stroke="${C.line}" stroke-width="1.8"/>
      <path d="M50 98c0-35 19-52 50-52s50 17 50 52c0 34-22 58-50 58s-50-24-50-58z"
            fill="${C.skin}" stroke="${C.line}" stroke-width="2.2"/>

      <ellipse id="ha-blush-l" cx="63" cy="124" rx="11" ry="6" fill="${C.blush}" opacity="0.35"/>
      <ellipse id="ha-blush-r" cx="137" cy="124" rx="11" ry="6" fill="${C.blush}" opacity="0.35"/>

      <g id="ha-eyes">
        <g clip-path="url(#ha-eye-l)">
          <ellipse cx="74" cy="106" rx="15" ry="17" fill="#fffdfd"/>
          <g id="ha-iris-l"><ellipse cx="74" cy="107" rx="11.5" ry="13" fill="url(#ha-iris)"/>
            <ellipse cx="74" cy="108" rx="6" ry="7" fill="${C.pupil}"/>
            <circle cx="70" cy="101" r="4" fill="#fff" opacity=".95"/>
            <circle cx="78" cy="113" r="2" fill="#fff" opacity=".7"/></g>
          <rect id="ha-lid-l" x="57" y="72" width="34" height="34" fill="${C.skin}"/>
        </g>
        <g clip-path="url(#ha-eye-r)">
          <ellipse cx="126" cy="106" rx="15" ry="17" fill="#fffdfd"/>
          <g id="ha-iris-r"><ellipse cx="126" cy="107" rx="11.5" ry="13" fill="url(#ha-iris)"/>
            <ellipse cx="126" cy="108" rx="6" ry="7" fill="${C.pupil}"/>
            <circle cx="122" cy="101" r="4" fill="#fff" opacity=".95"/>
            <circle cx="130" cy="113" r="2" fill="#fff" opacity=".7"/></g>
          <rect id="ha-lid-r" x="109" y="72" width="34" height="34" fill="${C.skin}"/>
        </g>
        <path d="M60 96c5-7 22-9 29-2" fill="none" stroke="${C.pupil}" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M140 96c-5-7-22-9-29-2" fill="none" stroke="${C.pupil}" stroke-width="3.4" stroke-linecap="round"/>
      </g>

      <path id="ha-brow-l" d="M62 84c6-5 17-6 24-2" fill="none" stroke="${C.hairDark}" stroke-width="3" stroke-linecap="round"/>
      <path id="ha-brow-r" d="M138 84c-6-5-17-6-24-2" fill="none" stroke="${C.hairDark}" stroke-width="3" stroke-linecap="round"/>

      <g id="ha-mouth">
        <ellipse id="ha-mouth-open" cx="100" cy="134" rx="0" ry="0" fill="${C.mouth}"/>
        <path id="ha-mouth-smile" d="M92 132q8 7 16 0" fill="none" stroke="${C.mouth}" stroke-width="2.6" stroke-linecap="round"/>
      </g>

      <path id="ha-bangs" d="M50 96c-2-34 20-52 50-52s52 18 50 52c-5-16-14-25-25-29-7 9-17 14-27 14-11 0-22-5-29-14-10 4-16 13-19 29z" fill="url(#ha-hair)"/>
      <path d="M62 66c10 10 24 15 38 15s26-5 36-14c-8-14-21-21-38-21s-29 7-36 20z" fill="${C.hairLight}" opacity=".45"/>
      <path id="ha-lock-l" d="M52 84c-6 24-7 58-3 80 6-5 14-5 19-1-6-26-8-56-16-79z" fill="url(#ha-hair)"/>
      <path id="ha-lock-r" d="M148 84c6 24 7 58 3 80-6-5-14-5-19-1 6-26 8-56 16-79z" fill="url(#ha-hair)"/>
      <path id="ha-ahoge" d="M100 24c4-13 15-20 21-13 6 6 0 14-8 16" fill="none" stroke="${C.hair}" stroke-width="5" stroke-linecap="round"/>
    </g>

    <g id="ha-fx" opacity="0">
      <g id="ha-sparkle" opacity="0">
        <path d="M168 60l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ffd97a"/>
        <path d="M32 74l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ffd97a"/>
      </g>
      <path id="ha-sweat" d="M156 84c4 6 7 10 7 14a7 7 0 01-14 0c0-4 3-8 7-14z" fill="#8fd0ef" opacity="0"/>
      <g id="ha-zzz" opacity="0" fill="${C.line}" font-family="system-ui" font-weight="800">
        <text x="150" y="48" font-size="22">z</text>
        <text x="168" y="30" font-size="15">z</text>
        <text x="180" y="18" font-size="10">z</text>
      </g>
    </g>
  </g>
</svg>`;

export function createAvatar(container, options = {}) {
  container.innerHTML = SVG;
  const $ = (id) => container.querySelector(`#${id}`);
  const parts = {
    all: $('ha-all'),
    head: $('ha-head'),
    body: $('ha-body'),
    ahoge: $('ha-ahoge'),
    lidL: $('ha-lid-l'),
    lidR: $('ha-lid-r'),
    irisL: $('ha-iris-l'),
    irisR: $('ha-iris-r'),
    browL: $('ha-brow-l'),
    browR: $('ha-brow-r'),
    blushL: $('ha-blush-l'),
    blushR: $('ha-blush-r'),
    mouthOpen: $('ha-mouth-open'),
    mouthSmile: $('ha-mouth-smile'),
    fx: $('ha-fx'),
    sparkle: $('ha-sparkle'),
    sweat: $('ha-sweat'),
    zzz: $('ha-zzz'),
  };

  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const current = { ...FACES.normal };
  let target = { ...FACES.normal };
  let mouthShape = 'smile';
  let mouthGain = 1;
  let blinkAt = performance.now() + 1500;
  let blink = 0;
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let speakTimer = null;
  let raf = null;

  function applyMouth() {
    const shape = MOUTHS[mouthShape] ?? MOUTHS.closed;
    const size = current.mouthSize * mouthGain;
    const open = !shape.smile;
    parts.mouthOpen.setAttribute('rx', (shape.rx * size).toFixed(2));
    parts.mouthOpen.setAttribute('ry', (shape.ry * size).toFixed(2));
    parts.mouthSmile.style.opacity = open ? 0 : 1;
    if (!open) {
      // 笑顔・への字・波線を 1 本のパスで描き分ける
      const width = 8 * size;
      const depth = current.mouth === 'wavy' ? -4 : 6 * size;
      parts.mouthSmile.setAttribute(
        'd',
        current.mouth === 'wavy'
          ? `M${100 - width} 132q${width / 2} 5 ${width} 0t${width} 0`
          : `M${100 - width} 132q${width} ${depth} ${width * 2} 0`
      );
    }
  }

  function frame(now) {
    const t = now / 1000;
    for (const key of ['lid', 'browY', 'browTilt', 'mouthSize', 'blush', 'tilt', 'sparkle', 'sweat', 'zzz', 'pupil']) {
      current[key] = lerp(current[key], target[key], 0.12);
    }
    current.mouth = target.mouth;

    // まばたき（とじる方が速い）
    if (now > blinkAt) {
      blink = 1;
      blinkAt = now + 1800 + Math.random() * 4200;
    }
    blink = Math.max(0, blink - (blink > 0.5 ? 0.22 : 0.12));

    const sway = still ? 0 : Math.sin(t * 0.7) * 1.4;
    const bob = still ? 0 : Math.sin(t * 1.1) * 1.6;
    const breath = still ? 1 : 1 + Math.sin(t * 0.9) * 0.012;

    parts.head.style.transform = `translate(${(look.x * 2).toFixed(2)}px, ${(bob + look.y).toFixed(2)}px) rotate(${(sway + current.tilt).toFixed(2)}deg)`;
    parts.body.style.transform = `scaleY(${breath.toFixed(4)})`;
    parts.ahoge.style.transform = `rotate(${still ? 0 : (Math.sin(t * 2.1) * 7).toFixed(2)}deg)`;

    // まぶたは目（cy=106, ry=17 → 89..123）を上から覆う板。
    // 全閉で下端が 123、全開で下端が 89（目の上）に来る位置へ動かす。
    const lid = Math.min(1, current.lid + blink);
    const lidY = (55 + 34 * lid).toFixed(2);
    parts.lidL.setAttribute('y', lidY);
    parts.lidR.setAttribute('y', lidY);

    look.x += (look.tx - look.x) * 0.08;
    look.y += (look.ty - look.y) * 0.08;
    const eye = `translate(${(look.x * 3).toFixed(2)}px, ${(look.y * 2).toFixed(2)}px) scale(${current.pupil.toFixed(3)})`;
    parts.irisL.style.transform = eye;
    parts.irisR.style.transform = eye;

    parts.browL.style.transform = `translateY(${current.browY.toFixed(2)}px) rotate(${current.browTilt.toFixed(2)}deg)`;
    parts.browR.style.transform = `translateY(${current.browY.toFixed(2)}px) rotate(${(-current.browTilt).toFixed(2)}deg)`;
    parts.blushL.style.opacity = current.blush.toFixed(2);
    parts.blushR.style.opacity = current.blush.toFixed(2);

    parts.fx.style.opacity = 1;
    parts.sparkle.style.opacity = (current.sparkle * (still ? 1 : 0.6 + Math.sin(t * 4) * 0.4)).toFixed(2);
    parts.sweat.style.opacity = current.sweat.toFixed(2);
    parts.zzz.style.opacity = (current.zzz * (still ? 1 : 0.72 + Math.sin(t * 1.6) * 0.28)).toFixed(2);

    applyMouth();
    raf = requestAnimationFrame(frame);
  }

  // 目は動くものを追う。VTuber らしさはここの有無で決まる。
  const onPointer = (event) => {
    const box = container.getBoundingClientRect();
    look.tx = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / (box.width * 1.5)));
    look.ty = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / (box.height * 2)));
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const api = {
    /** 内面の expression（happy / normal / sad / sulky / sleepy / lonely）をそのまま渡す。 */
    setExpression(name) {
      target = { ...(FACES[name] ?? FACES.normal) };
      if (!speakTimer) mouthShape = target.mouth;
      return api;
    },

    /** 台詞のかなを読んで口を動かす。読み終わるか stopSpeaking() で閉じる。 */
    speak(text, { moraMs = 125 } = {}) {
      api.stopSpeaking();
      const shapes = moraShapes(text);
      if (!shapes.length) return api;
      let index = 0;
      speakTimer = setInterval(() => {
        if (index >= shapes.length) return api.stopSpeaking();
        mouthShape = shapes[index++];
        mouthGain = 0.85 + Math.random() * 0.3; // 機械的な開閉に見えないよう少し揺らす
      }, moraMs);
      return api;
    },

    stopSpeaking() {
      clearInterval(speakTimer);
      speakTimer = null;
      mouthGain = 1;
      mouthShape = target.mouth;
      return api;
    },

    /** つつかれたときの反応。 */
    poke() {
      const back = target;
      api.setExpression('surprise');
      parts.all.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }],
        { duration: 420, easing: 'ease-out' }
      );
      setTimeout(() => {
        target = back;
        if (!speakTimer) mouthShape = target.mouth;
      }, 900);
      return api;
    },

    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(speakTimer);
      window.removeEventListener('pointermove', onPointer);
    },
  };

  container.addEventListener('click', () => api.poke());
  api.setExpression(options.expression ?? 'normal');
  raf = requestAnimationFrame(frame);
  return api;
}
