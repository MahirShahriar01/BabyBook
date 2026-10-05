import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, TopBar, shuffle } from '../../components/ui.jsx';
import { sfx } from '../../lib/sound.js';
import { speak } from '../../lib/speech.js';

const THINGS = ['🍎', '🎈', '🐥', '⭐', '🍓', '🐟', '🚗', '🍪'];

/** Toddlers count objects; older kids add / subtract / multiply. */
export function makeProblem(age, rnd = Math.random) {
  const r = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const thing = THINGS[r(0, THINGS.length - 1)];
  let text;
  let answer;
  let a = 0;
  let b = 0;
  if (age === '2-4') {
    answer = r(1, 6);
    a = answer;
    text = 'How many?';
  } else if (age === '8-10') {
    const x = r(2, 10);
    const y = r(2, 10);
    const problems = [
      [r(10, 50) + x, x * 3, (m, n) => m + n, '+'],
      [r(20, 60), r(1, 19), (m, n) => m - n, '−'],
      [x, y, (m, n) => m * n, '×'],
    ];
    const [m, n, fn, sign] = problems[r(0, 2)];
    answer = fn(m, n);
    text = `${m} ${sign} ${n} = ?`;
  } else {
    a = r(1, 5);
    b = r(1, 4);
    answer = a + b;
    text = `${a} + ${b} = ?`;
  }
  const opts = new Set([answer]);
  while (opts.size < 3) opts.add(Math.max(0, answer + r(-3, 3)));
  return { text, answer, a, b, thing, options: shuffle([...opts]) };
}

export default function MathPop() {
  const { profile, complete } = useApp();
  const [p, setP] = useState(() => makeProblem(profile.age));
  const [score, setScore] = useState(0);
  const [popped, setPopped] = useState(null);

  const choose = (o) => {
    if (popped != null) return;
    setPopped(o);
    if (o === p.answer) {
      sfx.success();
      speak(`${o}! Correct!`);
      const s = score + 1;
      setScore(s);
      if (s % 5 === 0) complete('game', { id: 'math', name: 'Number Pop x5', stars: 3 });
      else sfx.star();
    } else {
      sfx.wrong();
      speak(`Oops. The answer is ${p.answer}.`);
    }
    setTimeout(() => {
      setPopped(null);
      setP(makeProblem(profile.age));
    }, 1300);
  };

  return (
    <Page>
      <TopBar title="Number Pop" emoji="➕" back="/games" right={<span className="chip">✅ {score}</span>} />
      <div className="card center" style={{ gap: 18, padding: 24 }}>
        {(p.a > 0 || p.b > 0) && (
          <div className="row" style={{ justifyContent: 'center', fontSize: '2.4rem', gap: 4 }}>
            {Array.from({ length: p.a }, (_, i) => (
              <motion.span key={`a${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
                {p.thing}
              </motion.span>
            ))}
            {p.b > 0 && <b style={{ margin: '0 10px' }}>+</b>}
            {Array.from({ length: p.b }, (_, i) => (
              <motion.span key={`b${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: (p.a + i) * 0.1 }}>
                {p.thing}
              </motion.span>
            ))}
          </div>
        )}
        <h2 style={{ fontSize: '2.6rem' }}>{p.text}</h2>
        <div className="row" style={{ justifyContent: 'center', gap: 20 }}>
          {p.options.map((o, i) => (
            <motion.button
              key={o}
              onClick={() => choose(o)}
              style={{
                width: 110,
                height: 130,
                borderRadius: '50% 50% 48% 48%',
                background: ['#FF4FA3', '#1E90FF', '#22B573'][i],
                color: '#fff',
                fontSize: '2.4rem',
                fontWeight: 800,
                boxShadow: 'inset -10px -10px 0 rgba(0,0,0,.12)',
              }}
              animate={popped === o ? { scale: [1, 1.4, 0], opacity: [1, 1, 0] } : { y: [0, -14, 0] }}
              transition={popped === o ? { duration: 0.5 } : { repeat: Infinity, duration: 2 + i * 0.3 }}
            >
              {o}
            </motion.button>
          ))}
        </div>
        <p className="muted">Pop the balloon with the right answer! 🎈</p>
      </div>
    </Page>
  );
}
