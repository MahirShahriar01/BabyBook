// Kids Explorer AI — Talking Buddy correction engine (100% free, runs on-device).
// Mirrors mobile/lib/services/buddy_engine.dart. Rules live in content (buddy.json)
// so the Admin Panel can extend them without shipping new code.

const LETTER_BOUNDARY_START = '(^|[^\\p{L}\\p{M}])';
const LETTER_BOUNDARY_END = '(?=$|[^\\p{L}\\p{M}])';

const PUNCT_TIPS = {
  en: { cap: 'A sentence starts with a capital letter.', q: 'A question ends with a question mark ( ? ).', stop: 'A sentence ends with a full stop ( . ).', i: 'When we talk about ourselves, "I" is always a capital letter.' },
  bn: { cap: '', q: 'প্রশ্নের শেষে প্রশ্নবোধক চিহ্ন ( ? ) বসে।', stop: 'বাক্যের শেষে দাঁড়ি ( । ) বসে।', i: '' },
  hi: { cap: '', q: 'प्रश्न के अंत में प्रश्नवाचक चिह्न ( ? ) लगता है।', stop: 'वाक्य के अंत में पूर्ण विराम ( । ) लगता है।', i: '' },
  es: { cap: 'Una oración empieza con letra mayúscula.', q: 'En español, una pregunta empieza con ¿ y termina con ?', stop: 'Una oración termina con un punto ( . ).', i: '' },
  fr: { cap: 'Une phrase commence par une majuscule.', q: 'Une question se termine par un point d\'interrogation ( ? ).', stop: 'Une phrase se termine par un point ( . ).', i: '' },
};

const MEANING_PATTERNS = {
  en: [/what (?:does|is) (?:the word )?["']?([\p{L}\s'-]+?)["']? mean/iu, /meaning of ["']?([\p{L}\s'-]+?)["']?$/iu, /what is (?:a |an )?([\p{L}'-]+)$/iu],
  bn: [/([\p{L}\p{M}]+) মানে কী/u, /([\p{L}\p{M}]+) অর্থ কী/u, /([\p{L}\p{M}]+) কী$/u],
  es: [/qué significa ["']?([\p{L}\s'-]+?)["']?$/iu, /qué es (?:un |una )?([\p{L}'-]+)$/iu],
  fr: [/que veut dire ["']?([\p{L}\s'-]+?)["']?$/iu, /qu'est-ce qu(?:e|'un|'une) ([\p{L}'-]+)$/iu],
  hi: [/([\p{L}\p{M}]+) का मतलब क्या/u, /([\p{L}\p{M}]+) क्या है$/u],
};

const MEANING_TEMPLATES = {
  en: (w, m) => `"${w}" means ${m}.`,
  bn: (w, m) => `"${w}" মানে ${m}।`,
  es: (w, m) => `"${w}" significa ${m}.`,
  fr: (w, m) => `« ${w} » veut dire ${m}.`,
  hi: (w, m) => `"${w}" का मतलब है ${m}।`,
};

const LATIN = new Set(['en', 'es', 'fr']);
const FULL_STOP = { bn: '।', hi: '।' };

export const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fill = (s, vars) => (s || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const pickOne = (arr, seed = Date.now()) => (arr?.length ? arr[seed % arr.length] : '');

function hasWord(haystack, word) {
  return new RegExp(LETTER_BOUNDARY_START + escapeRegExp(word.toLowerCase()) + LETTER_BOUNDARY_END, 'u').test(haystack);
}

export function detectQuestion(text, kb, lang) {
  const t = text.trim().toLowerCase().replace(/^¿/, '');
  if (/\?\s*$/.test(t)) return true;
  const starters = kb.questionStarters || [];
  if (starters.some((s) => t === s || t.startsWith(s + ' ') || t.startsWith(s + "'"))) return true;
  if (lang === 'bn' || lang === 'hi') {
    const words = t.replace(/[।?!.,]/g, '').split(/\s+/);
    const enders = kb.questionEnders || [];
    if (enders.includes(words[words.length - 1])) return true;
    if (lang === 'bn' && (words.includes('কি') || words.includes('কী'))) return true;
    if (lang === 'hi' && words[0] === 'क्या') return true;
  }
  return false;
}

/** Apply capitalization + end punctuation. */
export function punctuate(text, lang, isQuestion, endedWithBang) {
  let s = text.trim().replace(/\s+([,.!?।])/g, '$1').replace(/,(?=\S)/g, ', ');
  s = s.replace(/[.!?।]+$/u, '').trim();
  if (lang === 'es') s = s.replace(/^¿\s*/, '');
  if (LATIN.has(lang) && s) s = s[0].toLocaleUpperCase(lang) + s.slice(1);
  if (lang === 'en') s = s.replace(/(^|[^\p{L}])i(?=$|[^\p{L}])/gu, '$1I');
  const end = isQuestion ? '?' : endedWithBang ? '!' : FULL_STOP[lang] || '.';
  if (lang === 'es' && isQuestion) s = '¿' + s;
  return s + end;
}

const lettersOnly = (s) => s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '');

/**
 * Analyse what the kid said/typed.
 * @param {string} input
 * @param {object} kbAll  buddy knowledge base for all languages (content.buddy)
 * @param {{lang?:string, name?:string, buddy?:string, dictionary?:Record<string,string>, seed?:number}} opts
 */
export function analyze(input, kbAll, opts = {}) {
  const lang = kbAll?.[opts.lang] ? opts.lang : 'en';
  const kb = kbAll?.[lang] || {};
  const vars = { name: opts.name || 'friend', buddy: opts.buddy || 'Buddy' };
  const seedNum = opts.seed ?? Date.now();
  const text = String(input || '').trim().replace(/\s+/g, ' ');
  const result = { original: text, corrected: text, changed: false, tips: [], words: [], isQuestion: false, answer: '', praise: '', safe: true, lang };
  if (!text) return result;

  const lower = text.toLowerCase();
  if ((kb.safety || []).some((w) => lower.includes(w.toLowerCase()))) {
    return { ...result, safe: false, answer: fill(kb.safetyReply, vars), speech: fill(kb.safetyReply, vars) };
  }

  const endedWithBang = /!\s*$/.test(text);
  let isQuestion = detectQuestion(text, kb, lang);
  let core = text.replace(/[.!?।]+$/u, '').replace(/^¿/, '').trim();

  // 1) grammar / dialect corrections
  for (const rule of kb.corrections || []) {
    const re = new RegExp(rule.pattern, 'giu');
    if (re.test(core)) {
      core = core.replace(new RegExp(rule.pattern, 'giu'), rule.replace);
      if (rule.tip && !result.tips.includes(rule.tip)) result.tips.push(rule.tip);
    }
  }

  // 2) baby-talk -> formal words (with meanings)
  for (const [kid, [formal, meaning]] of Object.entries(kb.kidWords || {})) {
    const re = new RegExp(LETTER_BOUNDARY_START + escapeRegExp(kid) + LETTER_BOUNDARY_END, 'giu');
    if (re.test(core)) {
      core = core.replace(new RegExp(LETTER_BOUNDARY_START + escapeRegExp(kid) + LETTER_BOUNDARY_END, 'giu'), `$1${formal}`);
      result.words.push({ from: kid, to: formal, meaning });
    }
  }

  // 3) polite phrasing (first match wins)
  for (const rule of kb.polite || []) {
    const re = new RegExp(rule.pattern, 'iu');
    if (re.test(core)) {
      core = core.replace(re, rule.replace);
      if (rule.tip) result.tips.push(rule.tip);
      isQuestion = detectQuestion(core, kb, lang) || core.startsWith('¿');
      break;
    }
  }

  // 4) punctuation + capitals
  const corrected = punctuate(core, lang, isQuestion, endedWithBang);
  const tipsPunct = PUNCT_TIPS[lang] || PUNCT_TIPS.en;
  if (corrected !== text && lettersOnly(corrected) === lettersOnly(text)) {
    if (LATIN.has(lang) && text[0] !== corrected.replace(/^¿/, '')[0] && tipsPunct.cap) result.tips.push(tipsPunct.cap);
    if (lang === 'en' && /(^|[^\p{L}])i(?=$|[^\p{L}])/u.test(text) && tipsPunct.i) result.tips.push(tipsPunct.i);
    const lastIn = text.slice(-1);
    const lastOut = corrected.slice(-1);
    if (lastIn !== lastOut) result.tips.push(isQuestion ? tipsPunct.q : tipsPunct.stop);
    if (lang === 'es' && isQuestion && !text.startsWith('¿') && !result.tips.includes(tipsPunct.q)) result.tips.push(tipsPunct.q);
  }

  result.corrected = corrected;
  result.changed = corrected !== text;
  result.isQuestion = isQuestion;

  // 5) answer: meaning lookup -> knowledge base -> fallback
  const answerSrc = lower.replace(/[?!.।¿]/g, '').trim();
  const dict = { ...(opts.dictionary || {}) };
  for (const [kid, [formal, meaning]] of Object.entries(kb.kidWords || {})) {
    dict[kid.toLowerCase()] = meaning;
    dict[formal.toLowerCase()] = meaning;
  }
  for (const re of MEANING_PATTERNS[lang] || []) {
    const m = answerSrc.match(re);
    if (m && dict[m[1].trim().toLowerCase()]) {
      const w = m[1].trim();
      result.answer = (MEANING_TEMPLATES[lang] || MEANING_TEMPLATES.en)(w, dict[w.toLowerCase()]);
      break;
    }
  }
  if (!result.answer) {
    let best = null;
    let bestScore = 0;
    for (const qa of kb.qa || []) {
      const score = qa.keywords.reduce((n, k) => n + (hasWord(answerSrc, k) ? k.split(' ').length : 0), 0);
      if (score > bestScore) {
        best = qa;
        bestScore = score;
      }
    }
    if (best) result.answer = fill(best.answer, vars);
    else if (isQuestion) result.answer = fill(kb.fallback, vars);
  }

  result.praise = pickOne(kb.praise, seedNum);
  const parts = [result.praise];
  parts.push(result.changed ? `${kb.correctIntro || "Let's say it like this:"} ${corrected}` : kb.perfect || '');
  for (const w of result.words) parts.push(`${w.to}: ${w.meaning}.`);
  if (result.answer) parts.push(result.answer);
  result.speech = parts.filter(Boolean).join(' ');
  return result;
}

export function greeting(kbAll, lang, vars) {
  return fill((kbAll?.[lang] || kbAll?.en)?.greeting, vars);
}

// ---------------------------------------------------------------- pronunciation
export function levenshtein(a, b) {
  const A = [...a];
  const B = [...b];
  const dp = Array.from({ length: A.length + 1 }, (_, i) => [i, ...Array(B.length).fill(0)]);
  for (let j = 1; j <= B.length; j++) dp[0][j] = j;
  for (let i = 1; i <= A.length; i++)
    for (let j = 1; j <= B.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
  return dp[A.length][B.length];
}

const normWord = (s) => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

/** Score 0-100 and 0-3 stars for how close the heard text is to the target word. */
export function pronunciationScore(target, heardAlternatives) {
  const t = normWord(target);
  const alts = (Array.isArray(heardAlternatives) ? heardAlternatives : [heardAlternatives]).map(normWord).filter(Boolean);
  if (!t || !alts.length) return { score: 0, stars: 0, heard: alts[0] || '' };
  let best = { score: 0, heard: alts[0] };
  for (const h of alts) {
    const candidates = [h, ...h.split(' ')];
    for (const c of candidates) {
      const d = levenshtein(t, c);
      const score = Math.max(0, Math.round((1 - d / Math.max([...t].length, [...c].length)) * 100));
      if (score > best.score) best = { score, heard: h };
    }
  }
  const stars = best.score >= 90 ? 3 : best.score >= 70 ? 2 : best.score >= 45 ? 1 : 0;
  return { ...best, stars };
}

/** Split a word into syllable-ish chunks to help toddlers ("but-ter-fly"). */
export function syllables(word) {
  if (!/^[a-z\s'-]+$/i.test(word)) return [word];
  return word
    .split(' ')
    .flatMap((w) => w.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi) || [w])
    .filter(Boolean);
}
