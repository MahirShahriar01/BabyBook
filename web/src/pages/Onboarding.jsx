import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useApp } from '../store/AppContext.jsx';
import { Mascot, ProgressBar } from '../components/ui.jsx';
import { recommendedThemeId } from '../lib/theme.js';
import { speak } from '../lib/speech.js';
import { sfx } from '../lib/sound.js';
import { UI_LANGS } from '../lib/i18n.js';
import { track } from '../lib/analytics.js';

const slide = {
  initial: { x: 120, opacity: 0, rotate: 3 },
  animate: { x: 0, opacity: 1, rotate: 0 },
  exit: { x: -120, opacity: 0, rotate: -3 },
  transition: { type: 'spring', stiffness: 220, damping: 22 },
};

/** Four "levels": name -> age -> hero (gender) -> theme. */
export default function Onboarding() {
  const { settings, profile, setProfile, t } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(profile.name || '');
  const uiLang = profile.uiLang || 'en';
  const say = (line) => speak(line, { lang: uiLang, pitch: 1.3 });

  const go = (n, line) => {
    sfx.pop();
    setStep(n);
    if (line) say(line);
  };

  const finish = (themeId) => {
    setProfile({ themeId, done: true });
    track('onboarding_complete', { name: themeId });
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
    sfx.success();
    say(`${t('letsGo')} ${profile.name}!`);
    setTimeout(() => nav('/'), 900);
  };

  const themes = settings.themes || [];
  const recommended = recommendedThemeId(settings, profile.gender);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', paddingTop: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="chip">✨ {settings.appName}</div>
        <div className="row" style={{ gap: 6 }}>
          {UI_LANGS.map((l) => (
            <button key={l.code} className={`btn small ${uiLang === l.code ? '' : 'ghost'}`} onClick={() => setProfile({ uiLang: l.code, learnLang: l.code })}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <b>{t('step', { n: step })}</b>
          <span>{'⭐'.repeat(step)}{'☆'.repeat(4 - step)}</span>
        </div>
        <ProgressBar value={step} max={4} />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" {...slide} className="card center" style={{ gap: 20, padding: 28 }}>
            <Mascot emoji="🤖" line={t('askName')} lang={uiLang} />
            <input
              className="field"
              autoFocus
              maxLength={20}
              value={name}
              placeholder={t('namePlaceholder')}
              onChange={(e) => setName(e.target.value.replace(/[<>]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && document.getElementById('kea-next1')?.click()}
              aria-label="Your name"
            />
            <AnimatePresence>
              {name.trim() && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: '2.2rem', fontWeight: 800 }}>
                  👋 {t('hello')} {name.trim()}!
                </motion.div>
              )}
            </AnimatePresence>
            <button
              id="kea-next1"
              className="btn big"
              disabled={!name.trim()}
              onClick={() => {
                setProfile({ name: name.trim() });
                go(2, t('askAge', { name: name.trim() }));
              }}
            >
              {t('next')} ➡️
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" {...slide} className="card center" style={{ gap: 20, padding: 28 }}>
            <Mascot emoji="🎂" line={t('askAge', { name: profile.name })} lang={uiLang} />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', width: '100%' }}>
              {settings.ageGroups.map((g, i) => (
                <motion.button
                  key={g.id}
                  className="tile"
                  style={{ background: ['#FF8A3D', '#22B573', '#7C5CFF'][i % 3], outline: profile.age === g.id ? '5px solid var(--accent)' : 'none' }}
                  whileHover={{ scale: 1.06, rotate: -2 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ y: { duration: 2, repeat: Infinity, delay: i * 0.3 } }}
                  onClick={() => {
                    setProfile({ age: g.id });
                    go(3, t('askHero'));
                  }}
                >
                  <span className="emoji">🎈{g.emoji}</span>
                  <span style={{ fontSize: '2rem' }}>{g.range}</span>
                  <span style={{ fontSize: '0.95rem' }}>{g.label}</span>
                </motion.button>
              ))}
            </div>
            <button className="btn ghost small" onClick={() => go(1)}>
              ⬅️ {t('back')}
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" {...slide} className="card center" style={{ gap: 20, padding: 28 }}>
            <Mascot emoji="🦸" line={t('askHero')} lang={uiLang} />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', width: '100%' }}>
              {settings.avatars.map((a, i) => (
                <motion.button
                  key={a.id}
                  className="tile"
                  style={{ background: ['#1E90FF', '#FF4FA3', '#FF5D73', '#00C2A8', '#3D2CFF', '#9B5CFF'][i % 6], minHeight: 130 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9, rotate: 8 }}
                  onClick={() => {
                    setProfile({ avatar: a.id, gender: a.gender });
                    go(4, t('askTheme'));
                  }}
                >
                  <span className="emoji">{a.emoji}</span>
                  <span>{a.name}</span>
                </motion.button>
              ))}
            </div>
            <button className="btn ghost small" onClick={() => go(2)}>
              ⬅️ {t('back')}
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="s4" {...slide} className="card center" style={{ gap: 20, padding: 28 }}>
            <Mascot emoji="🎨" line={t('askTheme')} lang={uiLang} />
            {settings.themeMode === 'forced' && <p className="muted">Your grown-ups picked a special theme for everyone ✨</p>}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', width: '100%' }}>
              {themes.map((th) => (
                <motion.button
                  key={th.id}
                  className="tile"
                  style={{ background: `linear-gradient(135deg, ${th.primary}, ${th.secondary})`, minHeight: 140, color: '#fff' }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.9 }}
                  onMouseEnter={() => setProfile({ themeId: th.id })}
                  onClick={() => finish(th.id)}
                >
                  {th.id === recommended && <span className="level-badge">★ for you</span>}
                  <span className="emoji">{th.emoji}</span>
                  <span>{th.name}</span>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {[th.primary, th.secondary, th.accent].map((c) => (
                      <i key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c, border: '2px solid #fff' }} />
                    ))}
                  </span>
                </motion.button>
              ))}
            </div>
            <button className="btn ghost small" onClick={() => go(3)}>
              ⬅️ {t('back')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="footer-note">No sign-up. No account. Everything stays on this device. 💖</p>
    </div>
  );
}
