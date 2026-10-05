// Free, on-device speech using the browser's Web Speech API.
//  - speak(): SpeechSynthesis with persona pitch/rate + language voice
//  - listen(): SpeechRecognition (Chrome, Edge, Safari 14.1+, Android Chrome)

export const LOCALES = { en: 'en-US', bn: 'bn-BD', es: 'es-ES', fr: 'fr-FR', hi: 'hi-IN' };

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
function loadVoices() {
  voices = synth?.getVoices() || [];
}
if (synth) {
  loadVoices();
  synth.onvoiceschanged = loadVoices;
}

export const ttsSupported = Boolean(synth);
export const sttSupported =
  typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

export function pickVoice(locale) {
  if (!voices.length) loadVoices();
  const lang = locale.toLowerCase();
  const short = lang.split('-')[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === lang) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(short)) ||
    // Bangla voices are rare on desktop; Indian Bangla is a good fallback.
    (short === 'bn' ? voices.find((v) => v.lang.toLowerCase().startsWith('bn')) : null) ||
    null
  );
}

/**
 * Speak text. Returns a promise that resolves when speech ends.
 * @param {string} text
 * @param {{lang?:string, pitch?:number, rate?:number, onWord?:(charIndex:number)=>void}} opts
 */
export function speak(text, opts = {}) {
  return new Promise((resolve) => {
    if (!synth || !text) return resolve();
    synth.cancel();
    const locale = LOCALES[opts.lang] || opts.lang || 'en-US';
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale;
    const v = pickVoice(locale);
    if (v) u.voice = v;
    u.pitch = opts.pitch ?? 1.1;
    u.rate = opts.rate ?? 0.95;
    if (opts.onWord) u.onboundary = (e) => e.name !== 'sentence' && opts.onWord(e.charIndex);
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function stopSpeaking() {
  synth?.cancel();
}

/**
 * Listen once and return the best transcript (plus alternatives).
 * @returns {{promise: Promise<{text:string, alternatives:string[], confidence:number}>, stop: ()=>void}}
 */
export function listen(lang = 'en') {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return { promise: Promise.reject(new Error('unsupported')), stop() {} };
  const rec = new SR();
  rec.lang = LOCALES[lang] || lang;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  const promise = new Promise((resolve, reject) => {
    let done = false;
    rec.onresult = (e) => {
      done = true;
      const res = e.results[0];
      const alts = Array.from(res).map((a) => a.transcript.trim());
      resolve({ text: alts[0] || '', alternatives: alts, confidence: res[0]?.confidence ?? 0 });
    };
    rec.onerror = (e) => {
      done = true;
      reject(new Error(e.error || 'speech-error'));
    };
    rec.onend = () => !done && reject(new Error('no-speech'));
  });
  rec.start();
  return { promise, stop: () => rec.stop() };
}
