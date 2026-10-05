import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../store/AppContext.jsx';
import { Page, ProgressBar, TopBar, shuffle } from '../components/ui.jsx';
import { speak } from '../lib/speech.js';
import { sfx } from '../lib/sound.js';

const ROUND = 5;

export default function Quiz() {
  const { content, profile, complete, t } = useApp();
  const [seed, setSeed] = useState(0);
  const questions = useMemo(() => {
    const pool = (content.quiz || []).filter((q) => q.published !== false && (!profile.age || !q.ageGroups?.length || q.ageGroups.includes(profile.age)));
    return shuffle(pool.length ? pool : content.quiz || []).slice(0, ROUND);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.quiz, profile.age, seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const q = questions[i];

  const choose = (k) => {
    if (picked != null) return;
    setPicked(k);
    const ok = k === q.answer;
    if (ok) {
      sfx.star();
      setScore((s) => s + 1);
      complete('quiz', { id: q.id || q.q.slice(0, 40), name: q.q, celebrate: false });
      speak('Correct!');
    } else {
      sfx.wrong();
      speak(`The answer is ${q.options[q.answer]}`);
    }
    setTimeout(() => {
      setPicked(null);
      setI((n) => n + 1);
    }, 1500);
  };

  if (!questions.length) return <TopBar title="No questions yet" />;

  return (
    <Page>
      <TopBar title={t('quiz')} emoji="❓" />
      {q ? (
        <motion.div key={i} className="card center" style={{ gap: 16, padding: 26 }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div style={{ width: '100%' }}>
            <ProgressBar value={i} max={questions.length} />
          </div>
          <motion.div style={{ fontSize: '5rem' }} animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
            {q.emoji || '❓'}
          </motion.div>
          <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>{q.q}</h2>
          <button className="btn ghost small" onClick={() => speak(q.q)}>
            🔈 {t('listen')}
          </button>
          <div className="grid" style={{ width: '100%', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            {q.options.map((o, k) => (
              <motion.button
                key={o}
                className="btn big"
                whileTap={{ scale: 0.9 }}
                animate={picked === k && k !== q.answer ? { x: [0, -10, 10, -10, 0] } : {}}
                style={{ background: picked == null ? undefined : k === q.answer ? 'var(--ok)' : picked === k ? 'var(--bad)' : undefined }}
                onClick={() => choose(k)}
              >
                {o}
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div className="card center" style={{ gap: 14, padding: 30 }} initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <div style={{ fontSize: '5rem' }}>{score >= questions.length - 1 ? '🏆' : '🌟'}</div>
          <h2>
            {score} / {questions.length} correct!
          </h2>
          <div style={{ fontSize: '2rem' }}>{'⭐'.repeat(score)}</div>
          <button
            className="btn big"
            onClick={() => {
              if (score) complete('game', { id: 'quiz-round', name: 'Quiz round', stars: 1 });
              setI(0);
              setScore(0);
              setSeed((s) => s + 1);
            }}
          >
            🔁 Play again
          </button>
        </motion.div>
      )}
    </Page>
  );
}
