import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { Page, Tile, TopBar } from '../components/ui.jsx';

export const GAMES = [
  { id: 'sudoku', emoji: '🔢', title: 'Kids Sudoku', sub: '3×3 icons · 4×4 · 6×6', color: '#7C5CFF' },
  { id: 'memory', emoji: '🃏', title: 'Memory Match', sub: 'Flip & find pairs', color: '#FF4FA3' },
  { id: 'pattern', emoji: '🔺', title: 'What comes next?', sub: 'Patterns & logic', color: '#22B573' },
  { id: 'math', emoji: '➕', title: 'Number Pop', sub: 'Count & add', color: '#FF8A3D' },
  { id: 'odd', emoji: '🕵️', title: 'Odd One Out', sub: 'Spot the different one', color: '#1E90FF' },
];

export default function Games() {
  const { t, progress } = useApp();
  const nav = useNavigate();
  return (
    <Page>
      <TopBar title={t('games')} emoji="🧩" />
      <div className="grid auto">
        {GAMES.map((g, i) => (
          <Tile
            key={g.id}
            emoji={g.emoji}
            label={g.title}
            sub={`${g.sub}${progress.done[`game:${g.id}`] ? ` · 🏅×${progress.done[`game:${g.id}`]}` : ''}`}
            color={g.color}
            delay={i * 0.06}
            anim="anim-wobble"
            onClick={() => nav(`/games/${g.id}`)}
          />
        ))}
      </div>
    </Page>
  );
}
