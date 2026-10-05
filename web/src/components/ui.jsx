import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { levelFor } from '../lib/progress.js';
import { speak } from '../lib/speech.js';
import { sfx } from '../lib/sound.js';

const FLOATERS = ['⭐', '🎈', '☁️', '✨', '🪐', '🌈', '🫧', '💫', '🍭', '🦋'];

/** Animated, theme-colored background with drifting blobs and emojis. */
export function Background() {
  const items = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        e: FLOATERS[i % FLOATERS.length],
        left: (i * 37) % 100,
        top: (i * 53) % 100,
        dur: 8 + (i % 5) * 2,
        delay: i * 0.6,
      })),
    [],
  );
  return (
    <div className="bg-layer" aria-hidden>
      <motion.div
        className="bg-blob"
        style={{ width: 420, height: 420, left: '-8%', top: '-10%', background: 'var(--primary)' }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 16, repeat: Infinity }}
      />
      <motion.div
        className="bg-blob"
        style={{ width: 380, height: 380, right: '-10%', top: '30%', background: 'var(--secondary)' }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity }}
      />
      <motion.div
        className="bg-blob"
        style={{ width: 300, height: 300, left: '30%', bottom: '-12%', background: 'var(--accent)' }}
        animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity }}
      />
      {items.map((it, i) => (
        <motion.span
          key={i}
          className="bg-float"
          style={{ left: `${it.left}%`, top: `${it.top}%` }}
          animate={{ y: [0, -30, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: it.dur, repeat: Infinity, delay: it.delay }}
        >
          {it.e}
        </motion.span>
      ))}
    </div>
  );
}

export function StarChip() {
  const { progress } = useApp();
  const { level } = levelFor(progress.stars);
  return (
    <motion.div className="chip" key={progress.stars} initial={{ scale: 1.25 }} animate={{ scale: 1 }}>
      ⭐ {progress.stars} <span className="muted">· Lv {level}</span>
    </motion.div>
  );
}

/** Sticky header with back button, title and star counter. */
export function TopBar({ title, emoji, back = '/', right }) {
  const nav = useNavigate();
  return (
    <div className="topbar">
      {back !== false && (
        <button
          className="icon-btn"
          aria-label="Back"
          onClick={() => {
            sfx.tap();
            nav(back);
          }}
        >
          ⬅️
        </button>
      )}
      <div className="title">
        {emoji} {title}
      </div>
      {right}
      <StarChip />
    </div>
  );
}

/** Colorful animated tile used on menus. */
export function Tile({ emoji, label, color, onClick, sub, children, delay = 0, anim }) {
  return (
    <motion.button
      className="tile"
      style={{ background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 65%, #000 10%))` }}
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.05, rotate: -1 }}
      whileTap={{ scale: 0.93 }}
      onClick={() => {
        sfx.pop();
        onClick?.();
      }}
    >
      {children}
      <span className={`emoji ${anim || ''}`}>{emoji}</span>
      <span>{label}</span>
      {sub && <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{sub}</span>}
    </motion.button>
  );
}

/** Button that reads text aloud in the right language. */
export function SpeakButton({ text, lang = 'en', label, className = 'btn small', pitch, rate }) {
  const [on, setOn] = useState(false);
  return (
    <button
      className={className}
      onClick={async () => {
        setOn(true);
        await speak(text, { lang, pitch, rate });
        setOn(false);
      }}
      aria-label={`Listen: ${text}`}
    >
      {on ? '🔊' : '🔈'} {label}
    </button>
  );
}

export function Modal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="modal"
            initial={{ scale: 0.7, y: 60 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Mascot with speech bubble; tap it to hear the line again. */
export function Mascot({ emoji = '🤖', line, lang = 'en', pitch, rate, size = '5rem' }) {
  return (
    <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
      <motion.button
        className="mascot"
        style={{ fontSize: size }}
        animate={{ y: [0, -10, 0], rotate: [0, -4, 4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        onClick={() => speak(line, { lang, pitch, rate })}
        aria-label="Hear again"
      >
        {emoji}
      </motion.button>
      {line && (
        <motion.div className="bubble" key={line} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          {line}
        </motion.div>
      )}
    </div>
  );
}

/** Grown-up check (Google Play Families best practice) before settings/outbound actions. */
export function ParentalGate({ open, onPass, onClose }) {
  const q = useMemo(() => {
    const a = 6 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    const ans = a * b;
    const opts = [ans, ans + a, ans - b, ans + 7].sort(() => Math.random() - 0.5);
    return { a, b, ans, opts };
    // new question every time the gate opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <Modal open={open} onClose={onClose}>
      <div className="center" style={{ gap: 14 }}>
        <h2>👨‍👩‍👧 For grown-ups only</h2>
        <p className="muted">Please answer to continue:</p>
        <div style={{ fontSize: '2.4rem', fontWeight: 800 }}>
          {q.a} × {q.b} = ?
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          {q.opts.map((o) => (
            <button key={o} className="btn ghost" onClick={() => (o === q.ans ? onPass() : onClose())}>
              {o}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function ProgressBar({ value, max }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} />
    </div>
  );
}

/** Page wrapper with enter animation. */
export function Page({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );
}

export const PALETTE = ['#FF4FA3', '#9B5CFF', '#1E90FF', '#22B573', '#FF8A3D', '#FFB23F', '#00C2A8', '#FF5D73', '#7C5CFF', '#3DA5FF'];
export const colorAt = (i) => PALETTE[i % PALETTE.length];

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
