// Pure helpers for the newer games (unit-tested in tests/engine.test.js).

/** Split a word into the letters a child sees (Bangla vowel signs stay with their consonant). */
export function graphemes(word, lang = 'en') {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) return [...new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(word)].map((s) => s.segment);
  return [...word];
}

/** Words that are easy to spell with tiles: no conjuncts (্), 2–6 letters, no spaces. */
export function spellableWords(language, age) {
  const max = age === '2-4' ? 3 : age === '5-7' ? 4 : 6;
  const out = [];
  for (const g of language?.groups || [])
    for (const le of g.letters)
      for (const w of le.words || []) {
        if (/[\s্]/.test(w.word) || /\d/.test(w.word)) continue;
        const parts = graphemes(w.word, language.code);
        if (parts.length >= 2 && parts.length <= max) out.push({ ...w, parts });
      }
  return out;
}

// ------------------------------------------------------------------ tic-tac-toe
export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function winner(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: [a, c, d] };
  return b.every(Boolean) ? { who: 'draw', line: [] } : null;
}

function minimax(b, me, turn, depth) {
  const w = winner(b);
  if (w) return w.who === me ? 10 - depth : w.who === 'draw' ? 0 : depth - 10;
  let best = turn === me ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = turn;
    const v = minimax(b, me, turn === 'X' ? 'O' : 'X', depth + 1);
    b[i] = null;
    best = turn === me ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

/**
 * Robot move. `skill` 0..1 is the chance it plays the perfect (minimax) move —
 * low for toddlers so they can win, high for older kids.
 */
export function robotMove(board, skill = 0.6, rnd = Math.random, me = 'O') {
  const free = board.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  if (!free.length) return -1;
  if (rnd() > skill) return free[Math.floor(rnd() * free.length)];
  let best = free[0];
  let bestV = -Infinity;
  for (const i of free) {
    const b = [...board];
    b[i] = me;
    const v = minimax(b, me, me === 'O' ? 'X' : 'O', 1);
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  }
  return best;
}

// ------------------------------------------------------------------ more or less
const COMPARE_THINGS = ['🍎', '⭐', '🐟', '🎈', '🍓', '🚗', '🐥', '🍪'];

/** Compare quantities: toddlers count objects, older kids compare numbers. */
export function makeCompare(age, rnd = Math.random) {
  const r = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const useNumbers = age === '8-10' || (age === '5-7' && rnd() < 0.5);
  const max = age === '2-4' ? 6 : age === '5-7' ? 10 : 99;
  let a = r(1, max);
  let b = r(1, max);
  while (a === b) b = r(1, max);
  const askMore = age === '2-4' ? true : rnd() < 0.5;
  return { a, b, askMore, useNumbers, thing: COMPARE_THINGS[r(0, COMPARE_THINGS.length - 1)], answer: askMore ? (a > b ? 0 : 1) : a < b ? 0 : 1 };
}

