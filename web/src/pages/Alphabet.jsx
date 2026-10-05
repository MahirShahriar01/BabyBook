import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../store/AppContext.jsx';
import { Modal, Page, SpeakButton, TopBar, colorAt } from '../components/ui.jsx';
import TraceCanvas from '../components/TraceCanvas.jsx';
import SayIt from '../components/SayIt.jsx';
import { speak } from '../lib/speech.js';
import { sfx } from '../lib/sound.js';

export default function Alphabet() {
  const { content, profile, setProfile, progress, complete, t, theme } = useApp();
  const languages = content.languages.filter((l) => l.enabled !== false);
  const lang = languages.find((l) => l.code === profile.learnLang) || languages[0];
  const [groupIdx, setGroupIdx] = useState(0);
  const [open, setOpen] = useState(null); // letter index
  const [tab, setTab] = useState('words'); // words | trace | say
  const group = lang?.groups[Math.min(groupIdx, lang.groups.length - 1)];
  const letters = useMemo(() => group?.letters || [], [group]);
  const letter = open != null ? letters[open] : null;

  const learned = (ch) => progress.done[`letter:${lang.code}:${ch}`];

  const openLetter = (i) => {
    sfx.pop();
    setOpen(i);
    setTab('words');
    const l = letters[i];
    const w = l.words?.[0];
    speak(w ? `${l.char}. ${l.char} for ${w.word}` : l.char, { lang: lang.code, rate: 0.85 });
  };

  const markLearned = (stars = 1) => {
    if (!letter) return;
    complete('letter', { id: `${lang.code}:${letter.char}`, name: letter.char, stars, lang: lang.code });
  };

  if (!lang) return <TopBar title="No languages yet" />;

  return (
    <Page>
      <TopBar title={t('alphabet')} emoji="🔤" />
      <div className="pill-tabs">
        {languages.map((l) => (
          <button
            key={l.code}
            className={l.code === lang.code ? 'active' : ''}
            onClick={() => {
              setProfile({ learnLang: l.code });
              setGroupIdx(0);
              speak(l.nativeName, { lang: l.code });
            }}
          >
            {l.flag} {l.nativeName}
          </button>
        ))}
      </div>
      {lang.groups.length > 1 && (
        <div className="pill-tabs">
          {lang.groups.map((g, i) => (
            <button key={g.title} className={i === groupIdx ? 'active' : ''} onClick={() => setGroupIdx(i)}>
              {g.title}
            </button>
          ))}
        </div>
      )}

      <motion.div
        key={lang.code + groupIdx}
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.025 } } }}
      >
        {letters.map((l, i) => (
          <motion.button
            key={l.char + i}
            className="letter-tile"
            style={{ background: colorAt(i), position: 'relative' }}
            variants={{ hidden: { opacity: 0, scale: 0.3, rotate: -30 }, show: { opacity: 1, scale: 1, rotate: 0 } }}
            whileHover={{ scale: 1.12, rotate: [0, -6, 6, 0] }}
            whileTap={{ scale: 0.85 }}
            onClick={() => openLetter(i)}
          >
            {l.char}
            {learned(l.char) && <span style={{ position: 'absolute', top: 4, right: 8, fontSize: '1rem' }}>⭐</span>}
          </motion.button>
        ))}
      </motion.div>

      <Modal open={!!letter} onClose={() => setOpen(null)}>
        {letter && (
          <div className="center" style={{ gap: 12 }}>
            <div className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
              <button className="icon-btn" disabled={open === 0} onClick={() => openLetter(open - 1)} aria-label="Previous">
                ⬅️
              </button>
              <AnimatePresence mode="wait">
                <motion.button
                  key={letter.char}
                  className="big-letter"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: [0, 1.25, 1], rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.6 }}
                  onClick={() => speak(letter.char, { lang: lang.code, rate: 0.8 })}
                >
                  {letter.char}
                </motion.button>
              </AnimatePresence>
              <button className="icon-btn" disabled={open === letters.length - 1} onClick={() => openLetter(open + 1)} aria-label="Next">
                ➡️
              </button>
            </div>
            {letter.sound && <div className="chip">🗣️ sounds like “{letter.sound}”</div>}
            <div className="pill-tabs">
              <button className={tab === 'words' ? 'active' : ''} onClick={() => setTab('words')}>
                🍎 Words
              </button>
              <button className={tab === 'trace' ? 'active' : ''} onClick={() => setTab('trace')}>
                ✏️ Trace
              </button>
              <button className={tab === 'say' ? 'active' : ''} onClick={() => setTab('say')}>
                🎤 {t('sayIt')}
              </button>
            </div>

            {tab === 'words' && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', width: '100%' }}>
                {(letter.words || []).map((w, i) => (
                  <motion.button
                    key={w.word}
                    className="card center"
                    style={{ gap: 4 }}
                    initial={{ y: 30, opacity: 0, rotateY: 90 }}
                    animate={{ y: 0, opacity: 1, rotateY: 0 }}
                    transition={{ delay: 0.15 * i }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      speak(`${w.word}`, { lang: lang.code, rate: 0.8 });
                      if (!learned(letter.char)) markLearned(1);
                    }}
                  >
                    <motion.span style={{ fontSize: '4rem' }} animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.2 }}>
                      {w.emoji}
                    </motion.span>
                    <b style={{ fontSize: '1.6rem' }}>
                      <span style={{ color: theme.primary }}>{letter.char}</span>
                      {w.word.startsWith(letter.char) ? w.word.slice(letter.char.length) : ` · ${w.word}`}
                    </b>
                    {w.meaning && <span className="muted">{w.meaning}</span>}
                    <span className="chip">🔈 {t('listen')}</span>
                  </motion.button>
                ))}
              </div>
            )}
            {tab === 'trace' && <TraceCanvas char={letter.char} color={theme.primary} onDone={() => markLearned(2)} />}
            {tab === 'say' && (
              <SayIt
                word={letter.words?.[0]?.word || letter.char}
                lang={lang.code}
                onScore={(r) => r.stars >= 2 && markLearned(r.stars)}
              />
            )}
            <SpeakButton text={letter.char} lang={lang.code} label={`${t('listen')} “${letter.char}”`} className="btn ghost small" rate={0.7} />
          </div>
        )}
      </Modal>
    </Page>
  );
}
