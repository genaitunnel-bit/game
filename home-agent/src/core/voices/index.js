import cute from './cute.js';
import plain from './plain.js';

export const STYLES = { cute, plain };

/** 未知の style を指定されても黙って動く。口調は落ちても家事は回したい。 */
export function pickStyle(name) {
  return STYLES[name] ?? STYLES.cute;
}
