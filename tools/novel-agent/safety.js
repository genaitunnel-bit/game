"use strict";

/*
 * Stable Diffusion 系のプロンプトタグから、幼児体型キャラクターを性的に
 * 描写しようとする組み合わせを検出する。該当した場合は小説生成そのものを
 * 中止する（LLMには一切渡さない）。
 */

const MINOR_CODED_TERMS = [
  /\bloli(ta)?\b/i,
  /\bshota\b/i,
  /\bchild\b/i,
  /\btoddler\b/i,
  /\bunderage\b/i,
  /\belementary school\b/i,
  /\bkindergarten\b/i,
  /\bpetite[_ ]?loli\b/i,
  /\bjs\b/, // 日本語圏で小学生を指す隠語タグ
  /\bjc\b/, // 中学生を指す隠語タグ
];

const SEXUAL_TERMS = [
  /\bnsfw\b/i,
  /\bnude\b/i,
  /\bnaked\b/i,
  /\bsex\b/i,
  /\bhentai\b/i,
  /\berotic\b/i,
  /\bexplicit\b/i,
  /\bnipple[s]?\b/i,
  /\bpussy\b/i,
  /\bpenis\b/i,
  /\bcum\b/i,
  /\borgasm\b/i,
  /\bnaughty[_ ]face\b/i,
  /\bcleavage\b/i,
  /\b(huge|sagging|exposed)[_ ]breast\b/i,
  /\blingerie\b/i,
  /\bpanties\b/i,
  /\bsee-through\b/i,
];

function findMatches(text, patterns) {
  return patterns
    .map((re) => re.exec(text))
    .filter(Boolean)
    .map((m) => m[0]);
}

/**
 * @param {string} text 判定対象のプロンプト文字列（ポジティブ/ネガティブ問わず）
 * @returns {{blocked: boolean, minorTerms: string[], sexualTerms: string[]}}
 */
function checkPromptSafety(text) {
  const minorTerms = findMatches(text, MINOR_CODED_TERMS);
  const sexualTerms = findMatches(text, SEXUAL_TERMS);
  return {
    blocked: minorTerms.length > 0 && sexualTerms.length > 0,
    minorTerms,
    sexualTerms,
  };
}

module.exports = { checkPromptSafety };
