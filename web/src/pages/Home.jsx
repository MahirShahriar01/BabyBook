import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { Page, ParentalGate, ProgressBar, StarChip, Tile } from '../components/ui.jsx';
import { levelFor } from '../lib/progress.js';
import { speak } from '../lib/speech.js';

export const MODULES = {
  alphabet: { emoji: '🔤', color: '#FF4FA3', to: '/alphabet', sub: 'ABC • অআ • ¡Hola!', anim: 'anim-wobble' },
  explore: { emoji: '🦁', color: '#FF8A3D', to: '/explore', sub: 'Animals • Planes • World', anim: 'anim-bounce' },
  stories: { emoji: '📖', color: '#1E90FF', to: '/stories', sub: 'Read & learn morals', anim: 'anim-float' },
  games: { emoji: '🧩', color: '#22B573', to: '/games', sub: 'Sudoku • Memory • Logic', anim: 'anim-wobble' },
  buddy: { emoji: '🤖', color: '#7C5CFF', to: '/buddy', sub: 'Talk & speak better', anim: 'anim-pulse' },
  quiz: { emoji: '❓', color: '#FF5D73', to: '/quiz', sub: 'General knowledge', anim: 'anim-bounce' },
  videos: { emoji: '📺', color: '#00C2A8', to: '/videos', sub: 'Safe cartoons', anim: 'anim-float' },
  ailab: { emoji: '🧪', color: '#3D2CFF', to: '/ai-lab', sub: 'How does AI think?', anim: 'anim-spin' },
};

export default function Home() {
  const { settings, profile, progress, t } = useApp();
  const nav = useNavigate();
  const [gate, setGate] = useState(false);
  const avatar = settings.avatars.find((a) => a.id === profile.avatar);
  const { level, inLevel, need } = levelFor(progress.stars);
  const order = (settings.homeOrder || Object.keys(MODULES)).filter((k) => MODULES[k] && settings.features?.[k] !== false);
  const missions = progress.daily?.missions || [];
  const hour = new Date().getHours();
  const hi = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Page>
      <div className="topbar">
        <motion.button
          className="icon-btn"
          style={{ fontSize: '2rem', width: 64, height: 64 }}
          whileTap={{ rotate: 20, scale: 0.9 }}
          onClick={() => speak(`${hi}, ${profile.name}!`, { lang: profile.uiLang })}
          aria-label="Say hello"
        >
          {avatar?.emoji || '🙂'}
        </motion.button>
        <div className="title">
          {profile.uiLang === 'bn' ? t('hello') : hi}, {profile.name}! 👋
        </div>
        <StarChip />
      </div>

      {settings.announcement && (
        <motion.div className="card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ marginBottom: 14, fontWeight: 700 }}>
          📣 {settings.announcement}
        </motion.div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>
              🏆 {t('level')} {level}
            </h3>
            <span className="chip">🔥 {progress.streak?.count || 0} day streak</span>
          </div>
          <p className="muted" style={{ margin: '6px 0' }}>
            {need - inLevel} more ⭐ to reach {t('level')} {level + 1}
          </p>
          <ProgressBar value={inLevel} max={need} />
        </div>
        {settings.features?.rewards !== false && missions.length > 0 && (
          <div className="card">
            <h3>🎯 {t('missions')}</h3>
            {missions.map((m) => (
              <button key={m.id} className="row" style={{ width: '100%', marginTop: 8, flexWrap: 'nowrap', textAlign: 'left' }} onClick={() => nav(m.to)}>
                <span style={{ fontSize: '1.6rem' }}>{m.count >= m.goal ? '✅' : m.emoji}</span>
                <span style={{ flex: 1, fontWeight: 700, textDecoration: m.count >= m.goal ? 'line-through' : 'none' }}>{m.text}</span>
                <span className="chip">
                  {m.count}/{m.goal}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <h2 className="section-title">🗺️ Adventure Map</h2>
      <div className="map">
        {order.map((key, i) => {
          const m = MODULES[key];
          return (
            <div key={key} className="level-node">
              <span className="level-badge">
                {t('level')} {i + 1}
              </span>
              <Tile emoji={m.emoji} label={t(key)} sub={m.sub} color={m.color} delay={i * 0.06} anim={m.anim} onClick={() => nav(m.to)} />
            </div>
          );
        })}
      </div>

      <div className="row" style={{ justifyContent: 'center', marginTop: 26 }}>
        {settings.features?.rewards !== false && (
          <button className="btn accent" onClick={() => nav('/rewards')}>
            🎁 {t('rewards')} ({progress.stickers.length})
          </button>
        )}
        {settings.features?.parents !== false && (
          <button className="btn ghost" onClick={() => setGate(true)}>
            👨‍👩‍👧 {t('parents')}
          </button>
        )}
      </div>
      <ParentalGate open={gate} onClose={() => setGate(false)} onPass={() => nav('/parents')} />
      <p className="footer-note">
        {settings.appName} · {settings.tagline}
      </p>
    </Page>
  );
}
