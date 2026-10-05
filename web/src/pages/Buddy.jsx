import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../store/AppContext.jsx';
import { Page, TopBar } from '../components/ui.jsx';
import SayIt from '../components/SayIt.jsx';
import { analyze, greeting } from '../lib/buddyEngine.js';
import { listen, speak, stopSpeaking, sttSupported } from '../lib/speech.js';
import { sfx } from '../lib/sound.js';

const REMOTE_URL = import.meta.env.VITE_BUDDY_AI_URL || '';

/** Highlight words that the correction added or changed. */
function Diff({ from, to }) {
  const had = new Set(from.toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{M}\p{N}']/gu, '')));
  return (
    <span>
      {to.split(/(\s+)/).map((w, i) => {
        const clean = w.toLowerCase().replace(/[^\p{L}\p{M}\p{N}']/gu, '');
        const changed = clean && !had.has(clean);
        return changed ? (
          <mark key={i} style={{ background: 'var(--accent)', borderRadius: 6, padding: '0 3px' }}>
            {w}
          </mark>
        ) : (
          <span key={i}>{w}</span>
        );
      })}
    </span>
  );
}

/** Optional cloud AI (Supabase Edge Function). Local engine always runs first for safety + fallback. */
async function remoteAnswer(url, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default function Buddy() {
  const { content, settings, profile, setProfile, complete, t } = useApp();
  const cfg = settings.buddy || {};
  const personas = cfg.personas || [];
  const persona = personas.find((p) => p.id === (profile.persona || cfg.defaultPersona)) || personas[0] || { name: 'Buddy', emoji: '🤖', pitch: 1, rate: 1 };
  const langs = content.languages.filter((l) => (cfg.languages || ['en']).includes(l.code));
  const [lang, setLang] = useState(cfg.languages?.includes(profile.learnLang) ? profile.learnLang : 'en');
  const [mode, setMode] = useState('chat'); // chat | words
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [talking, setTalking] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  const listRef = useRef(null);
  const recRef = useRef(null);
  const toddler = profile.age === '2-4';

  // word -> meaning dictionary from alphabet + explore content, for "what does X mean?"
  const dictionary = useMemo(() => {
    const d = {};
    for (const l of content.languages) for (const g of l.groups) for (const le of g.letters) for (const w of le.words || []) if (w.meaning) d[w.word.toLowerCase()] = w.meaning;
    for (const tp of content.topics || []) for (const it of tp.items) d[it.name.toLowerCase()] = it.fact.replace(/\.$/, '').toLowerCase();
    return d;
  }, [content]);

  const voice = { lang, pitch: persona.pitch, rate: persona.rate };
  const say = async (s) => {
    setTalking(true);
    await speak(s, voice);
    setTalking(false);
  };

  useEffect(() => {
    const hello = greeting(content.buddy, lang, { name: profile.name, buddy: persona.name });
    setMsgs([{ who: 'bot', text: hello }]);
    // greet only on language / persona change; speaking requires a prior tap so it's safe here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, persona.id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => () => stopSpeaking(), []);

  const send = async (input) => {
    const said = input.trim();
    if (!said) return;
    setText('');
    sfx.pop();
    let r = analyze(said, content.buddy, { lang, name: profile.name, buddy: persona.name, dictionary });
    const url = cfg.useRemoteAi ? cfg.remoteAiUrl || REMOTE_URL : '';
    if (url && r.safe) {
      setMsgs((m) => [...m, { who: 'kid', text: said }, { who: 'bot', text: '…', pending: true }]);
      const ai = await remoteAnswer(url, { text: said, lang, age: profile.age, name: profile.name, buddy: persona.name });
      if (ai?.answer || ai?.corrected) {
        r = {
          ...r,
          corrected: ai.corrected || r.corrected,
          changed: (ai.corrected || r.corrected) !== said,
          tips: [...new Set([...(r.tips || []), ...(ai.tips || [])])],
          words: [...(r.words || []), ...(ai.words || [])],
          answer: ai.answer || r.answer,
        };
        r.speech = [r.praise, r.changed ? `${content.buddy[lang]?.correctIntro} ${r.corrected}` : '', ...r.words.map((w) => `${w.to}: ${w.meaning}.`), r.answer]
          .filter(Boolean)
          .join(' ');
      }
      setMsgs((m) => [...m.filter((x) => !x.pending), { who: 'bot', r }]);
    } else {
      setMsgs((m) => [...m, { who: 'kid', text: said }, { who: 'bot', r }]);
    }
    complete('buddy', { id: lang, name: 'buddy_chat', celebrate: false, lang });
    say(r.speech);
  };

  const mic = async () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    stopSpeaking();
    sfx.tap();
    setListening(true);
    try {
      const rec = listen(lang);
      recRef.current = rec;
      const { text: heard } = await rec.promise;
      setListening(false);
      send(heard);
    } catch {
      setListening(false);
      setMsgs((m) => [...m, { who: 'bot', text: '🎧 I could not hear you. Tap the mic and talk a little louder!' }]);
    }
  };

  const practice = content.buddy[lang]?.practiceWords || [];

  return (
    <Page>
      <TopBar title={t('buddy')} emoji="🤖" />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
        {/* persona + language pickers */}
        <div className="card">
          <div className="pill-tabs">
            {personas.map((p) => (
              <button
                key={p.id}
                className={p.id === persona.id ? 'active' : ''}
                onClick={() => {
                  setProfile({ persona: p.id });
                  speak(`Hi! I am ${p.name}!`, { lang: 'en', pitch: p.pitch, rate: p.rate });
                }}
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
          <div className="pill-tabs" style={{ paddingBottom: 0 }}>
            {langs.map((l) => (
              <button key={l.code} className={l.code === lang ? 'active' : ''} onClick={() => setLang(l.code)}>
                {l.flag} {l.nativeName}
              </button>
            ))}
          </div>
        </div>

        <div className="center">
          <motion.div
            style={{ fontSize: toddler ? '7rem' : '5.5rem', lineHeight: 1 }}
            animate={talking ? { scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] } : listening ? { scale: [1, 1.15, 1] } : { y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: talking ? 0.4 : 2 }}
          >
            {persona.emoji}
          </motion.div>
          <b>{talking ? `${persona.name} is talking…` : listening ? 'I am listening… 👂' : persona.name}</b>
        </div>

        <div className="pill-tabs" style={{ justifyContent: 'center' }}>
          <button className={mode === 'chat' ? 'active' : ''} onClick={() => setMode('chat')}>
            💬 Talk & learn
          </button>
          <button className={mode === 'words' ? 'active' : ''} onClick={() => setMode('words')}>
            🗣️ Say it right
          </button>
        </div>

        {mode === 'chat' && (
          <div className="card">
            <div className="chat" ref={listRef} aria-live="polite">
              <AnimatePresence initial={false}>
                {msgs.map((m, i) => (
                  <motion.div
                    key={i}
                    className={`msg ${m.who}`}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    lang={lang}
                  >
                    {m.text && <div>{m.text}</div>}
                    {m.r && <BotReply r={m.r} kb={content.buddy[lang]} onSpeak={() => say(m.r.speech)} />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="row" style={{ marginTop: 12, flexWrap: 'nowrap' }}>
              {sttSupported && (
                <button className={`mic ${listening ? 'live' : ''}`} style={{ width: 72, height: 72, minWidth: 72, fontSize: '2rem' }} onClick={mic} aria-label="Talk">
                  {listening ? '⏹️' : '🎤'}
                </button>
              )}
              {!toddler && (
                <>
                  <input
                    className="field"
                    style={{ fontSize: '1.1rem', textAlign: 'left', padding: '12px 16px' }}
                    value={text}
                    maxLength={200}
                    placeholder="Type or say something…"
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send(text)}
                    lang={lang}
                  />
                  <button className="btn" onClick={() => send(text)} disabled={!text.trim()}>
                    ➤
                  </button>
                </>
              )}
            </div>
            {!sttSupported && <p className="muted" style={{ fontSize: '0.9rem' }}>🎤 Voice input works in Chrome / Edge / Safari. You can type instead!</p>}
            <div className="row" style={{ marginTop: 10, gap: 6 }}>
              {(lang === 'en'
                ? ['gimme water', 'i is happy', 'what does elephant mean', 'why is the sky blue', 'i want cookie', 'me want my doggy']
                : lang === 'bn'
                  ? ['পানি খামু', 'আকাশ নীল কেন', 'তুমি কে']
                  : []
              ).map((s) => (
                <button key={s} className="btn ghost small" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'words' && practice.length > 0 && (
          <div className="card center" style={{ gap: 12 }}>
            <motion.h2 key={wordIdx} initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: '3rem' }} lang={lang}>
              {practice[wordIdx % practice.length]}
            </motion.h2>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn ghost" onClick={() => say(practice[wordIdx % practice.length])}>
                🔈 {t('listen')}
              </button>
              <button className="btn ghost" onClick={() => speak(practice[wordIdx % practice.length], { ...voice, rate: 0.55 })}>
                🐢 Slowly
              </button>
              <button className="btn" onClick={() => setWordIdx((i) => i + 1)}>
                ➡️ Next word
              </button>
            </div>
            <SayIt
              key={wordIdx + lang}
              word={practice[wordIdx % practice.length]}
              lang={lang}
              onScore={(r) => r.stars >= 2 && complete('buddy', { id: `say:${lang}`, name: practice[wordIdx % practice.length], stars: r.stars, lang })}
            />
          </div>
        )}
        <p className="footer-note">
          🔒 {cfg.useRemoteAi ? 'Questions are checked for safety first. No names or personal details are stored.' : 'Your Buddy runs on this device — nothing you say leaves it.'}
        </p>
      </div>
    </Page>
  );
}

function BotReply({ r, kb, onSpeak }) {
  if (!r.safe) return <div>🛡️ {r.answer}</div>;
  return (
    <div>
      <div>
        {r.praise} {!r.changed && (kb?.perfect || 'Perfect!')}
      </div>
      {r.changed && (
        <div className="fix">
          ✅ {kb?.correctIntro} <b><Diff from={r.original} to={r.corrected} /></b>
        </div>
      )}
      {r.words?.map((w) => (
        <div key={w.from + w.to} className="tip">
          📘 <s>{w.from}</s> → <b>{w.to}</b>: {w.meaning}
        </div>
      ))}
      {r.tips?.map((tip) => (
        <div key={tip} className="tip">
          💡 {tip}
        </div>
      ))}
      {r.answer && <div style={{ marginTop: 8 }}>🤖 {r.answer}</div>}
      <button className="btn ghost small" style={{ marginTop: 8 }} onClick={onSpeak}>
        🔊 Hear it
      </button>
    </div>
  );
}
