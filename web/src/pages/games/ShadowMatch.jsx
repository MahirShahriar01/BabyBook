import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, TopBar, shuffle } from '../../components/ui.jsx';
import { itemName } from '../../lib/localize.js';
import { speak } from '../../lib/speech.js';
import { sfx } from '../../lib/sound.js';

/** Match the picture to its shadow (visual discrimination). */
export default function ShadowMatch() {
  const { content, profile, complete, t } = useApp();
  const ui = profile.uiLang === 'bn' ? 'bn' : 'en';
  const pool = content.topics.filter((tp) => ['animals', 'birds', 'vehicles', 'fruits', 'sky', 'ships'].includes(tp.id)).flatMap((tp) => tp.items);
  const n = profile.age === '2-4' ? 3 : profile.age === '5-7' ? 4 : 6;
  const make = () => {
    const opts = shuffle(pool).slice(0, n);
    return { opts, target: opts[Math.floor(Math.random() * n)] };
  };
  const [r, setR] = useState(make);
  const [wrong, setWrong] = useState([]);
  const [found, setFound] = useState(false);
  const [score, setScore] = useState(0);

  const pick = (o) => {
    if (found) return;
    if (o.id === r.target.id) {
      sfx.success();
      setFound(true);
      speak(t('yesIt', { x: itemName(o, ui) }), { lang: ui });
      const s = score + 1;
      setScore(s);
      if (s % 3 === 0) complete('game', { id: 'shadow', name: 'Shadow match x3', stars: 2 });
      setTimeout(() => {
        setR(make());
        setWrong([]);
        setFound(false);
      }, 1400);
    } else {
      sfx.wrong();
      setWrong([...wrong, o.id]);
    }
  };

  return (
    <Page>
      <TopBar title={t('findShadow')} emoji="👤" back="/games" right={<span className="chip">✅ {score}</span>} />
      <div className="card center" style={{ gap: 16, padding: 22 }}>
        <motion.div key={r.target.id} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} style={{ fontSize: '6rem' }}>
          {r.target.emoji}
        </motion.div>
        <b>{itemName(r.target, ui)}</b>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${n > 4 ? 3 : n}, 1fr)`, width: 'min(560px, 100%)' }}>
          {r.opts.map((o) => (
            <motion.button
              key={o.id}
              className="card center"
              style={{ fontSize: '4rem', padding: 12, opacity: wrong.includes(o.id) ? 0.3 : 1 }}
              whileTap={{ scale: 0.88 }}
              animate={wrong.includes(o.id) ? { x: [0, -8, 8, 0] } : {}}
              onClick={() => pick(o)}
            >
              <span style={{ filter: found && o.id === r.target.id ? 'none' : 'brightness(0) opacity(0.75)', transition: 'filter .4s' }}>{o.emoji}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </Page>
  );
}
