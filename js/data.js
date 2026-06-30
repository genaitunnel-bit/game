/* ======================================================
   js/data.js  —  全静的データ定義
   ====================================================== */
"use strict";

/* -------- イントロストーリー -------- */
const STORY_SCENES = [
  { speaker: null,    text: '2031年。天使たちは突如として人間界に降臨し、「神の命による人類の粛清」を宣言した。' },
  { speaker: null,    text: 'わずか3ヶ月で、人口の90%が失われた。' },
  { speaker: null,    text: '地下に逃れた我々、人類の生き残りは……ひとつの決断を下した。' },
  { speaker: '???',   text: '「天使を捕らえ、情報を引き出し——天使の本拠地を叩く。」', color: '#C89FFF' },
  { speaker: null,    text: 'あなたは人類抵抗軍の指揮官だ。' },
  { speaker: null,    text: 'これが、天使たちに対する人類最後の反撃の幕開けだった。' },
];

/* -------- 天使キャラクター定義 -------- */
const ANGELS = [
  {
    id: 'sera',
    name: 'セラ',
    title: '偵察天使',
    rank: 1,
    /* 戦闘ステータス */
    hp: 38, atk: 11, def: 5, spd: 9,
    resist: 22, captureAt: 45,
    gold: 40,
    /* 見た目 */
    color:    '#98D8C8',
    hairColor:'#B8E0FF',
    eyeColor: '#87CEEB',
    bgGrad:   'linear-gradient(160deg,#B8E0FF,#7FBFFF)',
    emoji:    '🌊',
    portrait: 'img/characters/sera.png',
    /* 個性 */
    personality: 'gentle',
    desc: '純粋で心優しい偵察天使。人類を傷つけることへの疑問を胸の内に抱えている。',
    /* 弱点（尋問で判明）*/
    weaknessId:   'sera_weakness',
    weaknessName: '氷系攻撃',
    weaknessMulti:1.6,
    /* 天使が知っている情報 */
    knownIntel: ['patrol_route'],
    /* 招集条件 */
    recruitTrust: 70,
    recruitBonus: '防衛力+15%、巡回情報を常時開示',
    recruitEffect: s => { s.player.defBonus += 0.15; },
    /* 尋問台詞（トピック別・信頼度別） */
    topics: {
      mission: {
        label: '使命について聞く',
        icon:  '⚔️',
        responses: [
          { minTrust:  0, text: '……人類の、粛清です。神様の命令で……', emotion: 'sad',       intelId: null },
          { minTrust: 30, text: '最初は正しいことだと信じていました。でも……人の子供が泣いているのを見て、胸が痛くなって……', emotion: 'conflicted', intelId: null },
          { minTrust: 55, text: '本当は……疑問があるんです。神様の言葉は本当に正しいのか。私はただ……', emotion: 'tearful', intelId: null },
        ],
      },
      deity: {
        label: '神について聞く',
        icon:  '✨',
        responses: [
          { minTrust:  0, text: '神様はすべてを司る御方です。疑うことは許されません。', emotion: 'firm',    intelId: null },
          { minTrust: 40, text: '……神様の声を直接聞いたことがある天使は、ほとんどいないんです。命令は上位の天使を通じて来るだけで……', emotion: 'uncertain', intelId: null },
        ],
      },
      others: {
        label: '他の天使について聞く',
        icon:  '👥',
        responses: [
          { minTrust:  0, text: '仲間の情報は教えられません。', emotion: 'firm',  intelId: null },
          { minTrust: 35, text: 'アイリスさんは……厳しい方ですが、実は心が優しいところもあります。', emotion: 'nostalgic', intelId: null },
          { minTrust: 60, text: 'ミカ副隊長は……最近、どこか思い詰めた様子で……', emotion: 'worried', intelId: null },
        ],
      },
      base: {
        label: '拠点の情報を聞く',
        icon:  '🏔️',
        responses: [
          { minTrust:  0, text: '……絶対に教えません！', emotion: 'angry', intelId: null },
          { minTrust: 45, text: '……東の廃墟に前線基地があります。でも私のせいで仲間が…ごめんなさい。', emotion: 'guilty', intelId: 'front_base_loc' },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度65必要）',
        icon:  '💎',
        minTrustRequired: 65,
        responses: [
          { minTrust: 65, text: '……氷には弱いんです。体が動かなくなって……なんで話してるんだろ、私。', emotion: 'confused', intelId: 'sera_weakness' },
        ],
      },
    },
    recruitDlg: 'あなたと話していると……神様の言っていたことが、信じられなくなってきます。……一緒に戦ってもいいですか？',
  },

  {
    id: 'iris',
    name: 'アイリス',
    title: '天使騎士',
    rank: 2,
    hp: 68, atk: 16, def: 9, spd: 7,
    resist: 42, captureAt: 35,
    gold: 80,
    color:    '#C89FFF',
    hairColor:'#E8C8FF',
    eyeColor: '#9B59B6',
    bgGrad:   'linear-gradient(160deg,#E8C8FF,#9B59B6)',
    emoji:    '⚔️',
    portrait: 'img/characters/iris.png',
    personality: 'proud',
    desc: '誇り高き天使騎士。実力主義で人類を見下しているが、認められることを何より求めている。',
    weaknessId:   'iris_weakness',
    weaknessName: '雷系攻撃',
    weaknessMulti:1.5,
    knownIntel: ['patrol_route', 'front_base_loc', 'troop_layout'],
    recruitTrust: 80,
    recruitBonus: '攻撃力+20%、作戦立案が可能',
    recruitEffect: s => { s.player.atkBonus += 0.20; },
    topics: {
      mission: {
        label: '使命について聞く',
        icon:  '⚔️',
        responses: [
          { minTrust:  0, text: '神の命による粛清だ。お前たちが弱いのが悪い。', emotion: 'firm',  intelId: null },
          { minTrust: 30, text: '……強者が弱者を導く。それが秩序だ。だが最近、その「秩序」の意味を問い直している。', emotion: 'conflicted', intelId: null },
        ],
      },
      deity: {
        label: '神について聞く',
        icon:  '✨',
        responses: [
          { minTrust:  0, text: '神について語る資格がお前にあるとは思えん。', emotion: 'angry', intelId: null },
          { minTrust: 45, text: '……神の命令には絶対服従が原則だ。だが私は一度だけ、その命令に疑問を持ったことがある。', emotion: 'uncertain', intelId: null },
        ],
      },
      others: {
        label: '他の天使について聞く',
        icon:  '👥',
        responses: [
          { minTrust:  0, text: '仲間を売るような真似はしない。', emotion: 'firm', intelId: null },
          { minTrust: 40, text: 'セラは純粋すぎる。この戦いに向いていないのかもしれない。', emotion: 'nostalgic', intelId: null },
          { minTrust: 65, text: 'ミカ副隊長は……隊長（クロノス）の命令に疑問を抱いているようだった。私に何かを告げようとしていたが……', emotion: 'worried', intelId: null },
        ],
      },
      base: {
        label: '拠点の情報を聞く',
        icon:  '🏔️',
        responses: [
          { minTrust:  0, text: '笑わせるな。', emotion: 'angry', intelId: null },
          { minTrust: 50, text: '……北の廃工場が補給拠点だ。お前たちを見くびっていたのかもしれない。', emotion: 'reluctant', intelId: 'supply_base_loc' },
          { minTrust: 70, text: '兵力の配置を教えよう。東門に精鋭が集中している……これで満足か？', emotion: 'resigned', intelId: 'troop_layout' },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度75必要）',
        icon:  '💎',
        minTrustRequired: 75,
        responses: [
          { minTrust: 75, text: '……雷を食らうと、翼が動かなくなる。天使の弱点を教えるとは……私も墜ちたものだ。', emotion: 'resigned', intelId: 'iris_weakness' },
        ],
      },
    },
    recruitDlg: '……お前は強い。認めよう。ならば私はお前の剣となろう。人間の指揮官に仕えるのは初めてだが……悪くない。',
  },

  {
    id: 'mika',
    name: 'ミカ',
    title: '天使副隊長',
    rank: 3,
    hp: 115, atk: 24, def: 16, spd: 6,
    resist: 68, captureAt: 25,
    gold: 160,
    color:    '#FF9E6B',
    hairColor:'#FFC8A0',
    eyeColor: '#E06030',
    bgGrad:   'linear-gradient(160deg,#FFD4B8,#E06030)',
    emoji:    '🔥',
    portrait: 'img/characters/mika.png',
    personality: 'conflicted',
    desc: '任務への疑念を抱えながらも使命を果たしてきた副隊長。その葛藤が今、限界を迎えようとしている。',
    weaknessId:   'mika_weakness',
    weaknessName: '神聖魔法（逆説的に弱い）',
    weaknessMulti:1.7,
    knownIntel: ['hq_location', 'commander_plan', 'troop_layout'],
    recruitTrust: 85,
    recruitBonus: '司令部情報を開示、クリティカル+30%',
    recruitEffect: s => { s.player.critBonus += 0.30; },
    topics: {
      mission: {
        label: '使命について聞く',
        icon:  '⚔️',
        responses: [
          { minTrust:  0, text: '……話す気はない。', emotion: 'firm', intelId: null },
          { minTrust: 25, text: '粛清という名の殺戮だ。私はずっとそれに疑問を持ってきた。', emotion: 'conflicted', intelId: null },
          { minTrust: 60, text: '私は……最初から、この命令に納得できていなかった。神の意志とは本当に人類の滅亡なのか？', emotion: 'tearful', intelId: null },
        ],
      },
      deity: {
        label: '神について聞く',
        icon:  '✨',
        responses: [
          { minTrust:  0, text: '……。', emotion: 'sad', intelId: null },
          { minTrust: 35, text: '神の名を借りているだけかもしれない。本当の意思がどこにあるのか、私にもわからなくなってきた。', emotion: 'uncertain', intelId: null },
          { minTrust: 70, text: '神など……実在しないのかもしれない。私たちは誰かの道具として使われているだけなのかも。', emotion: 'broken', intelId: null },
        ],
      },
      others: {
        label: '他の天使について聞く',
        icon:  '👥',
        responses: [
          { minTrust:  0, text: '……仲間を売る気はない。', emotion: 'firm', intelId: null },
          { minTrust: 40, text: 'クロノス隊長は……揺るぎない信仰を持つ。だが最近、何か変わった気がする。', emotion: 'worried', intelId: null },
        ],
      },
      base: {
        label: '拠点の情報を聞く',
        icon:  '🏔️',
        responses: [
          { minTrust:  0, text: '……できない。', emotion: 'firm', intelId: null },
          { minTrust: 55, text: '山の向こうに天使司令部がある。クロノス隊長はそこにいる。', emotion: 'resigned', intelId: 'hq_location' },
          { minTrust: 75, text: '……クロノス隊長の作戦を教えよう。人類の拠点を三方から同時に攻める計画だ。時間がない。', emotion: 'urgent', intelId: 'commander_plan' },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度80必要）',
        icon:  '💎',
        minTrustRequired: 80,
        responses: [
          { minTrust: 80, text: '……皮肉だが、天使は神聖魔法に弱い。天使自身が使う力が、私たちにとって最大の脅威になる。使えるなら使え。', emotion: 'resigned', intelId: 'mika_weakness' },
        ],
      },
    },
    recruitDlg: '……もういい。私はあなたと戦う。人類のためではなく——本当の正義のために。',
  },

  {
    id: 'kronos',
    name: 'クロノス',
    title: '大天使長',
    rank: 4,
    hp: 165, atk: 32, def: 24, spd: 5,
    resist: 88, captureAt: 12,
    gold: 320,
    color:    '#E8E0F8',
    hairColor:'#FFFFFF',
    eyeColor: '#D4BAFF',
    bgGrad:   'linear-gradient(160deg,#E8E0F8,#9080B8)',
    emoji:    '👑',
    portrait: 'img/characters/kronos.png',
    personality: 'absolute',
    desc: '神の代行者と称される大天使長。その信念は鋼鉄のように固く、揺るがない……と言われている。',
    weaknessId:   'kronos_weakness',
    weaknessName: '人類の意志（精神的弱点）',
    weaknessMulti:2.0,
    knownIntel: ['kronos_secret', 'final_gate'],
    recruitTrust: 99,
    recruitBonus: '特別エンディング解放',
    recruitEffect: s => { s.player.secretEnd = true; },
    topics: {
      mission: {
        label: '使命について聞く',
        icon:  '⚔️',
        responses: [
          { minTrust:  0, text: '……人類の粛清は神の意志だ。それ以上でも以下でもない。', emotion: 'firm', intelId: null },
          { minTrust: 30, text: 'お前に理解できるとは思わないが……この使命を帯びた日から、私は一度も迷ったことはない。', emotion: 'firm', intelId: null },
          { minTrust: 60, text: '……一度だけ、迷ったことがある。それは……', emotion: 'conflicted', intelId: null },
        ],
      },
      deity: {
        label: '神について聞く',
        icon:  '✨',
        responses: [
          { minTrust:  0, text: '神について語る資格が人間にあるとは思えない。', emotion: 'cold', intelId: null },
          { minTrust: 40, text: '……神が人類の創造者であることは疑いない。しかしその意志が「粛清」にあるのかどうかは……', emotion: 'uncertain', intelId: null },
          { minTrust: 70, text: '私たちを動かしているのが本当に神なのか、それとも……誰かに利用されているのか。考えたくはないが……', emotion: 'broken', intelId: 'kronos_secret' },
        ],
      },
      others: {
        label: '他の天使について聞く',
        icon:  '👥',
        responses: [
          { minTrust:  0, text: '答える必要はない。', emotion: 'cold', intelId: null },
          { minTrust: 50, text: 'ミカは優秀な副官だった。彼女の葛藤には気づいていた……だが止められなかった。', emotion: 'regret', intelId: null },
        ],
      },
      base: {
        label: '拠点の情報を聞く',
        icon:  '🏔️',
        responses: [
          { minTrust:  0, text: '笑わせるな。', emotion: 'cold', intelId: null },
          { minTrust: 60, text: '……最後の門の場所を教えよう。もはや私には、隠す理由がない。', emotion: 'resigned', intelId: 'final_gate' },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度90必要）',
        icon:  '💎',
        minTrustRequired: 90,
        responses: [
          { minTrust: 90, text: '……大天使の弱点は「絶望」だ。人類が諦めない限り、私たちは力を失っていく。お前たちの意志こそが……最大の武器だ。', emotion: 'resigned', intelId: 'kronos_weakness' },
        ],
      },
    },
    recruitDlg: '……私が間違っていた。神の名の下に行った蛮行は、取り返しがつかない。だが……残りの命を、贖罪に使わせてくれ。',
  },
];

/* -------- 情報プール -------- */
const INTEL_POOL = [
  { id:'patrol_route',   name:'巡回ルート',       cat:'location',
    trueText: '夜明け前の1時間、見張りの数が最も少なくなる。この隙を突くことが潜入の鍵だ。',
    falseText:'深夜0時に守備の交代があり、その瞬間に隙ができるという情報。',
    unlocks: ['outpost'], relevantFor:['infiltration','flanking'] },

  { id:'front_base_loc', name:'前線基地の場所',    cat:'location',
    trueText: '東の廃墟地帯に天使の前線基地がある。中規模の部隊が駐留している。',
    falseText:'南の工業地帯に前線基地があるという情報。（誤報の可能性あり）',
    unlocks: ['front_base'], relevantFor:['frontal','flanking'] },

  { id:'troop_layout',   name:'兵力配置',          cat:'tactical',
    trueText: '精鋭部隊は東門に集中し、北側は比較的手薄だ。北からの迂回が有効。',
    falseText:'兵力は均等に配置されており、どの門も同等の防御力を持つ。',
    unlocks: [], relevantFor:['flanking'] },

  { id:'supply_base_loc',name:'補給拠点の場所',    cat:'location',
    trueText: '北の廃工場が天使の主要補給拠点。ここを落とせば前線が弱体化する。',
    falseText:'西の港に補給物資が集積されているという話。',
    unlocks: ['supply_base'], relevantFor:['sabotage'] },

  { id:'hq_location',    name:'司令部の場所',       cat:'location',
    trueText: '山の向こう、かつての議事堂が天使の司令部として使われている。',
    falseText:'地下深くに天使の司令部が建設されているという情報。',
    unlocks: ['hq'], relevantFor:['assassination','infiltration'] },

  { id:'commander_plan', name:'クロノスの作戦',     cat:'tactical',
    trueText: '大天使長クロノスは人類拠点を三方から同時攻撃する「清算作戦」を72時間以内に実行する計画だ。',
    falseText:'クロノスは防衛に徹しており、積極的な攻勢を行う気はないという。',
    unlocks: [], relevantFor:['frontal','assassination'] },

  { id:'final_gate',     name:'最終門の場所',       cat:'location',
    trueText: '大天使の本拠地への最終門は、旧大聖堂の地下に隠されている。',
    falseText:'最終門は空中の要塞に繋がっているという証言。',
    unlocks: ['final_bastion'], relevantFor:['infiltration','frontal'] },

  { id:'kronos_secret',  name:'クロノスの秘密',     cat:'secret',
    trueText: '大天使クロノスたちを動かしているのは「神」ではなく、人間界のある組織が開発した制御装置だという衝撃の事実。',
    falseText:'クロノスは神の意志に従うのみで、自らの意思は持たないという。',
    unlocks: ['final_bastion'], relevantFor:['assassination'] },

  /* 個人の弱点 */
  { id:'sera_weakness',  name:'セラの弱点',         cat:'weakness',
    trueText: '【セラの戦闘弱点】氷系の攻撃を受けると翼が凍り、飛行・回避が不可能になる。氷を使えばダメージ1.6倍。',
    falseText:'セラは炎を弱点とする。（誤情報）',
    unlocks: [], relevantFor:['battle_sera'] },

  { id:'iris_weakness',  name:'アイリスの弱点',     cat:'weakness',
    trueText: '【アイリスの戦闘弱点】雷撃を受けると全身が麻痺し、防御力が半減する。雷を使えばダメージ1.5倍。',
    falseText:'アイリスは炎を弱点とする。（誤情報）',
    unlocks: [], relevantFor:['battle_iris'] },

  { id:'mika_weakness',  name:'ミカの弱点',         cat:'weakness',
    trueText: '【ミカの戦闘弱点】天使は神聖魔法を逆利用されると内部から崩壊する。神聖系攻撃でダメージ1.7倍。',
    falseText:'ミカは精神的攻撃に弱い。（誤情報）',
    unlocks: [], relevantFor:['battle_mika'] },

  { id:'kronos_weakness',name:'クロノスの弱点',     cat:'weakness',
    trueText: '【クロノスの精神的弱点】人類の諦めない意志が大天使の力を削ぐ。戦闘で士気を高めるとダメージ2.0倍のボーナスが発生。',
    falseText:'クロノスに弱点はない。（誤情報）',
    unlocks: [], relevantFor:['battle_kronos'] },
];

/* -------- 攻略拠点（タワーディフェンス wave 設定込み）-------- */
const LOCATIONS = [
  {
    id:'outpost', name:'天使の哨戒拠点', icon:'🗼',
    desc:'最前線の見張り台。偵察天使が常駐している。',
    reqIntel:[], defense:25, angelId:'sera',
    startGold: 220, baseHp: 20,
    waves: [
      { prepTime:35, enemies:[
          { type:'grunt', count:6, spawnInterval:1.6 }
        ]
      },
      { prepTime:25, enemies:[
          { type:'grunt', count:5, spawnInterval:1.2 },
          { type:'elite', count:2, spawnInterval:2.0 }
        ]
      },
      { prepTime:20, enemies:[
          { type:'grunt', count:4, spawnInterval:1.0 },
          { type:'boss',  count:1, bossAngelId:'sera', spawnInterval:0, hpMod:1.0 }
        ]
      },
    ],
    dropTable: [
      { itemId:'ration',   weight:8 },
      { itemId:'tea',      weight:4 },
      { itemId:'old_coin', weight:6 },
      { itemId:'quiver',   weight:2 },
      { itemId:'heal_kit', weight:3 },
    ],
  },
  {
    id:'front_base', name:'天使前線基地', icon:'⛺',
    desc:'天使騎士が駐留する前線。ここを落とせば防衛線が崩れる。',
    reqIntel:['front_base_loc'], defense:55, angelId:'iris',
    startGold: 260, baseHp: 18,
    waves: [
      { prepTime:35, enemies:[
          { type:'grunt', count:8, spawnInterval:1.4 },
          { type:'elite', count:2, spawnInterval:2.5 }
        ]
      },
      { prepTime:28, enemies:[
          { type:'elite', count:5, spawnInterval:1.8 },
          { type:'heavy', count:1, spawnInterval:0   }
        ]
      },
      { prepTime:22, enemies:[
          { type:'grunt', count:6, spawnInterval:1.0 },
          { type:'elite', count:3, spawnInterval:1.8 },
          { type:'boss',  count:1, bossAngelId:'iris', spawnInterval:0, hpMod:1.0 }
        ]
      },
    ],
    dropTable: [
      { itemId:'tea',      weight:5 },
      { itemId:'crystal',  weight:3 },
      { itemId:'scope',    weight:2 },
      { itemId:'heal_kit', weight:4 },
      { itemId:'bomb',     weight:2 },
    ],
  },
  {
    id:'supply_base', name:'天使補給拠点', icon:'📦',
    desc:'天使軍の補給路の要。制圧すれば敵が弱体化する。',
    reqIntel:['supply_base_loc'], defense:45, angelId:'iris',
    startGold: 240, baseHp: 18,
    waves: [
      { prepTime:35, enemies:[
          { type:'grunt', count:7, spawnInterval:1.3 },
          { type:'heavy', count:1, spawnInterval:3.0 }
        ]
      },
      { prepTime:25, enemies:[
          { type:'elite', count:4, spawnInterval:1.6 },
          { type:'heavy', count:2, spawnInterval:3.0 }
        ]
      },
      { prepTime:20, enemies:[
          { type:'elite', count:5, spawnInterval:1.0 },
          { type:'boss',  count:1, bossAngelId:'iris', spawnInterval:0, hpMod:1.1 }
        ]
      },
    ],
    dropTable: [
      { itemId:'ration',       weight:5 },
      { itemId:'gift_jewelry', weight:2 },
      { itemId:'quiver',       weight:3 },
      { itemId:'fortify',      weight:3 },
      { itemId:'treasure_map', weight:1 },
    ],
  },
  {
    id:'hq', name:'天使司令部', icon:'🏰',
    desc:'副隊長ミカが指揮を執る難攻不落の要塞。',
    reqIntel:['hq_location'], defense:80, angelId:'mika',
    startGold: 300, baseHp: 16,
    waves: [
      { prepTime:40, enemies:[
          { type:'elite', count:6, spawnInterval:1.2 },
          { type:'heavy', count:2, spawnInterval:3.0 }
        ]
      },
      { prepTime:30, enemies:[
          { type:'heavy', count:4, spawnInterval:2.5 },
          { type:'elite', count:4, spawnInterval:1.0 }
        ]
      },
      { prepTime:25, enemies:[
          { type:'elite', count:4, spawnInterval:1.2 },
          { type:'heavy', count:2, spawnInterval:2.5 }
        ]
      },
      { prepTime:20, enemies:[
          { type:'grunt', count:8, spawnInterval:0.8 },
          { type:'boss',  count:1, bossAngelId:'mika', spawnInterval:0, hpMod:1.0 }
        ]
      },
    ],
    dropTable: [
      { itemId:'rare_tome',    weight:3 },
      { itemId:'frost_core',   weight:3 },
      { itemId:'cannon_powder',weight:2 },
      { itemId:'cipher_doc',   weight:1 },
      { itemId:'scope',        weight:2 },
    ],
  },
  {
    id:'final_bastion', name:'大天使の本拠地', icon:'👑',
    desc:'クロノスの最後の砦。人類の命運はここで決まる。',
    reqIntel:['final_gate','kronos_secret'], defense:100, angelId:'kronos',
    startGold: 350, baseHp: 15,
    waves: [
      { prepTime:45, enemies:[
          { type:'heavy', count:4, spawnInterval:2.2 },
          { type:'elite', count:6, spawnInterval:1.0 }
        ]
      },
      { prepTime:35, enemies:[
          { type:'heavy', count:6, spawnInterval:2.0 },
          { type:'elite', count:8, spawnInterval:0.9 }
        ]
      },
      { prepTime:30, enemies:[
          { type:'heavy', count:8, spawnInterval:1.8 }
        ]
      },
      { prepTime:25, enemies:[
          { type:'elite', count:6, spawnInterval:0.8 },
          { type:'heavy', count:4, spawnInterval:2.0 },
          { type:'boss',  count:1, bossAngelId:'kronos', spawnInterval:0, hpMod:1.0 }
        ]
      },
    ],
    dropTable: [
      { itemId:'gift_jewelry', weight:3 },
      { itemId:'rare_tome',    weight:3 },
      { itemId:'scope',        weight:2 },
      { itemId:'cipher_doc',   weight:2 },
      { itemId:'treasure_map', weight:2 },
    ],
  },
];

/* -------- 作戦種別 -------- */
const STRATEGIES = [
  { id:'frontal',      name:'正面突破',  icon:'⚔️',  base:42, relevantIntel:['patrol_route','troop_layout'], desc:'全戦力で正面から突撃。防衛情報が精度を左右する。' },
  { id:'flanking',     name:'側面迂回',  icon:'🏇',  base:50, relevantIntel:['troop_layout','patrol_route'],  desc:'兵力が手薄な側面から攻める。配置情報が必須。' },
  { id:'infiltration', name:'潜入工作',  icon:'🕵️', base:38, relevantIntel:['patrol_route','hq_location'],   desc:'少数精鋭で内部に侵入し内側から崩す。巡回情報が鍵。' },
  { id:'sabotage',     name:'補給切断',  icon:'💣',  base:45, relevantIntel:['supply_base_loc','patrol_route'],desc:'補給線を断ち、敵を弱体化させてから攻撃する。' },
  { id:'assassination',name:'暗殺作戦',  icon:'🗡️', base:35, relevantIntel:['hq_location','commander_plan'],  desc:'少数で指揮官を直接狙う。弱点情報があれば有利。' },
];

/* -------- 尋問メソッド -------- */
const METHODS = [
  { id:'kind',   name:'優しく接する', icon:'🫖', cost:0,   trustMod:+20, fearMod:-10, infoAccMod:-15, canRecruit:true,
    posText:'好感度 +20', negText:'情報精度 低下' },
  { id:'talk',   name:'じっくり話す', icon:'💬', cost:0,   trustMod:+12, fearMod:  0, infoAccMod:  0, canRecruit:true,
    posText:'好感度 +12', negText:'' },
  { id:'gift',   name:'贈り物をする', icon:'🎁', cost:200, trustMod: +6, fearMod: +5, infoAccMod:+15, canRecruit:false,
    posText:'情報精度 +15', negText:'招集不可 / 200G消費' },
  { id:'press',  name:'強引に尋問',  icon:'👊', cost:0,   trustMod:-28, fearMod:+30, infoAccMod:+30, canRecruit:false,
    posText:'情報精度 +30', negText:'好感度 -28 / 招集不可' },
];

/* -------- プレイヤー初期ソルジャー -------- */
const PLAYER_UNIT = {
  name: '人類抵抗軍兵士',
  hp: 60, atk: 14, def: 8, spd: 7,
  emoji: '🪖',
};

/* ======================================================
   アイテム定義
   cat: 'interrogation' | 'equipment' | 'battle' | 'intel'
   ====================================================== */
const ITEMS = [
  // ---- 尋問アイテム（MEHODSの代わりに使用）----
  { id:'ration',       name:'携帯食料',     cat:'interrogation', icon:'🍱', rarity:'common',
    trustMod:+10, fearMod: 0, infoAccMod:  0, canRecruit:true,
    desc:'基本的な食料。信頼を少し得られる。' },
  { id:'tea',          name:'紅茶セット',   cat:'interrogation', icon:'☕', rarity:'common',
    trustMod:+18, fearMod:-5, infoAccMod: +5, canRecruit:true,
    desc:'心が落ち着く一杯。信頼度がより上がる。' },
  { id:'gift_jewelry', name:'宝飾品',       cat:'interrogation', icon:'💎', rarity:'rare',
    trustMod:+30, fearMod: 0, infoAccMod:+20, canRecruit:false,
    desc:'豪華な贈り物。信頼度が大幅アップ。招集不可。' },
  { id:'rare_tome',    name:'希少な書物',   cat:'interrogation', icon:'📖', rarity:'rare',
    trustMod:+15, fearMod:+8, infoAccMod:+35, canRecruit:false,
    desc:'貴重な文献。情報精度が大きく向上する。' },
  // ---- 装備アイテム（タワー強化）----
  { id:'quiver',       name:'矢筒強化',     cat:'equipment', icon:'🏹', rarity:'common',
    effect:'archer_dmg', value:50, desc:'弓兵タワーの攻撃力 +50%' },
  { id:'crystal',      name:'魔力の結晶',   cat:'equipment', icon:'🔮', rarity:'common',
    effect:'mage_dmg',   value:50, desc:'魔術師タワーの攻撃力 +50%' },
  { id:'frost_core',   name:'氷核',         cat:'equipment', icon:'❄️',  rarity:'common',
    effect:'ice_slow',   value:25, desc:'氷術師タワーの遅延効果 +25%' },
  { id:'cannon_powder',name:'上質な火薬',   cat:'equipment', icon:'💥', rarity:'uncommon',
    effect:'cannon_dmg', value:50, desc:'大砲タワーの攻撃力 +50%' },
  { id:'scope',        name:'精密照準器',   cat:'equipment', icon:'🔭', rarity:'uncommon',
    effect:'all_range',  value:0.5, desc:'全タワーの射程 +0.5マス' },
  { id:'fortify',      name:'城塞強化材',   cat:'equipment', icon:'🧱', rarity:'common',
    effect:'base_hp',    value:5, desc:'拠点の最大HP +5' },
  { id:'old_coin',     name:'古い硬貨',     cat:'equipment', icon:'🪙', rarity:'common',
    effect:'gold_bonus', value:50, desc:'ゴールド +50（即時）' },
  // ---- 戦闘アイテム（戦闘中に使用）----
  { id:'bomb',         name:'爆発物',       cat:'battle', icon:'💣', rarity:'uncommon',
    desc:'画面上の全ての敵に200ダメージ。' },
  { id:'heal_kit',     name:'回復キット',   cat:'battle', icon:'💊', rarity:'common',
    desc:'拠点のHPを3回復。' },
  // ---- 情報アイテム（新しいintelが解放される）----
  { id:'treasure_map', name:'宝物庫の地図', cat:'intel', icon:'🗺️', rarity:'rare',
    intelId:'treasure_vault_loc', desc:'宝物庫の場所が判明する。' },
  { id:'cipher_doc',   name:'暗号書類',     cat:'intel', icon:'📜', rarity:'rare',
    intelId:'cipher_plans', desc:'天使の秘密作戦の断片が手に入る。' },
];

/* ======================================================
   情報プールへの追加エントリ（data.jsの続き）
   ====================================================== */
INTEL_POOL.push(
  { id:'treasure_vault_loc', name:'宝物庫の場所', cat:'secret',
    trueText:'天使軍の宝物庫は、廃棄された大聖堂の地下に隠されている。希少なアイテムが眠るという。',
    falseText:'宝物庫は海岸沿いの廃屋にあると記されている。（信憑性不明）',
    unlocks:['final_bastion'], relevantFor:['infiltration'] },
  { id:'cipher_plans', name:'暗号化された作戦書', cat:'tactical',
    trueText:'大天使クロノスの「最終粛清計画」の暗号書類。解読すると人類の拠点への精密攻撃スケジュールが含まれていた。',
    falseText:'解読できなかった暗号書類。おそらく偽の情報が含まれている。',
    unlocks:[], relevantFor:['assassination','frontal'] }
);

/* ======================================================
   ドロップ計算ユーティリティ
   ====================================================== */
function rollDrops(location, intelIds, dropBoostMult) {
  const table  = location.dropTable || [];
  const boost  = dropBoostMult || 1;
  const drops  = [];
  const allW   = table.reduce((s, e) => s + e.weight, 0);
  // Intel による追加ブースト
  const hasPatrolIntel  = intelIds.includes('patrol_route');
  const hasSupplyIntel  = intelIds.includes('supply_base_loc');
  const hasTroopIntel   = intelIds.includes('troop_layout');
  const extraBoost = (hasPatrolIntel ? 0.3 : 0) + (hasSupplyIntel ? 0.5 : 0) + (hasTroopIntel ? 0.2 : 0);

  // 2〜4個ドロップ
  const count = Math.min(table.length, Math.floor(2 + boost + extraBoost));
  const pool  = [...table];
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) break;
    const r = Math.random() * pool.reduce((s,e)=>s+e.weight,0);
    let acc = 0;
    for (let j = 0; j < pool.length; j++) {
      acc += pool[j].weight;
      if (r < acc) {
        drops.push(pool[j].itemId);
        pool.splice(j, 1);
        break;
      }
    }
  }
  return drops;
}

/* ======================================================
   尋問イベントシーン定義
   trust の閾値に達したときに自動トリガー
   ====================================================== */
const INTERROGATION_EVENTS = {
  sera: [
    {
      id: 'sera_evt_30', minTrust: 30,
      title: '心の揺れ',
      lines: [
        { speaker:'セラ', text:'……あなたは、私を怖くないんですか？', emotion:'conflicted' },
        { speaker:'指揮官', text:'怖くはない。あなたが苦しんでいるのはわかる。', emotion:'' },
        { speaker:'セラ', text:'……不思議な人ですね。人間なのに。', emotion:'nostalgic' },
      ],
      trustBonus: 5,
    },
    {
      id: 'sera_evt_55', minTrust: 55,
      title: '信仰への疑い',
      lines: [
        { speaker:'セラ', text:'神様の声を……直接聞いたことがないんです。本当に。', emotion:'uncertain' },
        { speaker:'指揮官', text:'では、命令は誰から来るんだ？', emotion:'' },
        { speaker:'セラ', text:'上位の天使から……でも、その天使も同じことを言っていて。もしかして……', emotion:'broken' },
        { speaker:'セラ', text:'もしかして、神様なんていないのかもしれない。', emotion:'tearful' },
      ],
      trustBonus: 8,
    },
    {
      id: 'sera_evt_80', minTrust: 80,
      title: '決断の前夜',
      lines: [
        { speaker:'セラ', text:'あなたのそばにいると……温かい気持ちになります。', emotion:'happy' },
        { speaker:'セラ', text:'これって……何なんでしょう？', emotion:'confused' },
        { speaker:'指揮官', text:'信頼、だと思う。', emotion:'' },
        { speaker:'セラ', text:'……信頼。そうか、そういう気持ちを「信頼」って言うんですね。', emotion:'nostalgic' },
      ],
      trustBonus: 6,
    },
  ],
  iris: [
    {
      id: 'iris_evt_30', minTrust: 30,
      title: 'プライドの壁',
      lines: [
        { speaker:'アイリス', text:'……お前は、弱者を蔑まないのか。', emotion:'firm' },
        { speaker:'指揮官', text:'強さと弱さは状況次第だ。', emotion:'' },
        { speaker:'アイリス', text:'……ふん。人間らしい答えだ。', emotion:'conflicted' },
      ],
      trustBonus: 5,
    },
    {
      id: 'iris_evt_60', minTrust: 60,
      title: '認められたい心',
      lines: [
        { speaker:'アイリス', text:'……私は、ずっと強くなろうとしてきた。', emotion:'sad' },
        { speaker:'アイリス', text:'誰かに認められるために。でも、神様は何も言わなかった。', emotion:'tearful' },
        { speaker:'指揮官', text:'俺はお前の強さを認めている。', emotion:'' },
        { speaker:'アイリス', text:'……！　……そ、そうか。ありがとう、と言っておこう。', emotion:'conflicted' },
      ],
      trustBonus: 8,
    },
  ],
  mika: [
    {
      id: 'mika_evt_30', minTrust: 30,
      title: '重荷',
      lines: [
        { speaker:'ミカ', text:'……何年も、この任務を続けてきた。', emotion:'sad' },
        { speaker:'ミカ', text:'人が死んでいくのを見るたびに、何かが壊れていく気がした。', emotion:'broken' },
        { speaker:'指揮官', text:'……よく、ここまで耐えてきたな。', emotion:'' },
        { speaker:'ミカ', text:'……お前は変なやつだ。人間のくせに、私を責めない。', emotion:'conflicted' },
      ],
      trustBonus: 6,
    },
    {
      id: 'mika_evt_65', minTrust: 65,
      title: '告白',
      lines: [
        { speaker:'ミカ', text:'クロノス隊長のことを……話す。', emotion:'urgent' },
        { speaker:'ミカ', text:'あの方は、誰かに操られている。本当の意思ではない。', emotion:'worried' },
        { speaker:'指揮官', text:'操られている？　誰に？', emotion:'' },
        { speaker:'ミカ', text:'それが……わからない。でも、「制御装置」という言葉を聞いた。', emotion:'broken' },
      ],
      trustBonus: 10,
    },
  ],
  kronos: [
    {
      id: 'kronos_evt_40', minTrust: 40,
      title: '揺れ動く神',
      lines: [
        { speaker:'クロノス', text:'……お前は、私を倒せると思っているのか。', emotion:'firm' },
        { speaker:'指揮官', text:'倒したいわけじゃない。真実が知りたいだけだ。', emotion:'' },
        { speaker:'クロノス', text:'……真実。私は長い間、その言葉を忘れていた。', emotion:'conflicted' },
        { speaker:'クロノス', text:'神の言葉だと思っていたものが……命令だったとしたら。', emotion:'uncertain' },
      ],
      trustBonus: 8,
    },
    {
      id: 'kronos_evt_75', minTrust: 75,
      title: '制御の真実',
      lines: [
        { speaker:'クロノス', text:'……教えよう。私たちを動かしているのは、神ではない。', emotion:'broken' },
        { speaker:'クロノス', text:'人間界のある組織が開発した「制御装置」……それが私たちの神だ。', emotion:'resigned' },
        { speaker:'指揮官', text:'何者が……なぜ？', emotion:'' },
        { speaker:'クロノス', text:'わからない。だが、お前ならその答えを見つけられるかもしれない。', emotion:'sad' },
      ],
      trustBonus: 12,
    },
  ],
};
