import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, pronunciationScore, punctuate, syllables } from '../src/lib/buddyEngine.js';
import { conflicts, isSolved, puzzle, solution } from '../src/lib/sudoku.js';
import { knn, predictNext, recognize } from '../src/lib/recognizer.js';

const seed = JSON.parse(fs.readFileSync(new URL('../src/data/seed.json', import.meta.url)));
const kb = seed.buddy;

test('buddy: fixes grammar, capitals and punctuation', () => {
  const r = analyze('i is happy', kb, { lang: 'en', seed: 0 });
  assert.equal(r.corrected, 'I am happy.');
  assert.ok(r.changed);
  assert.ok(r.tips.length > 0);
});

test('buddy: teaches polite phrasing', () => {
  const r = analyze('gimme water', kb, { lang: 'en', seed: 0 });
  assert.match(r.corrected, /^May I please have water\?$/);
  assert.equal(r.answer, '', 'a polite request should not get the question fallback');
});

test('buddy: baby words become formal words with meaning', () => {
  const r = analyze('my tummy hurts', kb, { lang: 'en', seed: 0 });
  assert.equal(r.corrected, 'My stomach hurts.');
  assert.equal(r.words[0].to, 'stomach');
});

test('buddy: detects questions and answers from knowledge base', () => {
  const r = analyze('why is the sky blue', kb, { lang: 'en', seed: 0 });
  assert.ok(r.isQuestion);
  assert.ok(r.corrected.endsWith('?'));
  assert.ok(r.answer.length > 10);
});

test('buddy: safety filter blocks unsafe topics', () => {
  const r = analyze('what is your address', kb, { lang: 'en', seed: 0 });
  assert.equal(r.safe, false);
});

test('buddy: Bangla dialect correction and দাঁড়ি', () => {
  const r = analyze('আমি পানি খামু', kb, { lang: 'bn', seed: 0 });
  assert.equal(r.corrected, 'আমি পানি খাব।');
});

test('buddy: Spanish question marks', () => {
  assert.equal(punctuate('como estas', 'es', true, false), '¿Como estas?');
});

test('pronunciation score and syllables', () => {
  assert.equal(pronunciationScore('elephant', ['elephant']).stars, 3);
  assert.ok(pronunciationScore('elephant', ['elefan']).stars >= 1);
  assert.equal(pronunciationScore('elephant', ['banana']).stars, 0);
  assert.deepEqual(syllables('butterfly').join(''), 'butterfly');
});

test('sudoku: generated solutions are valid for 3, 4 and 6', () => {
  for (const n of [3, 4, 6]) for (let i = 0; i < 30; i++) assert.ok(isSolved(solution(n)), `size ${n}`);
});

test('sudoku: puzzles have the requested holes and detect conflicts', () => {
  const { grid } = puzzle(4, 7);
  assert.equal(grid.flat().filter((v) => v === 0).length, 7);
  const bad = [
    [1, 1, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  assert.equal(conflicts(bad).size, 2);
});

const circlePts = Array.from({ length: 50 }, (_, i) => ({ x: 200 + 80 * Math.cos((i / 49) * 2 * Math.PI), y: 200 + 80 * Math.sin((i / 49) * 2 * Math.PI) }));
const triPts = [
  [200, 50], [350, 300], [50, 300], [200, 50],
].flatMap((p, i, a) => (i === a.length - 1 ? [] : Array.from({ length: 15 }, (_, k) => ({ x: p[0] + ((a[i + 1][0] - p[0]) * k) / 15, y: p[1] + ((a[i + 1][1] - p[1]) * k) / 15 }))));

test('AI lab: recognizer tells circle from triangle', () => {
  assert.equal(recognize(circlePts)[0].name, 'circle');
  assert.equal(recognize(triPts)[0].name, 'triangle');
});

test('AI lab: k-NN and next-item predictor', () => {
  const ex = [
    { label: 'fly', features: [1, 0] },
    { label: 'swim', features: [0, 1] },
  ];
  assert.equal(knn(ex, [0.9, 0.1], 1).label, 'fly');
  assert.equal(predictNext(['a', 'b', 'a', 'b', 'a'], ['a', 'b'])[0].option, 'b');
});

test('content: every story, topic and video is well-formed', () => {
  for (const s of seed.stories) {
    assert.ok(s.id && s.title && s.pages.length, s.id);
    for (const q of s.quiz || []) assert.ok(q.answer < q.options.length, s.id);
  }
  for (const tp of seed.topics) assert.ok(tp.items.every((i) => i.id && i.name && i.emoji), tp.id);
  for (const q of seed.quiz) assert.ok(q.answer < q.options.length, q.q);
});

test('daily missions never loop forever, whatever features are on', async () => {
  const { missionsFor } = await import('../src/lib/progress.js');
  const keys = ['alphabet', 'story', 'game', 'explore', 'buddy', 'quiz', 'ailab'];
  for (let off = 0; off < keys.length; off++) {
    const features = Object.fromEntries(keys.slice(0, off).map((k) => [k, false]));
    const m = missionsFor('2026-10-05', 3, features);
    assert.ok(m.length <= 3);
    assert.equal(new Set(m.map((x) => x.id)).size, m.length);
  }
});

test('speech: mixed text is split by script so each part gets the right voice', async () => {
  const { segments } = await import('../src/lib/speech.js');
  const s = segments('Car. গাড়ি', 'en');
  assert.deepEqual(s.map((x) => [x.lang, x.text.trim()]), [['en', 'Car.'], ['bn', 'গাড়ি']]);
  assert.equal(s[1].start, 5);
  assert.deepEqual(segments('অ-তে অজগর', 'bn').map((x) => x.lang), ['bn']);
  assert.deepEqual(segments('দারুণ! Great job!', 'bn').map((x) => x.lang), ['bn', 'en']);
  assert.deepEqual(segments('৫ + ৩ = কত?', 'bn').map((x) => x.lang), ['bn']);
});

test('games: tic-tac-toe robot blocks and wins; spellable words split by grapheme', async () => {
  const { robotMove, winner, spellableWords, graphemes } = await import('../src/lib/games.js');
  // X threatens the top row: a perfect robot must block at 2
  assert.equal(robotMove(['X', 'X', null, null, 'O', null, null, null, null], 1), 2);
  // O can win on the diagonal
  assert.equal(robotMove(['O', 'X', 'X', null, 'O', null, 'X', null, null], 1), 8);
  assert.equal(winner(['X', 'X', 'X', null, null, null, null, null, null]).who, 'X');
  assert.deepEqual(graphemes('কলা', 'bn'), ['ক', 'লা']);
  const bn = seed.languages.find((l) => l.code === 'bn');
  const words = spellableWords(bn, '5-7');
  assert.ok(words.length > 10);
  assert.ok(words.every((w) => !w.word.includes('্') && w.parts.length <= 4));
});

test('games: more-or-less always has exactly one right side', async () => {
  const { makeCompare } = await import('../src/lib/games.js');
  for (const age of ['2-4', '5-7', '8-10'])
    for (let i = 0; i < 200; i++) {
      const q = makeCompare(age);
      assert.notEqual(q.a, q.b);
      const right = q.askMore ? Math.max(q.a, q.b) : Math.min(q.a, q.b);
      assert.equal([q.a, q.b][q.answer], right);
      if (age === '2-4') assert.ok(q.a <= 6 && q.b <= 6 && q.askMore);
    }
});
