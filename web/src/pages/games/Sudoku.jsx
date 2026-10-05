import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, TopBar } from '../../components/ui.jsx';
import { BOXES, conflicts, isSolved, puzzle } from '../../lib/sudoku.js';
import { sfx } from '../../lib/sound.js';
import { speak } from '../../lib/speech.js';

const ICONS = { 1: '🍎', 2: '⭐', 3: '🐟' };
const LEVELS = [
  { n: 3, holes: 4, label: '3×3 Icons', ages: '2-4' },
  { n: 4, holes: 7, label: '4×4 Numbers', ages: '5-7' },
  { n: 6, holes: 16, label: '6×6 Numbers', ages: '8-10' },
];

export default function Sudoku() {
  const { profile, complete } = useApp();
  const startLevel = Math.max(0, LEVELS.findIndex((l) => l.ages === profile.age));
  const [lv, setLv] = useState(startLevel);
  const [game, setGame] = useState(() => newGame(LEVELS[startLevel]));
  const [sel, setSel] = useState(null);
  const [won, setWon] = useState(false);
  const { n } = LEVELS[lv];
  const bad = conflicts(game.grid);
  const box = BOXES[n];
  const show = (v) => (v ? (n === 3 ? ICONS[v] : v) : '');

  function newGame(level) {
    const p = puzzle(level.n, level.holes);
    return { ...p, given: p.grid.map((r) => r.map(Boolean)) };
  }

  const restart = (i = lv) => {
    setLv(i);
    setGame(newGame(LEVELS[i]));
    setSel(null);
    setWon(false);
  };

  const put = (v) => {
    if (!sel || game.given[sel[0]][sel[1]] || won) return;
    sfx.tap();
    const grid = game.grid.map((r) => [...r]);
    grid[sel[0]][sel[1]] = v;
    setGame({ ...game, grid });
    if (isSolved(grid)) {
      setWon(true);
      complete('game', { id: 'sudoku', name: `Sudoku ${n}x${n}`, stars: n === 3 ? 2 : n === 4 ? 3 : 5 });
      speak('You solved the Sudoku! Amazing brain power!');
    }
  };

  const hint = () => {
    const empties = [];
    game.grid.forEach((r, ri) => r.forEach((v, ci) => !v && empties.push([ri, ci])));
    if (!empties.length) return;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    setSel([r, c]);
    speak(`Try ${n === 3 ? ['', 'apple', 'star', 'fish'][game.solution[r][c]] : game.solution[r][c]} here!`);
  };

  return (
    <Page>
      <TopBar title="Kids Sudoku" emoji="🔢" back="/games" />
      <div className="pill-tabs">
        {LEVELS.map((l, i) => (
          <button key={l.n} className={i === lv ? 'active' : ''} onClick={() => restart(i)}>
            {l.label}
          </button>
        ))}
      </div>
      <p className="center muted" style={{ marginTop: 0 }}>
        Every row{box ? ', column and box' : ' and column'} needs each {n === 3 ? 'picture' : 'number'} once!
      </p>
      <div className="sudoku" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {game.grid.map((row, r) =>
          row.map((v, c) => {
            const k = `${r},${c}`;
            const edgeR = box && (c + 1) % box[1] === 0 && c < n - 1;
            const edgeB = box && (r + 1) % box[0] === 0 && r < n - 1;
            return (
              <motion.button
                key={k}
                className={`cell ${game.given[r][c] ? 'given' : ''} ${sel && sel[0] === r && sel[1] === c ? 'sel' : ''} ${bad.has(k) ? 'bad' : ''}`}
                style={{ marginRight: edgeR ? 6 : 0, marginBottom: edgeB ? 6 : 0, fontSize: n === 3 ? 'clamp(2.4rem, 12vw, 4rem)' : undefined }}
                whileTap={{ scale: 0.88 }}
                animate={won ? { rotate: [0, 360], transition: { delay: (r + c) * 0.05 } } : {}}
                onClick={() => setSel([r, c])}
              >
                {show(v)}
              </motion.button>
            );
          }),
        )}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
        {[...Array(n).keys()].map((i) => (
          <button key={i} className="btn" style={{ minWidth: 64, fontSize: '1.6rem' }} onClick={() => put(i + 1)}>
            {show(i + 1)}
          </button>
        ))}
        <button className="btn ghost" onClick={() => put(0)}>
          🧽
        </button>
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
        <button className="btn ghost small" onClick={hint}>
          💡 Hint
        </button>
        <button className="btn ghost small" onClick={() => restart()}>
          🔁 New puzzle
        </button>
      </div>
      {won && (
        <motion.div className="card center" style={{ marginTop: 16 }} initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <h2>🎉 Solved! Brain power +{n === 3 ? 2 : n === 4 ? 3 : 5} ⭐</h2>
        </motion.div>
      )}
    </Page>
  );
}
