import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, TopBar } from '../../components/ui.jsx';
import { robotMove, winner } from '../../lib/games.js';
import { speak } from '../../lib/speech.js';
import { sfx } from '../../lib/sound.js';

const SKILL = { '2-4': 0.25, '5-7': 0.6, '8-10': 0.9 };
const MARK = { X: '⭐', O: '🤖' };

/** Tic-tac-toe against an AI robot that "thinks ahead" (minimax), tuned by age. */
export default function TicTacToe() {
  const { profile, complete, t } = useApp();
  const ui = profile.uiLang;
  const [board, setBoard] = useState(Array(9).fill(null));
  const [thinking, setThinking] = useState(false);
  const [tally, setTally] = useState({ win: 0, lose: 0, draw: 0 });
  const result = winner(board);

  const finish = (w) => {
    if (w.who === 'X') {
      sfx.success();
      speak(t('tttWin'), { lang: ui });
      complete('game', { id: 'tictactoe', name: 'Beat the robot', stars: 3 });
      setTally((x) => ({ ...x, win: x.win + 1 }));
    } else if (w.who === 'O') {
      speak(t('tttLose'), { lang: ui });
      setTally((x) => ({ ...x, lose: x.lose + 1 }));
    } else {
      speak(t('tttDraw'), { lang: ui });
      complete('game', { id: 'tictactoe', name: 'Tie with robot', stars: 1, celebrate: false });
      setTally((x) => ({ ...x, draw: x.draw + 1 }));
    }
  };

  const play = (i) => {
    if (board[i] || result || thinking) return;
    sfx.tap();
    const b = [...board];
    b[i] = 'X';
    setBoard(b);
    const w = winner(b);
    if (w) return finish(w);
    setThinking(true);
    setTimeout(() => {
      const j = robotMove(b, SKILL[profile.age] ?? 0.6);
      const b2 = [...b];
      b2[j] = 'O';
      setBoard(b2);
      setThinking(false);
      const w2 = winner(b2);
      if (w2) finish(w2);
    }, 700);
  };

  return (
    <Page>
      <TopBar title={t('ticTacToe')} emoji="❌" back="/games" right={<span className="chip">⭐ {tally.win} · 🤖 {tally.lose} · 🤝 {tally.draw}</span>} />
      <div className="card center" style={{ gap: 14, padding: 22 }}>
        <b style={{ fontSize: '1.3rem' }}>
          {result ? (result.who === 'X' ? t('tttWin') : result.who === 'O' ? t('tttLose') : t('tttDraw')) : thinking ? t('tttThinking') : t('tttYou')}
        </b>
        <div className="sudoku" style={{ gridTemplateColumns: 'repeat(3, 1fr)', width: 'min(360px, 100%)' }}>
          {board.map((v, i) => (
            <motion.button
              key={i}
              className={`cell ${result?.line.includes(i) ? 'given' : ''}`}
              style={{ fontSize: '3rem' }}
              whileTap={{ scale: 0.9 }}
              animate={v ? { scale: [0.3, 1.15, 1] } : {}}
              onClick={() => play(i)}
            >
              {v ? MARK[v] : ''}
            </motion.button>
          ))}
        </div>
        {result && (
          <button className="btn big" onClick={() => setBoard(Array(9).fill(null))}>
            🔁 {t('playAgain')}
          </button>
        )}
        <p className="muted" style={{ maxWidth: 480, fontSize: '0.95rem' }}>
          🤖 {ui === 'bn' ? 'রোবট সামনের চালগুলো ভেবে দেখে — এটাই এআই-এর মতো চিন্তা!' : 'The robot imagines the next moves before it plays — that is how game AI thinks!'}
        </p>
      </div>
    </Page>
  );
}
