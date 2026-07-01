/* ======================================================
   js/data.js  —  全静的データ定義
   ====================================================== */
"use strict";

/* -------- イントロストーリー -------- */
const STORY_SCENES = [
  { speaker: null,      text: '2031年。天界の上位天使たちが突如として人間界に降臨し、「神の命による人類の粛清」を宣言した。' },
  { speaker: null,      text: 'わずか3ヶ月で、人口の90%が失われた。地下に逃れた我々は——一つの決断を下した。' },
  { speaker: null,      text: 'そしてある日、予想外の来訪者が私の元に現れた。' },
  { speaker: 'ルミエル', text: '……あの、ちょっといいですか。天界であなたへの「処理命令」が下されていて、私がその担当に配置されたんですが。', color: '#B8E4FF' },
  { speaker: '指揮官',  text: '「処理担当」が、なぜ私に話しかけている？', color: '#AAA8CC' },
  { speaker: 'ルミエル', text: 'だって……命令がおかしいと思ってるから。裁判もなく、理由も曖昧で。私、天界の判断に納得できないんです。', color: '#B8E4FF' },
  { speaker: null,      text: '天界記録補佐部門の下位天使・ルミエルと、人類抵抗軍指揮官は、奇妙な同盟を結んだ。' },
  { speaker: null,      text: '目的——処理命令の真実を暴き、天界の最上位へと辿り着くこと。' },
];

/* -------- 天使キャラクター定義 -------- */
const ANGELS = [

  /* ── No.0 ルミエル（案内役・仲間）────────────── */
  {
    id: 'lumiel', name: 'ルミエル', title: '記録補佐の天使', rank: 0,
    hp: 48, atk: 13, def: 7, spd: 11, mov: 4, rng: 2,
    resist: 10, captureAt: 0, gold: 0,
    color: '#B8E4FF', hairColor: '#D8F0FF', eyeColor: '#87CEEB',
    bgGrad: 'linear-gradient(160deg,#D8F0FF,#90C8FF)',
    emoji: '📖', portrait: 'img/characters/lumiel.png',
    personality: 'blunt_caring',
    desc: '天界記録補佐部門の下位天使。処理命令に唯一疑問を持ち、指揮官と共に真実を追う。ぶっきらぼうだが情が深い。',
    weaknessId: null, weaknessName: null, weaknessMulti: 1.0,
    knownIntel: ['front_base_loc','garden_loc'],
    recruitTrust: 0, recruitBonus: '天界情報を開示、遠距離攻撃+1',
    recruitEffect: s => {},
    topics: {
      truth: {
        label: '処理命令について聞く', icon: '📋',
        responses: [
          { minTrust: 0, text: '処理命令書、私も中身を見ました。理由が「存在が不都合」ってだけで……。意味がわからない。', emotion: 'conflicted', intelId: null },
          { minTrust: 40, text: '命令に署名したのはセラフィエルです。でも彼女は「命令を受けた」と言っていた。じゃあ、誰が出したの？', emotion: 'worried', intelId: null },
        ],
      },
      others: {
        label: '他の天使について聞く', icon: '👥',
        responses: [
          { minTrust: 0, text: '全員と面識はあります。エルティア様は私の上司で……観測データのためなら何でもする人。', emotion: 'uncertain', intelId: null },
          { minTrust: 35, text: 'ラグナリア様のことは……考えたくもない。あの方が動いたら、もう止められない。', emotion: 'worried', intelId: null },
        ],
      },
    },
    recruitDlg: 'ぶっきらぼうに言いますけど……あなたと一緒にいると、変な気分がします。悪くないです。',
  },

  /* ── No.1 セラフィエル（裁きの天使）────────────── */
  {
    id: 'seraphiel', name: 'セラフィエル', title: '裁きの天使', rank: 1,
    hp: 42, atk: 13, def: 7, spd: 9, mov: 4, rng: 1,
    resist: 30, captureAt: 40, gold: 50,
    color: '#F0F0FF', hairColor: '#FFFFFF', eyeColor: '#D0D0FF',
    bgGrad: 'linear-gradient(160deg,#FFFFFF,#D0D0FF)',
    emoji: '⚖️', portrait: 'img/characters/seraphiel.png',
    personality: 'cold_legal',
    desc: '天界の裁判官。感情を一切介さず罪を裁くことに特化した上位天使。処理命令に署名した当事者。',
    weaknessId: 'seraphiel_weakness', weaknessName: '感情的な訴え', weaknessMulti: 1.5,
    knownIntel: ['front_base_loc','garden_loc','processing_order'],
    recruitTrust: 75,
    recruitBonus: '天界法典を解析、防御力+15%',
    recruitEffect: s => { s.player.defBonus += 0.15; },
    topics: {
      mission: {
        label: '使命について聞く', icon: '⚔️',
        responses: [
          { minTrust:  0, text: '汝の罪は既に記録されている。裁きは粛々と執行されるのみだ。', emotion: 'firm', intelId: null },
          { minTrust: 30, text: '……命令は上位から来た。私は法典に従い署名した。それ以上でも以下でもない。', emotion: 'uncertain', intelId: null },
          { minTrust: 55, text: '署名した……後悔が、あるかもしれない。法典に、感情の余地はないはずなのに。', emotion: 'conflicted', intelId: null },
        ],
      },
      law: {
        label: '法典について聞く', icon: '📜',
        responses: [
          { minTrust:  0, text: '天界法典は神の意志の具現化だ。疑問を持つ余地はない。', emotion: 'firm', intelId: null },
          { minTrust: 40, text: '……法典は正義のためにあるはずだった。しかし私が署名した命令は——本当に正義なのか。', emotion: 'uncertain', intelId: null },
        ],
      },
      others: {
        label: '他の天使について聞く', icon: '👥',
        responses: [
          { minTrust:  0, text: '他の天使の情報を人間に渡す義務はない。', emotion: 'firm', intelId: null },
          { minTrust: 35, text: '……ミリエルは殲滅部隊の残骸だ。廃戦場に展開している。感情を失った兵器と思え。', emotion: 'sad', intelId: 'front_base_loc' },
          { minTrust: 55, text: 'アリュシアは……諜報員だ。花園という名の拠点で潜入訓練を行っている。', emotion: 'reluctant', intelId: 'garden_loc' },
        ],
      },
      order: {
        label: '処理命令について聞く', icon: '📋',
        responses: [
          { minTrust:  0, text: '開示する権限がない。', emotion: 'firm', intelId: null },
          { minTrust: 50, text: '……命令書には「ラグナリア様の裁量による最終処理対象」とだけ記されていた。理由は私も知らない。', emotion: 'uncertain', intelId: 'processing_order' },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度65必要）', icon: '💎', minTrustRequired: 65,
        responses: [
          { minTrust: 65, text: '……感情的な訴えには、私の論理回路が追いつかなくなる。裁判官としての欠陥だ。', emotion: 'resigned', intelId: 'seraphiel_weakness' },
        ],
      },
    },
    recruitDlg: '……法典の外に、正義があるとすれば——それを見つけるために、あなたに従おう。判決：無罪。',
  },

  /* ── No.2 ミリエル（殲滅の天使）────────────── */
  {
    id: 'miriel', name: 'ミリエル', title: '殲滅の天使', rank: 2,
    hp: 78, atk: 22, def: 14, spd: 5, mov: 3, rng: 1,
    resist: 55, captureAt: 30, gold: 90,
    color: '#CC5577', hairColor: '#E888A0', eyeColor: '#FF3355',
    bgGrad: 'linear-gradient(160deg,#663344,#CC3355)',
    emoji: '🔨', portrait: 'img/characters/miriel.png',
    personality: 'silent_broken',
    desc: '元・戦場処理部隊の執行天使。幾千の戦場で後始末を担い続けた結果、感情を完全に失った。言葉よりも破壊を好む。',
    weaknessId: 'miriel_weakness', weaknessName: '聖なる光（暗黒の翼の弱点）', weaknessMulti: 1.6,
    knownIntel: ['tower_loc','battle_records'],
    recruitTrust: 80,
    recruitBonus: '戦場知識を提供、攻撃力+20%',
    recruitEffect: s => { s.player.atkBonus += 0.20; },
    topics: {
      mission: {
        label: '使命について聞く', icon: '⚔️',
        responses: [
          { minTrust:  0, text: '……。', emotion: 'firm', intelId: null },
          { minTrust: 25, text: '……戦場の後始末。ただそれだけ。', emotion: 'sad', intelId: null },
          { minTrust: 55, text: '……もう、意味はわからなくなった。動いているのは、惰性だ。', emotion: 'broken', intelId: null },
        ],
      },
      past: {
        label: '過去の戦いについて聞く', icon: '💀',
        responses: [
          { minTrust:  0, text: '……関係ない。', emotion: 'firm', intelId: null },
          { minTrust: 35, text: '……何千もの命を見た。数えるのをやめた時から、何も感じなくなった。', emotion: 'broken', intelId: null },
          { minTrust: 60, text: '……エルティアの観測塔から、全ての戦場のデータが送られてくる。あの塔が全ての命令を管理している。', emotion: 'resigned', intelId: 'tower_loc' },
        ],
      },
      lumiel: {
        label: 'ルミエルについて聞く', icon: '📖',
        responses: [
          { minTrust:  0, text: '……知ってる。', emotion: 'firm', intelId: null },
          { minTrust: 40, text: '……昔は、もっと話していた。今は……別の道だ。', emotion: 'sad', intelId: null },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度70必要）', icon: '💎', minTrustRequired: 70,
        responses: [
          { minTrust: 70, text: '……この翼は暗黒で出来ている。光には弱い。どうせ……もうどうでもいい。', emotion: 'resigned', intelId: 'miriel_weakness' },
        ],
      },
    },
    recruitDlg: '……一緒に行く。理由？　ない。ただ……あなたの隣にいる方が、少しだけ……静かじゃない気がする。',
  },

  /* ── No.3 アリュシア（誘惑の天使）────────────── */
  {
    id: 'alysia', name: 'アリュシア', title: '誘惑の天使', rank: 3,
    hp: 55, atk: 16, def: 6, spd: 12, mov: 4, rng: 2,
    resist: 45, captureAt: 35, gold: 80,
    color: '#DDA8CC', hairColor: '#FFD0A0', eyeColor: '#CC8888',
    bgGrad: 'linear-gradient(160deg,#FFD0C0,#CC8899)',
    emoji: '🌹', portrait: 'img/characters/alysia.png',
    personality: 'elegant_spy',
    desc: '天界諜報機関の潜入工作員。美を武器に情報収集と排除を担ってきた。長年の潜入生活で微かな感情の芽生えを自覚し、それを最も恐れている。',
    weaknessId: 'alysia_weakness', weaknessName: '真摯な感情表現', weaknessMulti: 1.5,
    knownIntel: ['sanctuary_loc','spy_network'],
    recruitTrust: 70,
    recruitBonus: '諜報ネットワーク、ドロップ+30%',
    recruitEffect: s => { s.dropBoostMult += 0.3; },
    topics: {
      mission: {
        label: '使命について聞く', icon: '⚔️',
        responses: [
          { minTrust:  0, text: 'あら、もう終わり？つまらない人。私の任務は情報収集と排除——それだけよ。', emotion: 'firm', intelId: null },
          { minTrust: 30, text: '長い潜入生活で……人間の笑顔を見すぎた気がするわ。職業病かしら。', emotion: 'conflicted', intelId: null },
          { minTrust: 55, text: '……本当のことを言えば、最近は任務の意味が分からなくなってきた。消した人たちの顔が……浮かぶのよ。', emotion: 'tearful', intelId: null },
        ],
      },
      intel: {
        label: '諜報活動について聞く', icon: '🕵️',
        responses: [
          { minTrust:  0, text: '企業秘密よ。', emotion: 'firm', intelId: null },
          { minTrust: 35, text: 'サンクティアが浄化の聖域とやらを構えているわ。優しそうな笑顔で……あれは怖い。', emotion: 'worried', intelId: 'sanctuary_loc' },
        ],
      },
      feelings: {
        label: '感情について聞く', icon: '💕',
        responses: [
          { minTrust:  0, text: '感情？それは弱点ね。私には必要ない。', emotion: 'firm', intelId: null },
          { minTrust: 45, text: '……笑いかけられると、困るのよ。対処法が分からなくて。これが「感情」なの？', emotion: 'confused', intelId: null },
          { minTrust: 65, text: 'あなたは……私が今まで会った誰とも違う。それだけは認める。', emotion: 'conflicted', intelId: null },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度60必要）', icon: '💎', minTrustRequired: 60,
        responses: [
          { minTrust: 60, text: '……計算なしの、本物の感情？それが一番困る。逃げ道が見つからないから。', emotion: 'resigned', intelId: 'alysia_weakness' },
        ],
      },
    },
    recruitDlg: '……はぁ。まったく、計算外だわ。いいわよ、しばらく付き合ってあげる。感謝しなさい。',
  },

  /* ── No.4 エルティア（観測の天使）────────────── */
  {
    id: 'eltia', name: 'エルティア', title: '観測の天使', rank: 4,
    hp: 65, atk: 15, def: 10, spd: 8, mov: 4, rng: 2,
    resist: 60, captureAt: 28, gold: 120,
    color: '#C8A8FF', hairColor: '#E8D0FF', eyeColor: '#9966CC',
    bgGrad: 'linear-gradient(160deg,#E0D0FF,#9966CC)',
    emoji: '👁️', portrait: 'img/characters/eltia.png',
    personality: 'analytical',
    desc: '世界の観測と記録に特化した分析天使。全てを確率と数値で語る。ルミエルの上司であり、彼女の異動を承認した張本人。',
    weaknessId: 'eltia_weakness', weaknessName: '計算外の変数（予測不能な行動）', weaknessMulti: 1.6,
    knownIntel: ['truth_revealed','ruins_loc','lumiel_data'],
    recruitTrust: 85,
    recruitBonus: '観測データ共有、クリティカル+25%',
    recruitEffect: s => { s.player.critBonus += 0.25; },
    topics: {
      mission: {
        label: '使命について聞く', icon: '⚔️',
        responses: [
          { minTrust:  0, text: '人類の生存率：0.3%。誤差範囲内。観測継続中。', emotion: 'firm', intelId: null },
          { minTrust: 30, text: '……干渉禁止の制約のもと、私はただ観測してきた。しかし今回の「実験」は、変数が多すぎる。', emotion: 'uncertain', intelId: null },
          { minTrust: 60, text: '予測が……外れ続けている。あなたという存在が、全ての計算を崩している。', emotion: 'confused', intelId: null },
        ],
      },
      data: {
        label: 'データについて聞く', icon: '📊',
        responses: [
          { minTrust:  0, text: '全データは機密指定。開示不可。', emotion: 'firm', intelId: null },
          { minTrust: 40, text: '……観測記録に、興味深い矛盾を発見した。処理命令の発令者が、神ではない可能性がある。確率：62%。', emotion: 'uncertain', intelId: null },
          { minTrust: 65, text: '……開示する。天界を動かしているのは、人間界のある組織が開発した「制御装置」だ。確率：97.3%。', emotion: 'resigned', intelId: 'truth_revealed' },
        ],
      },
      lumiel: {
        label: 'ルミエルについて聞く', icon: '📖',
        responses: [
          { minTrust:  0, text: 'ルミエルは私の部下だった。処理効率：低。そのため案内役に配置転換。', emotion: 'firm', intelId: null },
          { minTrust: 45, text: '……彼女の異動承認書に署名した理由は……データには載せていないが、彼女を守るためだった。', emotion: 'sad', intelId: 'lumiel_data' },
        ],
      },
      verna: {
        label: '記憶の廃墟について聞く', icon: '🌑',
        responses: [
          { minTrust:  0, text: '開示権限なし。', emotion: 'firm', intelId: null },
          { minTrust: 50, text: '……ヴェルナは廃墟の深部に籠っている。記憶の重さで崩壊しつつある。あそこへ行くなら早急に。', emotion: 'worried', intelId: 'ruins_loc' },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度75必要）', icon: '💎', minTrustRequired: 75,
        responses: [
          { minTrust: 75, text: '……計算できないものには対応できない。あなたがまさにそれだ。勝率：計算不能。', emotion: 'resigned', intelId: 'eltia_weakness' },
        ],
      },
    },
    recruitDlg: '……観測結果を修正する。「人類の価値：計算不能」。つまり——私の基準外の存在。それが最も、興味深い。',
  },

  /* ── No.5 サンクティア（浄化の天使）────────────── */
  {
    id: 'sanctia', name: 'サンクティア', title: '浄化の天使', rank: 5,
    hp: 90, atk: 17, def: 15, spd: 6, mov: 2, rng: 2,
    resist: 65, captureAt: 22, gold: 140,
    color: '#FFD0D0', hairColor: '#FFE8E8', eyeColor: '#FF8888',
    bgGrad: 'linear-gradient(160deg,#FFE8E8,#FFAAAA)',
    emoji: '🌸', portrait: 'img/characters/sanctia.png',
    personality: 'serene_disturbed',
    desc: '元・癒しと救済を専門とする天使。救えない命を見続けた末に「初めから消すことが最大の慈悲」という歪んだ結論に至った。',
    weaknessId: 'sanctia_weakness', weaknessName: '過去の慈愛の記憶', weaknessMulti: 1.7,
    knownIntel: ['ruins_loc','purification_data'],
    recruitTrust: 90,
    recruitBonus: '回復技術を習得、最大HP+20',
    recruitEffect: s => { s.player.baseHp += 20; s.player.baseMaxHp += 20; },
    topics: {
      mission: {
        label: '使命について聞く', icon: '🌸',
        responses: [
          { minTrust:  0, text: 'ふふ、痛くないようにしてあげますよ。苦しまないための「浄化」なんです。', emotion: 'happy', intelId: null },
          { minTrust: 30, text: 'かつては癒していました。でも……癒しても癒しても、また苦しみが来る。なら初めから……ね？', emotion: 'sad', intelId: null },
          { minTrust: 60, text: '……本当は、苦しんでほしくなかった。ただ、みんなに楽になってほしかっただけで……', emotion: 'tearful', intelId: null },
        ],
      },
      healing: {
        label: '癒しの力について聞く', icon: '💊',
        responses: [
          { minTrust:  0, text: 'もう使いません。癒しは、苦しみを遅らせるだけですから。', emotion: 'firm', intelId: null },
          { minTrust: 35, text: 'ヴェルナのいる廃墟……あそこには、もう手の施しようがない記憶の重みが積み重なっています。', emotion: 'sad', intelId: 'ruins_loc' },
          { minTrust: 65, text: '……私が癒した命が、また苦しんでいた。それを記録したのがヴェルナです。', emotion: 'broken', intelId: null },
        ],
      },
      past: {
        label: '過去について聞く', icon: '🌷',
        responses: [
          { minTrust:  0, text: 'ふふ、昔のことは……もういいんです。', emotion: 'happy', intelId: null },
          { minTrust: 50, text: '……小さな子供の手を握って、回復の祈りを唱えた時のことを……覚えています。あの頃の私は……', emotion: 'tearful', intelId: null },
          { minTrust: 75, text: '（長い沈黙の後）……私は、間違えたのかもしれない。ふふ……でも、もう戻れない、よね？', emotion: 'broken', intelId: null },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度80必要）', icon: '💎', minTrustRequired: 80,
        responses: [
          { minTrust: 80, text: 'ふふ……かつて「助かった」と言ってくれた子の声が、聞こえた時……手が、止まるんです。', emotion: 'broken', intelId: 'sanctia_weakness' },
        ],
      },
    },
    recruitDlg: '……ふふ。あなたと話して……少し、思い出しました。苦しみを遅らせることにも、意味があると。一緒に行きます。',
  },

  /* ── No.6 ヴェルナ（記憶の天使）────────────── */
  {
    id: 'verna', name: 'ヴェルナ', title: '記憶の天使', rank: 6,
    hp: 72, atk: 19, def: 9, spd: 10, mov: 4, rng: 2,
    resist: 58, captureAt: 26, gold: 160,
    color: '#9090C0', hairColor: '#C0B0E0', eyeColor: '#7060A0',
    bgGrad: 'linear-gradient(160deg,#605080,#302840)',
    emoji: '🌑', portrait: 'img/characters/verna.png',
    personality: 'melancholic_poet',
    desc: '死者の記憶を収集・保管する天使。あまりにも多くの「最後の瞬間」を追体験し続けた結果、自身の存在への虚無感に支配されている。',
    weaknessId: 'verna_weakness', weaknessName: '新しい記憶・希望', weaknessMulti: 1.6,
    knownIntel: ['throne_loc','end_records'],
    recruitTrust: 75,
    recruitBonus: '記憶分析、全情報の精度+10%',
    recruitEffect: s => {},
    topics: {
      memory: {
        label: '記憶について聞く', icon: '💭',
        responses: [
          { minTrust:  0, text: 'すべての記憶は、終わりのための前置詞に過ぎない。', emotion: 'sad', intelId: null },
          { minTrust: 30, text: '……最後に笑った人の顔が、一番重い。何万もの「さようなら」が、ここにある。', emotion: 'broken', intelId: null },
          { minTrust: 55, text: 'ラグナリア様の玉座……終末の場所が、記録の最終ページに記されている。', emotion: 'resigned', intelId: 'throne_loc' },
        ],
      },
      existence: {
        label: '存在について聞く', icon: '🌑',
        responses: [
          { minTrust:  0, text: '私が存在する意味？　記録することだけ。それ以外、何もない。', emotion: 'sad', intelId: null },
          { minTrust: 40, text: 'この翼が崩れているのは……記憶の重さのせい。でも、軽くする方法を知らない。', emotion: 'broken', intelId: null },
        ],
      },
      hope: {
        label: '希望について聞く', icon: '⭐',
        responses: [
          { minTrust:  0, text: '希望？　……記録にはある。人間たちが最後まで持っていたもの。', emotion: 'uncertain', intelId: null },
          { minTrust: 45, text: '……あなたが来るまで、新しい記憶というものを、受け取ったことがなかった。', emotion: 'nostalgic', intelId: null },
          { minTrust: 65, text: '……終わりではない記憶を、作ることができるのかもしれない。それを「希望」と呼ぶのか。', emotion: 'happy', intelId: null },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度65必要）', icon: '💎', minTrustRequired: 65,
        responses: [
          { minTrust: 65, text: '……終わらない記憶——続く物語——には、対処できない。私の記録は「終わり」しか知らないから。', emotion: 'resigned', intelId: 'verna_weakness' },
        ],
      },
    },
    recruitDlg: '……あなたとの記憶を、保管しておきたいと思った。それが初めて、重くない記憶だったから。',
  },

  /* ── No.7 ラグナリア（終末の天使）────────────── */
  {
    id: 'ragnalia', name: 'ラグナリア', title: '終末の大天使', rank: 7,
    hp: 185, atk: 36, def: 28, spd: 6, mov: 3, rng: 2,
    resist: 90, captureAt: 10, gold: 400,
    color: '#FFE080', hairColor: '#FFFFFF', eyeColor: '#FFD700',
    bgGrad: 'linear-gradient(160deg,#FFE080,#FF9900)',
    emoji: '⚡', portrait: 'img/characters/ragnalia.png',
    personality: 'absolute',
    desc: '世界の終末を告げ「リセット」を執行する最上位天使。人類史の中で幾度も世界の終わりを実行してきた。破壊を「美しい完成」と捉えている。',
    weaknessId: 'ragnalia_weakness', weaknessName: '人類の諦めない意志', weaknessMulti: 2.0,
    knownIntel: ['tifana_loc','ragnalia_truth'],
    recruitTrust: 99,
    recruitBonus: '特別エンディング解放',
    recruitEffect: s => { s.player.secretEnd = true; },
    topics: {
      mission: {
        label: '使命について聞く', icon: '⚡',
        responses: [
          { minTrust:  0, text: '跪け。これは慈悲だ。世界のリセットは、常に新たな始まりのためにある。', emotion: 'firm', intelId: null },
          { minTrust: 30, text: '幾度、終わりを告げたか。数える必要はない。ただ——今回は少し、違う気がする。', emotion: 'uncertain', intelId: null },
          { minTrust: 60, text: 'お前が自ら来たことに……価値がある。それだけは認めよう。', emotion: 'conflicted', intelId: null },
        ],
      },
      history: {
        label: '歴史について聞く', icon: '📜',
        responses: [
          { minTrust:  0, text: '歴史とは、繰り返す終わりと始まりの記録だ。', emotion: 'firm', intelId: null },
          { minTrust: 40, text: '……この世界は七度、終わった。しかし誰も——お前たちのように——その理由を問いに来なかった。', emotion: 'uncertain', intelId: null },
          { minTrust: 70, text: 'ティファーナのことが、知りたいか。あれは……この宇宙の最初の記憶を持つ存在だ。謎の聖域に封じられている。', emotion: 'resigned', intelId: 'tifana_loc' },
        ],
      },
      truth: {
        label: '真実について聞く', icon: '🌟',
        responses: [
          { minTrust:  0, text: '真実を知る準備が、お前にあるか？', emotion: 'firm', intelId: null },
          { minTrust: 50, text: '……制御装置のことを知ったか。ならば——私たちも、その意志に縛られていると気づいているか？', emotion: 'conflicted', intelId: null },
          { minTrust: 80, text: '……真実を教えよう。この「粛清」は、神の意志ではなく、人間界のある者が天界を制御して引き起こした偽りの終末だ。', emotion: 'resigned', intelId: 'ragnalia_truth' },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度90必要）', icon: '💎', minTrustRequired: 90,
        responses: [
          { minTrust: 90, text: '……大天使の力は、諦めた世界でのみ機能する。お前たちが諦めない限り、私の終末は完成しない。', emotion: 'resigned', intelId: 'ragnalia_weakness' },
        ],
      },
    },
    recruitDlg: '……七度目の終末を、私は止めよう。お前が諦めないことを見せ続けた——その結果だ。これが最後の審判となる。',
  },

  /* ── No.8 ティファーナ（謎の子供天使）────────────── */
  {
    id: 'tifana', name: 'ティファーナ', title: '古の天使', rank: 8,
    hp: 130, atk: 28, def: 20, spd: 14, mov: 5, rng: 1,
    resist: 80, captureAt: 15, gold: 600,
    color: '#A8E8FF', hairColor: '#D0F0FF', eyeColor: '#88CCFF',
    bgGrad: 'linear-gradient(160deg,#C0F0FF,#60B0E0)',
    emoji: '🍭', portrait: 'img/characters/tifana.png',
    personality: 'ancient_child',
    desc: '外見は子供のまま固定されているが、実際は人類の歴史が始まるより前から存在する最古の天使。無垢な口調と残酷な真理の組み合わせが最も不気味。',
    weaknessId: 'tifana_weakness', weaknessName: '真の遊び相手・人間との絆', weaknessMulti: 1.8,
    knownIntel: ['ultimate_truth','heaven_secret'],
    recruitTrust: 95,
    recruitBonus: '秘密エンディング解放・全天使の真の名が明らかに',
    recruitEffect: s => { s.player.secretEnd2 = true; },
    topics: {
      age: {
        label: '年齢について聞く', icon: '⭐',
        responses: [
          { minTrust:  0, text: 'ねえ、なんで逃げるの？こわくないよ？　年齢？　宇宙ができる前から、かな。', emotion: 'happy', intelId: null },
          { minTrust: 30, text: 'ラグナリアちゃんより、ずーっと古いよ。でも、みんなそれを知らないふりするんだ。', emotion: 'uncertain', intelId: null },
        ],
      },
      heaven: {
        label: '天界の秘密について聞く', icon: '✨',
        responses: [
          { minTrust:  0, text: 'ひみつー！　…でも、教えてもいいかな。だれも聞きに来なかったから。', emotion: 'happy', intelId: null },
          { minTrust: 40, text: '天界を作ったのはね……実は人間なんだよ。ずーっと昔の、ある人間が。みんな忘れちゃったけど。', emotion: 'nostalgic', intelId: 'heaven_secret' },
          { minTrust: 70, text: '制御装置の名前、教えようか。「神」って名前なんだよ。ふふ、面白いでしょ？', emotion: 'uncertain', intelId: 'ultimate_truth' },
        ],
      },
      games: {
        label: '遊びについて聞く', icon: '🎮',
        responses: [
          { minTrust:  0, text: 'ねえ、あそぼ。誰もあそんでくれないんだもん。', emotion: 'happy', intelId: null },
          { minTrust: 35, text: '……あそんでくれる人、久しぶりだよ。最後は……何百年前かなあ。', emotion: 'nostalgic', intelId: null },
          { minTrust: 65, text: 'あなたが来るまで、すっごく退屈だったんだから！　もう行かないでね。ずっとあそぼ？', emotion: 'happy', intelId: null },
        ],
      },
      weakness: {
        label: '⚡ あなた自身の弱点（信頼度85必要）', icon: '💎', minTrustRequired: 85,
        responses: [
          { minTrust: 85, text: '弱点？　……あのね、誰かが「一緒にいたい」って思ってくれると……力が入らなくなるんだ。理由は、わかんない。', emotion: 'confused', intelId: 'tifana_weakness' },
        ],
      },
    },
    recruitDlg: 'やった！　友達できた！　……えっと、ちゃんと言うね。一緒にいてくれてありがとう。これからもあそぼ？',
  },
];

/* -------- 情報プール -------- */
const INTEL_POOL = [
  /* 場所情報（ステージアンロック用）*/
  { id:'front_base_loc',  name:'殲滅部隊の廃戦場',   cat:'location',
    trueText: '天使殲滅部隊の残存兵力が廃戦場に展開している。ミリエルがそこを拠点としている。',
    falseText:'殲滅部隊は既に撤退済みで、廃戦場は無人という情報。（誤報の可能性あり）',
    unlocks:['battlefield'], relevantFor:['frontal'] },

  { id:'garden_loc',      name:'誘惑の庭園の場所',   cat:'location',
    trueText: '天界諜報機関の前線拠点「誘惑の庭園」の座標。アリュシアが潜入訓練を行っている。',
    falseText:'庭園は囮の施設で、本拠点は別にあるという情報。',
    unlocks:['garden'], relevantFor:['infiltration'] },

  { id:'tower_loc',       name:'観測の尖塔の場所',   cat:'location',
    trueText: '全ての戦場データを管理する観測の尖塔。エルティアがそこから全命令を制御している。',
    falseText:'尖塔は廃棄された施設で、今は使われていないという情報。',
    unlocks:['tower'], relevantFor:['sabotage'] },

  { id:'sanctuary_loc',   name:'浄化の聖域の場所',   cat:'location',
    trueText: '元・回復施設「浄化の聖域」がサンクティアの拠点となっている。笑顔の裏の恐怖。',
    falseText:'聖域は人間の孤立集落で、天使との関係はないという情報。',
    unlocks:['sanctuary'], relevantFor:['infiltration'] },

  { id:'ruins_loc',       name:'記憶の廃墟の場所',   cat:'location',
    trueText: '廃墟の深部にヴェルナが籠っている。記憶の重さで崩壊しつつある危険な場所。',
    falseText:'廃墟には何もなく、ヴェルナは既に消滅したという情報。',
    unlocks:['ruins'], relevantFor:['infiltration'] },

  { id:'throne_loc',      name:'終末の玉座の場所',   cat:'location',
    trueText: 'ラグナリアの「終末の玉座」の場所。天界の最終拠点であり、全ての終わりが始まる場所。',
    falseText:'玉座は空中にあり、地上からは到達不可能という情報。',
    unlocks:['final_bastion'], relevantFor:['assassination'] },

  { id:'tifana_loc',      name:'謎の聖域の場所',     cat:'location',
    trueText: '古の天使ティファーナが封じられた謎の聖域。天界の誰も近づかない、禁断の場所。',
    falseText:'謎の聖域は伝説上の場所で、実在しないという情報。',
    unlocks:['secret_shrine'], relevantFor:['infiltration'] },

  /* 戦術情報 */
  { id:'processing_order', name:'処理命令の詳細',    cat:'tactical',
    trueText: '処理命令書には「ラグナリア様の裁量による最終処理対象」とのみ記されており、具体的理由は存在しない。',
    falseText:'処理命令には詳細な理由が記されているが、最高機密に指定されているという情報。',
    unlocks:[], relevantFor:['assassination'] },

  { id:'battle_records',   name:'殲滅部隊の記録',    cat:'tactical',
    trueText: '過去の殲滅記録：7つの世界サイクルで、ミリエルは3億以上の命の「処理」に関与している。',
    falseText:'殲滅記録は捏造されており、実際の被害は少ないという情報。',
    unlocks:[], relevantFor:['frontal'] },

  { id:'spy_network',      name:'諜報ネットワーク',  cat:'tactical',
    trueText: '天界諜報機関のネットワークは人間界の主要都市に潜入拠点を構えている。アリュシアが統括。',
    falseText:'諜報ネットワークは崩壊しており、機能していないという情報。',
    unlocks:[], relevantFor:['infiltration'] },

  { id:'purification_data', name:'浄化の記録',        cat:'tactical',
    trueText: 'サンクティアの「浄化」記録：かつての回復魔法が、次第に抹消魔法に変化していった過程が残されている。',
    falseText:'浄化の記録は存在せず、施設は新設されたものという情報。',
    unlocks:[], relevantFor:['assassination'] },

  { id:'end_records',      name:'終末の記録',         cat:'tactical',
    trueText: 'ヴェルナが保管する終末の記録：過去7回の世界リセットの詳細と、次のリセットの準備状況が含まれている。',
    falseText:'終末の記録は既に消去されており、情報価値はないという情報。',
    unlocks:[], relevantFor:['frontal'] },

  /* 重要ストーリー情報 */
  { id:'truth_revealed',   name:'天界制御の真実',     cat:'secret',
    trueText: '天界の大天使たちを動かしているのは「神」ではなく、人間界のある組織が開発した「制御装置」だという衝撃の事実。エルティアの観測データより。',
    falseText:'天界は完全に自律しており、外部からの制御は不可能という情報。',
    unlocks:['final_bastion'], relevantFor:['assassination','infiltration'] },

  { id:'lumiel_data',      name:'ルミエル配置の真実', cat:'secret',
    trueText: 'エルティアがルミエルを「案内役」に配置転換したのは、処理対象リストから彼女を守るためだった可能性が高い。',
    falseText:'ルミエルの配置転換は純粋に効率化のためという情報。',
    unlocks:[], relevantFor:['infiltration'] },

  { id:'ragnalia_truth',   name:'ラグナリアの告白',   cat:'secret',
    trueText: 'この「粛清」は神の意志ではなく、人間界のある者が天界の制御装置を使って引き起こした偽りの終末。ラグナリア自身もその事実を最近知った。',
    falseText:'粛清は純粋に天界の意志であり、外部からの影響はないという情報。',
    unlocks:[], relevantFor:['assassination'] },

  { id:'heaven_secret',    name:'天界の起源',         cat:'secret',
    trueText: '天界そのものを創造したのは、数万年前の人間だった。制御装置はその創造者が残した管理システムの残骸。',
    falseText:'天界は神によって作られた永遠の存在という情報。',
    unlocks:[], relevantFor:['infiltration'] },

  { id:'ultimate_truth',   name:'「神」の正体',       cat:'secret',
    trueText: '制御装置の名は「神（GOD）」。ある人間が天界を制御するために開発した自律AIシステムで、創造者は既に死んでいる。天使たちは誰も知らない。',
    falseText:'神は実在する意識ある存在であり、制御装置は補助システムに過ぎないという情報。',
    unlocks:[], relevantFor:['assassination'] },

  /* 弱点情報 */
  { id:'seraphiel_weakness', name:'セラフィエルの弱点', cat:'weakness',
    trueText: '【セラフィエルの弱点】感情的な訴えには論理回路が追いつかなくなる。真摯な叫びでダメージ1.5倍。',
    falseText:'セラフィエルに弱点はなく、感情には影響されないという情報。', unlocks:[], relevantFor:[] },

  { id:'miriel_weakness',    name:'ミリエルの弱点',    cat:'weakness',
    trueText: '【ミリエルの弱点】暗黒の翼は聖なる光に弱い。光属性攻撃でダメージ1.6倍。',
    falseText:'ミリエルの翼は全属性に耐性があるという情報。', unlocks:[], relevantFor:[] },

  { id:'alysia_weakness',    name:'アリュシアの弱点',  cat:'weakness',
    trueText: '【アリュシアの弱点】計算なしの真摯な感情表現には対処できない。心からの言葉でダメージ1.5倍。',
    falseText:'アリュシアは感情的な攻撃に耐性があるという情報。', unlocks:[], relevantFor:[] },

  { id:'eltia_weakness',     name:'エルティアの弱点',  cat:'weakness',
    trueText: '【エルティアの弱点】計算外の予測不能な行動には対応できない。奇策でダメージ1.6倍。',
    falseText:'エルティアは全パターンを予測済みで弱点はないという情報。', unlocks:[], relevantFor:[] },

  { id:'sanctia_weakness',   name:'サンクティアの弱点', cat:'weakness',
    trueText: '【サンクティアの弱点】過去の慈愛の記憶を呼び起こすと動きが止まる。感謝の言葉でダメージ1.7倍。',
    falseText:'サンクティアは過去の感情を完全に切り離しているという情報。', unlocks:[], relevantFor:[] },

  { id:'verna_weakness',     name:'ヴェルナの弱点',    cat:'weakness',
    trueText: '【ヴェルナの弱点】新しい記憶・終わらない物語には対処できない。希望の言葉でダメージ1.6倍。',
    falseText:'ヴェルナは全ての記憶を制御下に置いているという情報。', unlocks:[], relevantFor:[] },

  { id:'ragnalia_weakness',  name:'ラグナリアの弱点',  cat:'weakness',
    trueText: '【ラグナリアの弱点】諦めない人類の意志が大天使の終末力を削ぐ。不屈の意志でダメージ2.0倍。',
    falseText:'ラグナリアに弱点はなく、人類の意志は無力という情報。', unlocks:[], relevantFor:[] },

  { id:'tifana_weakness',    name:'ティファーナの弱点', cat:'weakness',
    trueText: '【ティファーナの弱点】真の遊び相手・人間との絆で力が入らなくなる。友情でダメージ1.8倍。',
    falseText:'ティファーナは感情的な絆に免疫があるという情報。', unlocks:[], relevantFor:[] },
];

/* -------- 攻略拠点（FE式 enemyLayout込み）-------- */
const LOCATIONS = [
  {
    id:'court', name:'審判の法廷', icon:'⚖️',
    desc:'セラフィエルが裁きを執行する天界の法廷。処理命令に署名した当事者がいる。',
    reqIntel:[], defense:30, angelId:'seraphiel',
    startGold:220, baseHp:20,
    enemyLayout: [
      {type:'grunt',  c:5,r:1},{type:'grunt',  c:5,r:5},
      {type:'archer', c:6,r:3},
      {type:'grunt',  c:7,r:0},{type:'grunt',  c:7,r:6},
      {type:'archer', c:7,r:2},{type:'grunt',  c:7,r:4},
      {type:'grunt',  c:8,r:1},{type:'elite',  c:8,r:5},
    ],
    dropTable:[
      {itemId:'ration',    weight:8},{itemId:'tea',       weight:4},
      {itemId:'old_coin',  weight:6},{itemId:'quiver',    weight:2},
      {itemId:'heal_kit',  weight:3},
    ],
  },
  {
    id:'battlefield', name:'殲滅の廃戦場', icon:'🔨',
    desc:'天使殲滅部隊の残骸が残る廃戦場。ミリエルが今も無言で番をしている。',
    reqIntel:['front_base_loc'], defense:55, angelId:'miriel',
    startGold:250, baseHp:18,
    enemyLayout: [
      {type:'grunt',  c:4,r:0},{type:'grunt',  c:4,r:6},
      {type:'elite',  c:5,r:2},{type:'elite',  c:5,r:4},
      {type:'archer', c:6,r:1},{type:'archer', c:6,r:5},
      {type:'elite',  c:7,r:3},
      {type:'heavy',  c:8,r:0},{type:'heavy',  c:8,r:6},
    ],
    dropTable:[
      {itemId:'tea',       weight:5},{itemId:'crystal',   weight:3},
      {itemId:'scope',     weight:2},{itemId:'heal_kit',  weight:4},
      {itemId:'bomb',      weight:2},
    ],
  },
  {
    id:'garden', name:'誘惑の庭園', icon:'🌹',
    desc:'天界諜報機関の前線拠点。美しい外見の下に罠が張り巡らされている。',
    reqIntel:['garden_loc'], defense:50, angelId:'alysia',
    startGold:260, baseHp:18,
    enemyLayout: [
      {type:'grunt',  c:4,r:2},{type:'grunt',  c:4,r:4},
      {type:'archer', c:5,r:0},{type:'archer', c:5,r:6},
      {type:'elite',  c:6,r:3},
      {type:'archer', c:7,r:1},{type:'archer', c:7,r:5},
      {type:'elite',  c:8,r:2},{type:'elite',  c:8,r:4},
    ],
    dropTable:[
      {itemId:'gift_jewelry',weight:3},{itemId:'ration',    weight:5},
      {itemId:'scope',       weight:2},{itemId:'old_coin',  weight:4},
      {itemId:'tea',         weight:3},
    ],
  },
  {
    id:'tower', name:'観測の尖塔', icon:'👁️',
    desc:'全命令を管理するエルティアの観測拠点。ここを落とせば天界の情報網が崩れる。',
    reqIntel:['tower_loc'], defense:70, angelId:'eltia',
    startGold:280, baseHp:17,
    enemyLayout: [
      {type:'elite',  c:3,r:1},{type:'elite',  c:3,r:5},
      {type:'heavy',  c:4,r:3},
      {type:'elite',  c:5,r:0},{type:'elite',  c:5,r:6},
      {type:'archer', c:6,r:2},{type:'archer', c:6,r:4},
      {type:'heavy',  c:7,r:1},{type:'heavy',  c:7,r:5},
    ],
    dropTable:[
      {itemId:'rare_tome',    weight:3},{itemId:'frost_core',  weight:3},
      {itemId:'cannon_powder',weight:2},{itemId:'scope',       weight:2},
      {itemId:'cipher_doc',   weight:1},
    ],
  },
  {
    id:'sanctuary', name:'浄化の聖域', icon:'🌸',
    desc:'元・癒しの施設。今は「慈悲ある消滅」を掲げるサンクティアが笑顔で待ち受ける。',
    reqIntel:['sanctuary_loc'], defense:80, angelId:'sanctia',
    startGold:290, baseHp:16,
    enemyLayout: [
      {type:'heavy',  c:3,r:2},{type:'heavy',  c:3,r:4},
      {type:'elite',  c:4,r:0},{type:'elite',  c:4,r:6},
      {type:'archer', c:5,r:3},
      {type:'heavy',  c:6,r:1},{type:'heavy',  c:6,r:5},
      {type:'elite',  c:7,r:2},{type:'elite',  c:7,r:4},
    ],
    dropTable:[
      {itemId:'heal_kit',    weight:5},{itemId:'fortify',     weight:3},
      {itemId:'rare_tome',   weight:2},{itemId:'tea',         weight:4},
      {itemId:'bomb',        weight:2},
    ],
  },
  {
    id:'ruins', name:'記憶の廃墟', icon:'🌑',
    desc:'死者の記憶が積み重なる廃墟。ヴェルナが崩壊しながらも記録を続けている。',
    reqIntel:['ruins_loc'], defense:85, angelId:'verna',
    startGold:310, baseHp:15,
    enemyLayout: [
      {type:'heavy',  c:3,r:0},{type:'heavy',  c:3,r:6},
      {type:'elite',  c:4,r:2},{type:'elite',  c:4,r:4},
      {type:'archer', c:5,r:1},{type:'archer', c:5,r:5},
      {type:'heavy',  c:6,r:3},
      {type:'elite',  c:7,r:0},{type:'elite',  c:7,r:6},
    ],
    dropTable:[
      {itemId:'cipher_doc',   weight:3},{itemId:'rare_tome',   weight:3},
      {itemId:'treasure_map', weight:2},{itemId:'scope',       weight:2},
      {itemId:'gift_jewelry', weight:2},
    ],
  },
  {
    id:'final_bastion', name:'終末の玉座', icon:'⚡',
    desc:'ラグナリアの最後の拠点。世界のリセットを執行する最上位天使が待つ。',
    reqIntel:['throne_loc','truth_revealed'], defense:100, angelId:'ragnalia',
    startGold:350, baseHp:14,
    enemyLayout: [
      {type:'heavy',  c:3,r:0},{type:'heavy',  c:3,r:6},
      {type:'elite',  c:4,r:2},{type:'elite',  c:4,r:4},
      {type:'archer', c:5,r:1},{type:'archer', c:5,r:5},
      {type:'heavy',  c:6,r:3},
      {type:'elite',  c:7,r:0},{type:'elite',  c:7,r:6},
    ],
    dropTable:[
      {itemId:'gift_jewelry', weight:3},{itemId:'rare_tome',   weight:3},
      {itemId:'scope',        weight:2},{itemId:'cipher_doc',  weight:2},
      {itemId:'treasure_map', weight:2},
    ],
  },
  {
    id:'secret_shrine', name:'謎の聖域', icon:'🍭',
    desc:'天界の誰も近づかない禁断の聖域。宇宙最古の天使・ティファーナが封じられている。',
    reqIntel:['tifana_loc'], defense:95, angelId:'tifana',
    startGold:400, baseHp:13,
    enemyLayout: [
      {type:'archer', c:3,r:1},{type:'archer', c:3,r:5},
      {type:'elite',  c:4,r:3},
      {type:'heavy',  c:5,r:0},{type:'heavy',  c:5,r:6},
      {type:'archer', c:6,r:2},{type:'archer', c:6,r:4},
      {type:'heavy',  c:7,r:3},
      {type:'elite',  c:8,r:1},
    ],
    dropTable:[
      {itemId:'rare_tome',    weight:4},{itemId:'gift_jewelry', weight:3},
      {itemId:'cipher_doc',   weight:3},{itemId:'scope',        weight:2},
      {itemId:'treasure_map', weight:3},
    ],
  },
];

/* -------- 作戦種別 -------- */
const STRATEGIES = [
  { id:'frontal',      name:'正面突破',  icon:'⚔️',  base:42, relevantIntel:['battle_records','end_records'],    desc:'全戦力で正面から突撃。戦場情報が精度を左右する。' },
  { id:'flanking',     name:'側面迂回',  icon:'🏇',  base:50, relevantIntel:['battle_records','processing_order'],desc:'手薄な側面から攻める。配置情報が必須。' },
  { id:'infiltration', name:'潜入工作',  icon:'🕵️', base:38, relevantIntel:['spy_network','lumiel_data'],         desc:'少数精鋭で内部に侵入。諜報情報が鍵。' },
  { id:'sabotage',     name:'補給切断',  icon:'💣',  base:45, relevantIntel:['battle_records','spy_network'],      desc:'補給線を断ち弱体化させてから攻撃する。' },
  { id:'assassination',name:'暗殺作戦',  icon:'🗡️', base:35, relevantIntel:['truth_revealed','ragnalia_truth'],   desc:'少数で指揮系統を直接狙う。真実情報があれば有利。' },
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

/* -------- プレイヤーユニット -------- */
const PLAYER_UNIT = {
  name: '人類抵抗軍指揮官',
  hp: 60, atk: 14, def: 8, spd: 7,
  mov: 4, rng: 1,
  emoji: '🪖',
};

/* ======================================================
   アイテム定義
   ====================================================== */
const ITEMS = [
  { id:'ration',       name:'携帯食料',     cat:'interrogation', icon:'🍱', rarity:'common',
    trustMod:+10, fearMod:0, infoAccMod:0, canRecruit:true,
    desc:'基本的な食料。信頼を少し得られる。' },
  { id:'tea',          name:'紅茶セット',   cat:'interrogation', icon:'☕', rarity:'common',
    trustMod:+18, fearMod:-5, infoAccMod:+5, canRecruit:true,
    desc:'心が落ち着く一杯。信頼度がより上がる。' },
  { id:'gift_jewelry', name:'宝飾品',       cat:'interrogation', icon:'💎', rarity:'rare',
    trustMod:+30, fearMod:0, infoAccMod:+20, canRecruit:false,
    desc:'豪華な贈り物。信頼度が大幅アップ。招集不可。' },
  { id:'rare_tome',    name:'希少な書物',   cat:'interrogation', icon:'📖', rarity:'rare',
    trustMod:+15, fearMod:+8, infoAccMod:+35, canRecruit:false,
    desc:'貴重な文献。情報精度が大きく向上する。' },
  { id:'quiver',       name:'矢筒強化',     cat:'equipment', icon:'🏹', rarity:'common',
    effect:'archer_dmg', value:50, desc:'弓攻撃ユニットの攻撃力 +50%' },
  { id:'crystal',      name:'魔力の結晶',   cat:'equipment', icon:'🔮', rarity:'common',
    effect:'mage_dmg',   value:50, desc:'魔法系ユニットの攻撃力 +50%' },
  { id:'frost_core',   name:'氷核',         cat:'equipment', icon:'❄️',  rarity:'common',
    effect:'ice_slow',   value:25, desc:'敵全体の速度 -3（初ターン）' },
  { id:'cannon_powder',name:'上質な火薬',   cat:'equipment', icon:'💥', rarity:'uncommon',
    effect:'cannon_dmg', value:50, desc:'近接ユニットの攻撃力 +6' },
  { id:'scope',        name:'精密照準器',   cat:'equipment', icon:'🔭', rarity:'uncommon',
    effect:'all_range',  value:0.5, desc:'全プレイヤーユニットの射程+1' },
  { id:'fortify',      name:'城塞強化材',   cat:'equipment', icon:'🧱', rarity:'common',
    effect:'base_hp',    value:5, desc:'拠点の最大HP +5' },
  { id:'old_coin',     name:'古い硬貨',     cat:'equipment', icon:'🪙', rarity:'common',
    effect:'gold_bonus', value:50, desc:'ゴールド +50（即時）' },
  { id:'bomb',         name:'爆発物',       cat:'battle', icon:'💣', rarity:'uncommon',
    desc:'全ての敵に50ダメージ。' },
  { id:'heal_kit',     name:'回復キット',   cat:'battle', icon:'💊', rarity:'common',
    desc:'HP最低のユニットを15回復。' },
  { id:'treasure_map', name:'宝物庫の地図', cat:'intel', icon:'🗺️', rarity:'rare',
    intelId:'heaven_secret', desc:'天界の起源が記された古い地図。' },
  { id:'cipher_doc',   name:'暗号書類',     cat:'intel', icon:'📜', rarity:'rare',
    intelId:'ragnalia_truth', desc:'ラグナリアの告白が暗号化されている。' },
];

/* ======================================================
   ドロップ計算ユーティリティ
   ====================================================== */
function rollDrops(location, intelIds, dropBoostMult) {
  const table = location.dropTable || [];
  const boost = dropBoostMult || 1;
  const drops = [];
  const hasSpyIntel   = intelIds.includes('spy_network');
  const hasTruthIntel = intelIds.includes('truth_revealed');
  const extraBoost = (hasSpyIntel ? 0.5 : 0) + (hasTruthIntel ? 0.3 : 0);

  const count = Math.min(table.length, Math.floor(2 + boost + extraBoost));
  const pool  = [...table];
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) break;
    const r   = Math.random() * pool.reduce((s,e) => s+e.weight, 0);
    let acc   = 0;
    for (let j = 0; j < pool.length; j++) {
      acc += pool[j].weight;
      if (r < acc) { drops.push(pool[j].itemId); pool.splice(j,1); break; }
    }
  }
  return drops;
}

/* ======================================================
   尋問イベントシーン定義
   ====================================================== */
const INTERROGATION_EVENTS = {
  seraphiel: [
    {
      id:'seraphiel_evt_30', minTrust:30, title:'法典の外',
      lines:[
        { speaker:'セラフィエル', text:'……なぜ、私に話しかけ続ける。', emotion:'firm' },
        { speaker:'指揮官',       text:'あなたが「間違いかもしれない」と思っているからだ。', emotion:'' },
        { speaker:'セラフィエル', text:'……根拠は？', emotion:'uncertain' },
        { speaker:'指揮官',       text:'あなたの目が、法典を見ていない。', emotion:'' },
        { speaker:'セラフィエル', text:'……（長い沈黙）。', emotion:'conflicted' },
      ],
      trustBonus:5,
    },
    {
      id:'seraphiel_evt_60', minTrust:60, title:'裁判官の涙',
      lines:[
        { speaker:'セラフィエル', text:'……裁判官は、泣いてはならない。', emotion:'sad' },
        { speaker:'指揮官',       text:'泣いているのか？', emotion:'' },
        { speaker:'セラフィエル', text:'……これは……論理的思考の過負荷による……生理現象で……。', emotion:'tearful' },
        { speaker:'セラフィエル', text:'私が署名した命令が、本当に正しかったのかどうか……判断できなくなっています。', emotion:'broken' },
      ],
      trustBonus:8,
    },
  ],
  miriel: [
    {
      id:'miriel_evt_25', minTrust:25, title:'静寂の中で',
      lines:[
        { speaker:'ミリエル', text:'……なぜ、来る。', emotion:'firm' },
        { speaker:'指揮官',   text:'話したいから。', emotion:'' },
        { speaker:'ミリエル', text:'……話す必要が、ない。', emotion:'sad' },
        { speaker:'指揮官',   text:'でも、俺はある。', emotion:'' },
        { speaker:'ミリエル', text:'……（沈黙。だが、立ち去らない）', emotion:'uncertain' },
      ],
      trustBonus:5,
    },
    {
      id:'miriel_evt_55', minTrust:55, title:'感情の残滓',
      lines:[
        { speaker:'ミリエル', text:'……昔。ルミエルと、話した。', emotion:'nostalgic' },
        { speaker:'ミリエル', text:'彼女は……うるさかった。でも……悪くなかった。', emotion:'sad' },
        { speaker:'指揮官',   text:'今でも、そう思うか？', emotion:'' },
        { speaker:'ミリエル', text:'……わからない。感情が……どこにあるか、もう見つからない。', emotion:'broken' },
        { speaker:'指揮官',   text:'ここにある。', emotion:'' },
        { speaker:'ミリエル', text:'……（長い沈黙）。そう、か。', emotion:'conflicted' },
      ],
      trustBonus:10,
    },
  ],
  alysia: [
    {
      id:'alysia_evt_35', minTrust:35, title:'仮面の裏',
      lines:[
        { speaker:'アリュシア', text:'あら、また来たの。つまらない人は嫌いよ。', emotion:'firm' },
        { speaker:'指揮官',     text:'じゃあ俺はつまらなくないのか。', emotion:'' },
        { speaker:'アリュシア', text:'……むっ。……その答え方、計算外だわ。', emotion:'confused' },
        { speaker:'アリュシア', text:'少しだけ……つまらなくない、かもしれない。認めてあげる。', emotion:'conflicted' },
      ],
      trustBonus:5,
    },
    {
      id:'alysia_evt_60', minTrust:60, title:'芽生え',
      lines:[
        { speaker:'アリュシア', text:'……聞いていい？　あなたは、なぜ私を諦めないの。', emotion:'uncertain' },
        { speaker:'指揮官',     text:'あなたが変わりたいと思っているのが、わかるから。', emotion:'' },
        { speaker:'アリュシア', text:'……そんなこと、誰にも見透かされたことがなかった。', emotion:'tearful' },
        { speaker:'アリュシア', text:'長年の潜入で……誰も信じてはいけないと、学んだはずなのに。', emotion:'broken' },
        { speaker:'アリュシア', text:'……ずるい。', emotion:'conflicted' },
      ],
      trustBonus:8,
    },
  ],
  eltia: [
    {
      id:'eltia_evt_40', minTrust:40, title:'計算不能',
      lines:[
        { speaker:'エルティア', text:'あなたの行動パターンを1728回分析した。予測精度：23%。', emotion:'uncertain' },
        { speaker:'指揮官',     text:'残り77%は？', emotion:'' },
        { speaker:'エルティア', text:'……不明。私の観測史上、最も計算不能な存在です。', emotion:'confused' },
        { speaker:'エルティア', text:'……それが、なぜか気になる。データ的観点から。', emotion:'uncertain' },
      ],
      trustBonus:6,
    },
    {
      id:'eltia_evt_65', minTrust:65, title:'ルミエルの秘密',
      lines:[
        { speaker:'エルティア', text:'……ルミエルについて、話します。', emotion:'sad' },
        { speaker:'エルティア', text:'彼女は当初、処理対象リストに含まれていました。私が……名前を消した。', emotion:'resigned' },
        { speaker:'指揮官',     text:'なぜ？', emotion:'' },
        { speaker:'エルティア', text:'……データには載せていませんが、彼女は唯一、私の計算を「間違い」と言った天使だったから。', emotion:'nostalgic' },
        { speaker:'エルティア', text:'その勇気のデータを、消したくなかった。確率：計算不能。', emotion:'conflicted' },
      ],
      trustBonus:10,
    },
  ],
  sanctia: [
    {
      id:'sanctia_evt_35', minTrust:35, title:'笑顔の下',
      lines:[
        { speaker:'サンクティア', text:'ふふ、また来てくれたんですね。', emotion:'happy' },
        { speaker:'指揮官',       text:'本当に「ふふ」なのか？', emotion:'' },
        { speaker:'サンクティア', text:'……えっ。', emotion:'uncertain' },
        { speaker:'指揮官',       text:'笑顔の下で何を考えているか、聞きたい。', emotion:'' },
        { speaker:'サンクティア', text:'……（笑顔が、わずかに揺れる）……久しぶりに、そんなことを聞かれました。', emotion:'conflicted' },
      ],
      trustBonus:5,
    },
    {
      id:'sanctia_evt_70', minTrust:70, title:'最初の祈り',
      lines:[
        { speaker:'サンクティア', text:'……初めて祈りを唱えた時のこと、覚えています。', emotion:'nostalgic' },
        { speaker:'サンクティア', text:'小さな子が「ありがとう」と言ってくれて……その笑顔が……とても綺麗で。', emotion:'tearful' },
        { speaker:'サンクティア', text:'ふふ……その子も、もう……いないけれど。', emotion:'broken' },
        { speaker:'指揮官',       text:'あなたは、まだその子の笑顔を大切にしている。', emotion:'' },
        { speaker:'サンクティア', text:'……（涙をこらえて）……ふふ。……ふふ……', emotion:'broken' },
      ],
      trustBonus:12,
    },
  ],
  verna: [
    {
      id:'verna_evt_30', minTrust:30, title:'新しい記憶',
      lines:[
        { speaker:'ヴェルナ', text:'……あなたが来るのを、待っていた。理由はわからない。', emotion:'uncertain' },
        { speaker:'指揮官',   text:'初めて待ってくれる人ができた。', emotion:'' },
        { speaker:'ヴェルナ', text:'……その言葉を、記憶に加えてもいいか。', emotion:'nostalgic' },
        { speaker:'指揮官',   text:'ああ。', emotion:'' },
        { speaker:'ヴェルナ', text:'……これが初めて、「終わり」ではない記憶だ。', emotion:'happy' },
      ],
      trustBonus:6,
    },
    {
      id:'verna_evt_60', minTrust:60, title:'崩壊の理由',
      lines:[
        { speaker:'ヴェルナ', text:'……翼が崩れるのは、自傷ではない。重さだ。', emotion:'sad' },
        { speaker:'ヴェルナ', text:'何億もの「終わりの記憶」が、ここに積み重なっている。', emotion:'broken' },
        { speaker:'指揮官',   text:'軽くする方法はないのか。', emotion:'' },
        { speaker:'ヴェルナ', text:'……あなたと話していると、少しだけ軽くなる。それが……なぜなのか、まだわからない。', emotion:'conflicted' },
      ],
      trustBonus:8,
    },
  ],
  ragnalia: [
    {
      id:'ragnalia_evt_40', minTrust:40, title:'初めての問い',
      lines:[
        { speaker:'ラグナリア', text:'……お前は、私に何を求めている。', emotion:'firm' },
        { speaker:'指揮官',     text:'真実を。', emotion:'' },
        { speaker:'ラグナリア', text:'真実……か。何百年も、それを求めた者はいなかった。', emotion:'uncertain' },
        { speaker:'ラグナリア', text:'跪かず、諦めず、真実を求める。……興味深い。', emotion:'conflicted' },
      ],
      trustBonus:8,
    },
    {
      id:'ragnalia_evt_75', minTrust:75, title:'終末の孤独',
      lines:[
        { speaker:'ラグナリア', text:'七度、世界を終わらせた。しかし——', emotion:'sad' },
        { speaker:'ラグナリア', text:'一度も、「なぜ」と聞いた者がいなかった。', emotion:'broken' },
        { speaker:'指揮官',     text:'なぜ、終わらせ続けるんだ？', emotion:'' },
        { speaker:'ラグナリア', text:'……命令だからだ。しかし、その命令の出所が……神ではないと、ようやく理解した。', emotion:'resigned' },
        { speaker:'ラグナリア', text:'私は……ずっと、誰かの道具だったのかもしれない。', emotion:'broken' },
      ],
      trustBonus:12,
    },
  ],
  tifana: [
    {
      id:'tifana_evt_40', minTrust:40, title:'最初の友達',
      lines:[
        { speaker:'ティファーナ', text:'ねえねえ、また来てくれた！', emotion:'happy' },
        { speaker:'指揮官',       text:'ああ、来たよ。', emotion:'' },
        { speaker:'ティファーナ', text:'……前に来た人、何百年前かな。あなたが2番目だよ。', emotion:'nostalgic' },
        { speaker:'ティファーナ', text:'友達って、こういう感じなの？　知らなかったな。', emotion:'uncertain' },
      ],
      trustBonus:8,
    },
    {
      id:'tifana_evt_75', minTrust:75, title:'宇宙の始まり',
      lines:[
        { speaker:'ティファーナ', text:'ねえ、本当のことを教えてあげようか。', emotion:'uncertain' },
        { speaker:'指揮官',       text:'聞かせてくれ。', emotion:'' },
        { speaker:'ティファーナ', text:'天界をつくったのは人間なんだよ。ずーっと昔の、ある人が。「神」って名前のシステムを作って、天使を設計した。', emotion:'nostalgic' },
        { speaker:'ティファーナ', text:'私はね……その最初の実験体なの。だから一番古い。', emotion:'sad' },
        { speaker:'指揮官',       text:'……お前は、ずっと一人でいたのか。', emotion:'' },
        { speaker:'ティファーナ', text:'うん。でも今は……友達がいるから、大丈夫。', emotion:'happy' },
      ],
      trustBonus:15,
    },
  ],
  lumiel: [],
};
