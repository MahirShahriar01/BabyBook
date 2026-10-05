import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, TopBar, shuffle } from '../../components/ui.jsx';
import { sfx } from '../../lib/sound.js';
import { speak } from '../../lib/speech.js';

const SETS = {
  Animals: ['🐶', '🐱', '🦁', '🐼', '🐸', '🐵', '🦊', '🐯'],
  Fruits: ['🍎', '🍌', '🍇', '🍓', '🍉', '🍍', '🥭', '🍒'],
  Space: ['🚀', '🪐', '🌙', '⭐', '☄️', '🛸', '🌍', '👽'],
  Vehicles: ['🚗', '🚌', '🚂', '✈️', '🚁', '🚢', '🚲', '🚒'],
};
const SIZES = { '2-4': 3, '5-7': 6, '8-10': 8 };

export default function Memory() {
  const { profile, complete } = useApp();
  const [set, setSet] = useState('Animals');
  const pairs = SIZES[profile.age] || 6;
  const [deck, setDeck] = useState([]);
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);

  const deal = (s = set) => {
    const pick = shuffle(SETS[s]).slice(0, pairs);
    setDeck(shuffle([...pick, ...pick].map((e, i) => ({ e, i }))));
    setOpen([]);
    setMatched([]);
    setMoves(0);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => deal(), []);

  const flip = (k) => {
    if (open.length === 2 || open.includes(k) || matched.includes(deck[k].e)) return;
    sfx.flip();
    const next = [...open, k];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a].e === deck[b].e) {
        setTimeout(() => {
          sfx.star();
          const m = [...matched, deck[a].e];
          setMatched(m);
          setOpen([]);
          if (m.length === pairs) {
            complete('game', { id: 'memory', name: `Memory ${set}`, stars: pairs >= 6 ? 3 : 2 });
            speak('You found all the pairs! Super memory!');
          }
        }, 450);
      } else setTimeout(() => setOpen([]), 900);
    }
  };

  const cols = pairs <= 3 ? 3 : 4;
  return (
    <Page>
      <TopBar title="Memory Match" emoji="🃏" back="/games" right={<span className="chip">👆 {moves}</span>} />
      <div className="pill-tabs">
        {Object.keys(SETS).map((s) => (
          <button
            key={s}
            className={s === set ? 'active' : ''}
            onClick={() => {
              setSet(s);
              deal(s);
            }}
          >
            {SETS[s][0]} {s}
          </button>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: 560, margin: '0 auto' }}>
        {deck.map((c, k) => {
          const isOpen = open.includes(k) || matched.includes(c.e);
          return (
            <motion.button
              key={c.i + set}
              className={`memory-card ${isOpen ? 'open' : ''}`}
              initial={{ scale: 0 }}
              animate={{ scale: matched.includes(c.e) ? [1, 1.12, 1] : 1 }}
              transition={{ delay: k * 0.03 }}
              onClick={() => flip(k)}
              aria-label={isOpen ? c.e : 'hidden card'}
            >
              <div className="memory-inner">
                <div className="memory-face front">❔</div>
                <div className="memory-face back">{c.e}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
      {matched.length === pairs && pairs > 0 && (
        <motion.div className="card center" style={{ marginTop: 16, gap: 10 }} initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <h2>🎉 All pairs in {moves} moves!</h2>
          <button className="btn" onClick={() => deal()}>
            🔁 Play again
          </button>
        </motion.div>
      )}
    </Page>
  );
}
