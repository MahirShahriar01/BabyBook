import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { Page, Tile, TopBar } from '../components/ui.jsx';

export const GAMES = [
  { id: 'sudoku', emoji: '🔢', title: 'Kids Sudoku', bn: 'শিশুদের সুডোকু', sub: '3×3 icons · 4×4 · 6×6', subBn: 'ছবি ও সংখ্যার ধাঁধা', color: '#7C5CFF' },
  { id: 'memory', emoji: '🃏', title: 'Memory Match', bn: 'জোড়া মেলাও', sub: 'Flip & find pairs', subBn: 'কার্ড উল্টে জোড়া খোঁজো', color: '#FF4FA3' },
  { id: 'words', emoji: '🔡', title: 'Word Builder', bn: 'শব্দ বানাও', sub: 'Spell with letters', subBn: 'বর্ণ দিয়ে শব্দ গড়ো', color: '#FF8A3D' },
  { id: 'letters', emoji: '🎈', title: 'Letter Pop', bn: 'বর্ণ বেলুন', sub: 'Listen & pop', subBn: 'শোনো আর ফাটাও', color: '#1E90FF' },
  { id: 'pattern', emoji: '🔺', title: 'What comes next?', bn: 'এরপর কোনটা?', sub: 'Patterns & logic', subBn: 'নকশা ও যুক্তি', color: '#22B573' },
  { id: 'math', emoji: '➕', title: 'Number Pop', bn: 'সংখ্যার বেলুন', sub: 'Count & add', subBn: 'গোনো ও যোগ করো', color: '#FF5D73' },
  { id: 'compare', emoji: '⚖️', title: 'More or Less', bn: 'বেশি না কম?', sub: 'Compare amounts', subBn: 'তুলনা করো', color: '#00C2A8' },
  { id: 'shadow', emoji: '👤', title: 'Shadow Match', bn: 'ছায়া মেলাও', sub: 'Find the shadow', subBn: 'ঠিক ছায়াটা খোঁজো', color: '#3D2CFF' },
  { id: 'odd', emoji: '🕵️', title: 'Odd One Out', bn: 'কোনটা আলাদা?', sub: 'Spot the different one', subBn: 'আলাদাটা খুঁজে বের করো', color: '#9B5CFF' },
  { id: 'tictactoe', emoji: '❌', title: 'Tic-Tac-Toe vs Robot', bn: 'রোবটের সাথে টিক-ট্যাক-টো', sub: 'Beat the AI!', subBn: 'এআই-কে হারাও!', color: '#FFB23F' },
];

export default function Games() {
  const { t, progress, profile } = useApp();
  const bn = profile.uiLang === 'bn';
  const nav = useNavigate();
  return (
    <Page>
      <TopBar title={t('games')} emoji="🧩" />
      <div className="grid auto">
        {GAMES.map((g, i) => (
          <Tile
            key={g.id}
            emoji={g.emoji}
            label={bn ? g.bn : g.title}
            sub={`${bn ? g.subBn : g.sub}${progress.done[`game:${g.id}`] ? ` · 🏅×${progress.done[`game:${g.id}`]}` : ''}`}
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
