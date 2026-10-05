import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, TopBar, shuffle } from '../../components/ui.jsx';
import { sfx } from '../../lib/sound.js';
import { speak } from '../../lib/speech.js';

const ICONS = ['🔴', '🔵', '🟡', '🟢', '🟣', '⭐', '🔺', '🟧', '❤️', '🌙'];

/** Build a sequence from a repeating unit (AB, AAB, ABC, ABB ...) or a growing number pattern. */
export function makePattern(age, rnd = Math.random) {
  const units = age === '2-4' ? ['AB', 'AAB'] : age === '5-7' ? ['AB', 'ABC', 'AAB', 'ABB'] : ['ABC', 'AABB', 'ABCD', 'NUM'];
  const unit = units[Math.floor(rnd() * units.length)];
  if (unit === 'NUM') {
    const start = 1 + Math.floor(rnd() * 5);
    const step = 2 + Math.floor(rnd() * 4);
    const seq = Array.from({ length: 5 }, (_, i) => String(start + step * i));
    const answer = String(start + step * 5);
    const options = shuffle([answer, String(start + step * 5 + 1), String(start + step * 4 + 1)]);
    return { seq, answer, options };
  }
  const letters = [...new Set(unit)];
  const icons = shuffle(ICONS).slice(0, letters.length);
  const map = Object.fromEntries(letters.map((l, i) => [l, icons[i]]));
  const full = Array.from({ length: unit.length * 3 }, (_, i) => map[unit[i % unit.length]]);
  const cut = unit.length * 2 + Math.floor(rnd() * unit.length);
  const seq = full.slice(0, cut);
  const answer = full[cut];
  const distract = shuffle(ICONS.filter((x) => x !== answer)).slice(0, 2);
  return { seq, answer, options: shuffle([answer, ...distract]) };
}

export default function Pattern() {
  const { profile, complete } = useApp();
  const [p, setP] = useState(() => makePattern(profile.age));
  const [streak, setStreak] = useState(0);
  const [wrong, setWrong] = useState(null);
  const [ok, setOk] = useState(false);

  const choose = (o) => {
    if (ok) return;
    if (o === p.answer) {
      setOk(true);
      sfx.star();
      const s = streak + 1;
      setStreak(s);
      if (s % 3 === 0) complete('game', { id: 'pattern', name: 'Pattern x3', stars: 2 });
      setTimeout(() => {
        setP(makePattern(profile.age));
        setOk(false);
        setWrong(null);
      }, 1200);
    } else {
      sfx.wrong();
      setWrong(o);
      speak('Look again. What repeats?');
    }
  };

  return (
    <Page>
      <TopBar title="What comes next?" emoji="🔺" back="/games" right={<span className="chip">🔥 {streak}</span>} />
      <div className="card center" style={{ gap: 20, padding: 24 }}>
        <div className="row" style={{ justifyContent: 'center', fontSize: 'clamp(1.8rem, 6vw, 3rem)', gap: 8 }}>
          {p.seq.map((x, i) => (
            <motion.span key={i + x + p.answer} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}>
              {x}
            </motion.span>
          ))}
          <motion.span
            className="chip"
            style={{ fontSize: 'inherit', minWidth: 70, justifyContent: 'center' }}
            animate={ok ? { scale: [1, 1.4, 1] } : { scale: [1, 1.1, 1] }}
            transition={{ repeat: ok ? 0 : Infinity, duration: 1 }}
          >
            {ok ? p.answer : '❔'}
          </motion.span>
        </div>
        <p className="muted">Drag or tap the one that comes next</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {p.options.map((o) => (
            <motion.button
              key={o}
              className="card"
              style={{ fontSize: '3rem', padding: '10px 22px', opacity: wrong === o ? 0.4 : 1 }}
              drag
              dragSnapToOrigin
              onDragEnd={(_, info) => info.offset.y < -60 && choose(o)}
              whileTap={{ scale: 0.9 }}
              animate={wrong === o ? { x: [0, -8, 8, 0] } : {}}
              onClick={() => choose(o)}
            >
              {o}
            </motion.button>
          ))}
        </div>
      </div>
    </Page>
  );
}
