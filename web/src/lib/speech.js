// Kid-friendly speech for every language, Bangla included.
//
//  speak(text)  — splits mixed text by script ("Car. গাড়ি") and speaks each part with
//                 the right voice. If the device has no voice for a language (very common
//                 for Bangla on desktop), it falls back to the optional cloud voice
//                 (Admin → App Settings → Voices) so kids always hear something.
//  playAudio()  — admin-uploaded recordings (letters, story pages) with word timing.
//  listen()     — SpeechRecognition (Chrome, Edge, Safari 14.1+, Android Chrome).

export const LOCALES = { en: 'en-US', bn: 'bn-BD', es: 'es-ES', fr: 'fr-FR', hi: 'hi-IN' };
// Extra locale codes to try when the preferred one has no voice.
const ALT_LOCALES = { bn: ['bn-BD', 'bn-IN', 'bn'], hi: ['hi-IN', 'hi'], en: ['en-US', 'en-GB', 'en-IN', 'en'] };
const NAME_HINTS = { bn: /bangla|bengali|বাংলা/i, hi: /hindi|हिन्दी/i };

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
let config = { kidRate: 0.9, cloudTtsUrl: '', cloudFallback: true };
const readyListeners = new Set();

function loadVoices() {
  voices = synth?.getVoices() || [];
  if (voices.length) readyListeners.forEach((cb) => cb());
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

export const ttsSupported = Boolean(synth);
export const sttSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

/** Admin-controlled voice settings (settings.voice). */
export function configureSpeech(voice = {}) {
  config = { ...config, ...voice };
}

export function onVoicesReady(cb) {
  readyListeners.add(cb);
  if (voices.length) cb();
  return () => readyListeners.delete(cb);
}

// ------------------------------------------------------------------ scripts
const BENGALI = /[ঀ-৿]/;
const DEVANAGARI = /[ऀ-ॿ]/;
const LETTER = /\p{L}/u;

/** Language implied by the script of a character, or null for neutral characters. */
function charLang(ch, latinLang) {
  if (BENGALI.test(ch)) return 'bn';
  if (DEVANAGARI.test(ch)) return 'hi';
  if (LETTER.test(ch)) return latinLang;
  return null; // spaces, digits, punctuation, emoji: stick to the current run
}

/**
 * Split text into runs that each need one voice.
 * Latin text inside a Bangla/Hindi sentence is spoken in English.
 */
export function segments(text, lang = 'en') {
  const latinLang = lang === 'bn' || lang === 'hi' ? 'en' : lang;
  const out = [];
  let cur = null;
  let i = 0;
  for (const ch of text) {
    const l = charLang(ch, latinLang);
    if (!cur) cur = { lang: l || lang, text: '', start: i };
    else if (l && l !== cur.lang && cur.text.trim() && [...cur.text].some((c) => charLang(c, latinLang))) {
      out.push(cur);
      cur = { lang: l, text: '', start: i };
    } else if (l && !cur.text.trim()) cur.lang = l;
    cur.text += ch;
    i += ch.length;
  }
  if (cur && cur.text.trim()) out.push(cur);
  return out;
}

// ------------------------------------------------------------------ voices
const score = (v) => (/natural|neural|online|google|premium|enhanced/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);

export function pickVoice(lang) {
  if (!voices.length) loadVoices();
  const short = (LOCALES[lang] || lang).split('-')[0].toLowerCase();
  const locales = ALT_LOCALES[short] || [LOCALES[short] || lang, short];
  for (const loc of locales) {
    const l = loc.toLowerCase();
    const found = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === l || (l.length === 2 && v.lang.toLowerCase().startsWith(l)));
    if (found.length) return found.sort((a, b) => score(b) - score(a))[0];
  }
  const hint = NAME_HINTS[short];
  return (hint && voices.find((v) => hint.test(v.name))) || null;
}

/** True when this device can speak the language (or a cloud voice is configured). */
export function canSpeak(lang) {
  return Boolean(pickVoice(lang)) || Boolean(config.cloudTtsUrl && config.cloudFallback);
}

/** True when we know for sure the device lacks a voice (voices loaded, none found, no cloud). */
export function missingVoice(lang) {
  return ttsSupported && voices.length > 0 && !canSpeak(lang);
}

// ------------------------------------------------------------------ playback
let token = 0;
let currentAudio = null;
const keep = new Set(); // Chrome garbage-collects utterances mid-speech unless referenced
const cloudCache = new Map();

function speakSegment(seg, opts, myToken) {
  return new Promise((resolve) => {
    if (!synth || myToken !== token) return resolve();
    const voice = pickVoice(seg.lang);
    if (!voice && config.cloudTtsUrl && config.cloudFallback) {
      return cloudSpeak(seg, opts, myToken).then(resolve);
    }
    const u = new SpeechSynthesisUtterance(seg.text);
    u.lang = voice?.lang || LOCALES[seg.lang] || seg.lang;
    if (voice) u.voice = voice;
    u.pitch = opts.pitch ?? 1.1;
    u.rate = opts.rate ?? config.kidRate; // slower default rate is easier for kids to follow
    if (opts.onWord) u.onboundary = (e) => e.name !== 'sentence' && opts.onWord(seg.start + e.charIndex);
    const done = () => {
      keep.delete(u);
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    keep.add(u);
    synth.speak(u);
  });
}

async function cloudSpeak(seg, opts, myToken) {
  const key = `${seg.lang}|${seg.text}`;
  try {
    let url = cloudCache.get(key);
    if (!url) {
      const res = await fetch(config.cloudTtsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: seg.text.trim(), lang: seg.lang }),
      });
      if (!res.ok) return;
      const type = res.headers.get('content-type') || '';
      url = type.includes('json') ? (await res.json()).url : URL.createObjectURL(await res.blob());
      if (!url) return;
      cloudCache.set(key, url);
    }
    if (myToken !== token) return;
    await playAudio(url, { text: seg.text, offset: seg.start, onWord: opts.onWord, rate: opts.rate }, myToken);
  } catch {
    /* offline: stay silent rather than crash */
  }
}

/**
 * Play a recording. When `text` + `onWord` are given, word highlights are estimated
 * from the audio duration so stories still highlight along with recorded narration.
 */
export function playAudio(url, { text = '', offset = 0, onWord, rate } = {}, myToken = ++token) {
  return new Promise((resolve) => {
    const a = new Audio(url);
    currentAudio = a;
    if (rate) a.playbackRate = Math.max(0.6, Math.min(1.4, rate));
    let timer;
    const words = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) words.push({ start: m.index, len: m[0].length });
    const total = words.reduce((n, w) => n + w.len + 1, 0) || 1;
    const finish = () => {
      clearInterval(timer);
      if (currentAudio === a) currentAudio = null;
      resolve();
    };
    a.onended = finish;
    a.onerror = finish;
    a.onplay = () => {
      if (!onWord || !words.length) return;
      timer = setInterval(() => {
        if (myToken !== token || !a.duration) return;
        const pos = (a.currentTime / a.duration) * total;
        let acc = 0;
        for (const w of words) {
          acc += w.len + 1;
          if (acc >= pos) {
            onWord(offset + w.start);
            break;
          }
        }
      }, 120);
    };
    a.play().catch(finish);
  });
}

/**
 * Speak text in a kid-friendly voice. Resolves when finished.
 * @param {string} text
 * @param {{lang?:string, pitch?:number, rate?:number, onWord?:(charIndex:number)=>void}} opts
 */
export async function speak(text, opts = {}) {
  stopSpeaking();
  const myToken = token;
  if (!text) return;
  for (const seg of segments(String(text), opts.lang || 'en')) {
    if (myToken !== token) return;
    await speakSegment(seg, opts, myToken);
  }
}

export function stopSpeaking() {
  token++;
  synth?.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

/**
 * Listen once and return the best transcript (plus alternatives).
 * @returns {{promise: Promise<{text:string, alternatives:string[], confidence:number}>, stop: ()=>void}}
 */
export function listen(lang = 'en') {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return { promise: Promise.reject(new Error('unsupported')), stop() {} };
  stopSpeaking();
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
