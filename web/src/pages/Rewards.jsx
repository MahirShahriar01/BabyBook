import { motion } from 'framer-motion';
import { useApp } from '../store/AppContext.jsx';
import { Page, ProgressBar, TopBar } from '../components/ui.jsx';
import { levelFor } from '../lib/progress.js';
import { speak } from '../lib/speech.js';

const BADGES = [
  { id: 'letter', emoji: '🔤', name: 'Letter Learner', need: 10 },
  { id: 'story', emoji: '📖', name: 'Bookworm', need: 3 },
  { id: 'game', emoji: '🧠', name: 'Brain Champ', need: 5 },
  { id: 'explore', emoji: '🧭', name: 'Explorer', need: 20 },
  { id: 'buddy', emoji: '🗣️', name: 'Super Speaker', need: 10 },
  { id: 'quiz', emoji: '🎓', name: 'Quiz Whiz', need: 10 },
  { id: 'ailab', emoji: '🤖', name: 'Future Scientist', need: 3 },
];

export default function Rewards() {
  const { progress, settings, t } = useApp();
  const { level, inLevel, need } = levelFor(progress.stars);
  const counts = {};
  for (const [k, v] of Object.entries(progress.done)) {
    const kind = k.split(':')[0];
    counts[kind] = (counts[kind] || 0) + v;
  }
  const all = settings.rewards?.stickers || [];
  const owned = progress.stickers;

  return (
    <Page>
      <TopBar title={t('rewards')} emoji="🎁" />
      <div className="card center" style={{ gap: 8 }}>
        <motion.div style={{ fontSize: '4.5rem' }} animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}>
          🏆
        </motion.div>
        <h2>
          {t('level')} {level} · ⭐ {progress.stars}
        </h2>
        <div style={{ width: 'min(400px, 100%)' }}>
          <ProgressBar value={inLevel} max={need} />
        </div>
        <p className="muted">Every 5 stars = a new sticker!</p>
      </div>

      <h2 className="section-title">🌟 Sticker book ({owned.length})</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
        {all.map((s, i) => {
          const have = owned.filter((x) => x === s).length;
          return (
            <motion.button
              key={s + i}
              className="card center"
              style={{ fontSize: '2.8rem', padding: 10, filter: have ? 'none' : 'grayscale(1)', opacity: have ? 1 : 0.3 }}
              whileTap={{ scale: 1.3, rotate: 20 }}
              onClick={() => have && speak('Wow, a sticker!')}
            >
              {s}
              {have > 1 && <span style={{ fontSize: '0.8rem' }}>×{have}</span>}
            </motion.button>
          );
        })}
      </div>

      <h2 className="section-title">🏅 Badges</h2>
      <div className="grid auto">
        {BADGES.map((b) => {
          const n = counts[b.id] || 0;
          const got = n >= b.need;
          return (
            <div key={b.id} className="card center" style={{ gap: 6, opacity: got ? 1 : 0.75 }}>
              <div style={{ fontSize: '3rem', filter: got ? 'none' : 'grayscale(1)' }}>{b.emoji}</div>
              <b>{b.name}</b>
              <div style={{ width: '100%' }}>
                <ProgressBar value={n} max={b.need} />
              </div>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {Math.min(n, b.need)} / {b.need}
              </span>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
