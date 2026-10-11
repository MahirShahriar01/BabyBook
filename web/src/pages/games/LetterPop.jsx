import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, ProgressBar, TopBar, VoiceHint, shuffle } from '../../components/ui.jsx';
import { speak } from '../../lib/speech.js';
import { sfx } from '../../lib/sound.js';

const COLORS = ['#FF4FA3', '#1E90FF', '#22B573', '#FF8A3D', '#9B5CFF', '#FFC93C'];
const ROUNDS = 6;

/** Listen to a letter and pop the matching balloon. */
export default function LetterPop() {
  const { content, profile, complete, t } = useApp();
  const language = content.languages.find((l) => l.code === profile.learnLang) || content.languages[0];
  const letters = useMemo(() => language.groups.flatMap((g) => g.letters), [language]);
  const count = profile.age === '2-4' ? 3 : profile.age === '5-7' ? 4 : 6;
  const [n, setN] = useState(0);
  const [round, setRound] = useState(null);
  const [wrong, setWrong] = useState(null);

  const say = (l) => speak(t('popLetter', { x: l.name || l.char }), { lang: language.code });

  const next = () => {
    const opts = shuffle(letters).slice(0, count);
    const target = opts[Math.floor(Math.random() * opts.length)];
    setRound({ opts, target, popped: null, key: Math.random() });
    say(target);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => next(), [language.code]);

  const pop = (l) => {
    if (!round || round.popped) return;
    if (l.char === round.target.char) {
      sfx.success();
      setRound({ ...round, popped: l.char });
      const k = n + 1;
      setN(k);
      if (k === ROUNDS) complete('game', { id: 'letter-pop', name: 'Letter pop', stars: 3, lang: language.code });
      else setTimeout(next, 900);
    } else {
      sfx.wrong();
      setWrong(l.char);
      setTimeout(() => setWrong(null), 500);
      say(round.target);
    }
  };

  return (
    <Page>
      <TopBar title={t('letterPop')} emoji="🎈" back="/games" />
      <VoiceHint lang={language.code} />
      <div className="card center" style={{ gap: 12, padding: 18 }}>
        <ProgressBar value={n} max={ROUNDS} />
        <span className="chip">{t('popped', { n, t: ROUNDS })}</span>
        {n < ROUNDS && round && (
          <button className="btn" onClick={() => say(round.target)}>
            🔊 {t('hearAgain')}
          </button>
        )}
        <div style={{ position: 'relative', height: 360, width: '100%', overflow: 'hidden' }} lang={language.code}>
          <AnimatePresence>
            {n < ROUNDS &&
              round?.opts.map((l, i) =>
                round.popped === l.char ? (
                  <motion.div key={l.char + round.key} initial={{ scale: 1 }} animate={{ scale: 2, opacity: 0 }} style={{ position: 'absolute', left: `${(i / count) * 90 + 3}%`, top: 120, fontSize: '3rem' }}>
                    💥
                  </motion.div>
                ) : (
                  <motion.button
                    key={l.char + round.key}
                    onClick={() => pop(l)}
                    initial={{ y: 380 }}
                    animate={wrong === l.char ? { x: [0, -10, 10, 0] } : { y: [300, 40 + (i % 2) * 60, 300] }}
                    transition={{ duration: 7 + i, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      left: `${(i / count) * 90 + 3}%`,
                      width: 78,
                      height: 94,
                      borderRadius: '50% 50% 46% 46%',
                      background: COLORS[i % COLORS.length],
                      color: '#fff',
                      fontSize: '2.2rem',
                      fontWeight: 800,
                      boxShadow: 'inset -8px -10px 0 rgba(0,0,0,.12)',
                    }}
                  >
                    {l.char}
                  </motion.button>
                ),
              )}
          </AnimatePresence>
          {n >= ROUNDS && (
            <div className="center" style={{ height: '100%', gap: 12 }}>
              <div style={{ fontSize: '5rem' }}>🏆</div>
              <button
                className="btn big"
                onClick={() => {
                  setN(0);
                  next();
                }}
              >
                🔁 {t('playAgain')}
              </button>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
