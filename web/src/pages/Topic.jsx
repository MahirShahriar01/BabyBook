import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { Page, TopBar, shuffle } from '../components/ui.jsx';
import SayIt from '../components/SayIt.jsx';
import { speak } from '../lib/speech.js';
import { sfx } from '../lib/sound.js';

/** One topic (animals, vehicles, ...): animated card carousel + "find it" mini game. */
export default function Topic() {
  const { id } = useParams();
  const { content, profile, progress, complete } = useApp();
  const topic = (content.topics || []).find((tp) => tp.id === id);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState('learn'); // learn | find
  const [round, setRound] = useState(null);
  const bn = profile.learnLang === 'bn' || profile.uiLang === 'bn';

  if (!topic) return <TopBar title="Not found" back="/explore" />;
  const items = topic.items;
  const item = items[idx];
  const key = (it) => `explore:${topic.id}:${it.id}`;

  const present = async (it) => {
    const line = `${it.name}. ${it.sound ? it.sound + ' ' : ''}${it.fact}`;
    if (!progress.done[key(it)]) complete('explore', { id: `${topic.id}:${it.id}`, name: it.name, celebrate: false });
    await speak(line, { lang: 'en', rate: 0.9 });
    if (bn && it.bn) await speak(it.bn, { lang: 'bn' });
  };

  const go = (d) => {
    sfx.flip();
    const n = (idx + d + items.length) % items.length;
    setIdx(n);
    present(items[n]);
  };

  const newRound = () => {
    const opts = shuffle(items).slice(0, Math.min(4, items.length));
    const target = opts[Math.floor(Math.random() * opts.length)];
    setRound({ opts, target, wrong: [] });
    speak(`Find the ${target.name}!`, { lang: 'en' });
  };

  const pick = (o) => {
    if (o.id === round.target.id) {
      complete('game', { id: `find:${topic.id}`, name: `Find ${topic.title}` });
      setTimeout(newRound, 1400);
      speak(`Yes! ${o.name}!`);
    } else {
      sfx.wrong();
      setRound({ ...round, wrong: [...round.wrong, o.id] });
      speak(`That is a ${o.name}. Try again!`);
    }
  };

  const anim = `anim-${topic.animation || 'bounce'}`;

  return (
    <Page>
      <TopBar title={topic.title} emoji={topic.emoji} back="/explore" />
      <div className="pill-tabs">
        <button className={mode === 'learn' ? 'active' : ''} onClick={() => setMode('learn')}>
          👀 Learn
        </button>
        <button
          className={mode === 'find' ? 'active' : ''}
          onClick={() => {
            setMode('find');
            newRound();
          }}
        >
          🔍 Find it game
        </button>
      </div>

      {mode === 'learn' && (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={item.id}
              className="card"
              initial={{ x: 100, opacity: 0, rotate: 4 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              exit={{ x: -100, opacity: 0, rotate: -4 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => (info.offset.x < -80 ? go(1) : info.offset.x > 80 ? go(-1) : null)}
            >
              <div className="stage" style={{ background: item.hex ? item.hex : `linear-gradient(135deg, ${topic.color}22, ${topic.color}66)` }}>
                <button className={anim} style={{ fontSize: 'inherit' }} onClick={() => present(item)} aria-label={item.name}>
                  {item.emoji}
                </button>
              </div>
              {item.count && (
                <div className="row" style={{ justifyContent: 'center', fontSize: '2rem', marginTop: 8 }}>
                  {Array.from({ length: item.count }, (_, i) => (
                    <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.12 }}>
                      {item.object}
                    </motion.span>
                  ))}
                </div>
              )}
              <div className="center" style={{ gap: 6, marginTop: 10 }}>
                <h2 style={{ fontSize: '2.4rem' }}>
                  {item.count ? `${item.count} · ` : ''}
                  {item.name} {item.emoji && item.count ? item.emoji : ''}
                </h2>
                {item.bn && <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{item.bn}</div>}
                {item.sound && <div className="chip">🔊 “{item.sound}”</div>}
                <p style={{ fontSize: '1.2rem', maxWidth: 560 }}>{item.fact}</p>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="row" style={{ justifyContent: 'center', margin: '14px 0' }}>
            <button className="btn ghost" onClick={() => go(-1)}>
              ⬅️
            </button>
            <button className="btn" onClick={() => present(item)}>
              🔊 Tell me
            </button>
            <button className="btn ghost" onClick={() => go(1)}>
              ➡️
            </button>
          </div>
          <SayIt word={item.name} lang="en" onScore={(r) => r.stars >= 2 && complete('explore', { id: `say:${item.id}`, name: item.name, stars: r.stars })} />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', marginTop: 14 }}>
            {items.map((it, i) => (
              <button
                key={it.id}
                className="card center"
                style={{ padding: 8, fontSize: '2rem', outline: i === idx ? '4px solid var(--primary)' : 'none' }}
                onClick={() => {
                  setIdx(i);
                  present(it);
                }}
                title={it.name}
              >
                {it.emoji}
                {progress.done[key(it)] && <span style={{ fontSize: '0.7rem' }}>⭐</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === 'find' && round && (
        <div className="card center" style={{ gap: 16 }}>
          <h2>
            Find the <span style={{ color: 'var(--primary)' }}>{round.target.name}</span>!
          </h2>
          <button className="btn ghost small" onClick={() => speak(`Find the ${round.target.name}!`)}>
            🔈 Hear again
          </button>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', width: 'min(460px, 100%)' }}>
            {round.opts.map((o) => (
              <motion.button
                key={o.id}
                className="card center"
                style={{ fontSize: '4.5rem', opacity: round.wrong.includes(o.id) ? 0.35 : 1, background: o.hex || undefined }}
                whileTap={{ scale: 0.85 }}
                animate={round.wrong.includes(o.id) ? { x: [0, -8, 8, 0] } : {}}
                onClick={() => pick(o)}
              >
                {o.emoji}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
