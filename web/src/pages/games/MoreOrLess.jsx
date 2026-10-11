import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, TopBar } from '../../components/ui.jsx';
import { localDigits } from '../../lib/i18n.js';
import { makeCompare } from '../../lib/games.js';
import { speak } from '../../lib/speech.js';
import { sfx } from '../../lib/sound.js';

export default function MoreOrLess() {
  const { profile, complete, t } = useApp();
  const ui = profile.uiLang;
  const [q, setQ] = useState(() => makeCompare(profile.age));
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const prompt = q.useNumbers ? t(q.askMore ? 'biggerNumber' : 'smallerNumber') : t(q.askMore ? 'whichMore' : 'whichLess');

  const choose = (side) => {
    if (picked != null) return;
    setPicked(side);
    if (side === q.answer) {
      sfx.success();
      speak(t('correct'), { lang: ui });
      const s = score + 1;
      setScore(s);
      if (s % 5 === 0) complete('game', { id: 'more-less', name: 'More or less x5', stars: 3 });
    } else {
      sfx.wrong();
    }
    setTimeout(() => {
      setPicked(null);
      setQ(makeCompare(profile.age));
    }, 1300);
  };

  const side = (n, i) => (
    <motion.button
      key={i}
      className="card center"
      style={{ minHeight: 200, gap: 6, outline: picked != null && i === q.answer ? '5px solid var(--ok)' : picked === i ? '5px solid var(--bad)' : 'none' }}
      whileTap={{ scale: 0.92 }}
      onClick={() => choose(i)}
    >
      {q.useNumbers ? (
        <span style={{ fontSize: '4.5rem', fontWeight: 800 }}>{localDigits(n, ui)}</span>
      ) : (
        <div className="row" style={{ justifyContent: 'center', fontSize: '2.2rem', gap: 2, maxWidth: 220 }}>
          {Array.from({ length: n }, (_, k) => (
            <motion.span key={k} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: k * 0.06 }}>
              {q.thing}
            </motion.span>
          ))}
        </div>
      )}
      {picked != null && !q.useNumbers && <b>{localDigits(n, ui)}</b>}
    </motion.button>
  );

  return (
    <Page>
      <TopBar title={t('moreLess')} emoji="⚖️" back="/games" right={<span className="chip">✅ {score}</span>} />
      <div className="card center" style={{ gap: 14, padding: 22 }}>
        <h2>{prompt}</h2>
        <button className="btn ghost small" onClick={() => speak(prompt, { lang: ui })}>
          🔈 {t('hearAgain')}
        </button>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', width: 'min(620px, 100%)' }}>
          {side(q.a, 0)}
          {side(q.b, 1)}
        </div>
      </div>
    </Page>
  );
}
