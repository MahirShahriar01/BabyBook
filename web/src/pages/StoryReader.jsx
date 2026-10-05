import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { Page, ProgressBar, TopBar } from '../components/ui.jsx';
import { speak, stopSpeaking } from '../lib/speech.js';
import { sfx } from '../lib/sound.js';

/** Split text into words with character offsets so we can highlight during narration. */
function tokenize(text) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) out.push({ w: m[0], start: m.index });
  return out;
}

export default function StoryReader() {
  const { id } = useParams();
  const { content, complete } = useApp();
  const nav = useNavigate();
  const story = content.stories.find((s) => s.id === id);
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [active, setActive] = useState(-1);
  const [reading, setReading] = useState(false);
  const [auto, setAuto] = useState(false);
  const [phase, setPhase] = useState('read'); // read | moral | quiz | done
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);

  const pages = useMemo(() => story?.pages || [], [story]);
  const current = pages[page];
  const words = useMemo(() => tokenize(current?.text || ''), [current]);
  const lang = story?.language || 'en';

  useEffect(() => () => stopSpeaking(), []);

  const narrate = async () => {
    if (!current) return;
    setReading(true);
    if (current.audio) {
      // admin-uploaded narration audio takes priority over text-to-speech
      await new Promise((resolve) => {
        const a = new Audio(current.audio);
        a.onended = resolve;
        a.onerror = resolve;
        a.play().catch(resolve);
      });
    } else {
      await speak(current.text, {
        lang,
        rate: 0.88,
        onWord: (ci) => {
          let idx = 0;
          for (let i = 0; i < words.length; i++) if (words[i].start <= ci) idx = i;
          setActive(idx);
        },
      });
    }
    setActive(-1);
    setReading(false);
    return true;
  };

  // auto-read: narrate page then flip
  useEffect(() => {
    if (!auto || phase !== 'read') return;
    let cancelled = false;
    narrate().then(() => {
      if (cancelled || !auto) return;
      setTimeout(() => !cancelled && turn(1), 700);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, page, phase]);

  if (!story) {
    return (
      <Page>
        <TopBar title="Story not found" back="/stories" />
      </Page>
    );
  }

  function turn(d) {
    stopSpeaking();
    sfx.flip();
    setActive(-1);
    if (d > 0 && page === pages.length - 1) {
      setAuto(false);
      setPhase('moral');
      speak(story.moral, { lang, rate: 0.9 });
      return;
    }
    setDir(d);
    setPage((p) => Math.max(0, Math.min(pages.length - 1, p + d)));
  }

  const quiz = story.quiz || [];
  const q = quiz[qIdx];

  const answer = (i) => {
    if (picked != null) return;
    setPicked(i);
    const ok = i === q.answer;
    if (ok) {
      sfx.star();
      setScore((s) => s + 1);
    } else sfx.wrong();
    setTimeout(() => {
      setPicked(null);
      if (qIdx + 1 < quiz.length) setQIdx(qIdx + 1);
      else {
        setPhase('done');
        complete('story', { id: story.id, name: story.title, stars: 2 + score + (ok ? 1 : 0), lang });
      }
    }, 1100);
  };

  return (
    <Page>
      <TopBar title={story.title} emoji={story.emoji} back="/stories" />
      {phase === 'read' && (
        <>
          <div style={{ marginBottom: 10 }}>
            <ProgressBar value={page + 1} max={pages.length} />
          </div>
          <div style={{ perspective: 1400 }}>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={page}
                className="book"
                custom={dir}
                initial={{ rotateY: dir > 0 ? 75 : -75, opacity: 0, transformOrigin: dir > 0 ? 'left center' : 'right center' }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: dir > 0 ? -75 : 75, opacity: 0 }}
                transition={{ duration: 0.5 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) turn(1);
                  else if (info.offset.x > 80 && page > 0) turn(-1);
                }}
              >
                <div className="book-scene" style={{ background: `linear-gradient(135deg, ${story.color || '#3DA5FF'}33, ${story.color || '#3DA5FF'}88)` }}>
                  {current.image ? (
                    <img src={current.image} alt="" />
                  ) : (
                    <motion.span animate={{ scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
                      {current.scene}
                    </motion.span>
                  )}
                </div>
                <div className="book-text" lang={lang}>
                  {words.map((w, i) => (
                    <span key={i}>
                      <span className={`w ${i === active ? 'on' : ''}`}>{w.w}</span>{' '}
                    </span>
                  ))}
                </div>
                <div className="row" style={{ padding: '8px 20px 20px', justifyContent: 'space-between' }}>
                  <span className="chip">
                    📄 {page + 1} / {pages.length}
                  </span>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>
                    swipe ↔
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button className="btn ghost" disabled={page === 0} onClick={() => turn(-1)}>
              ⬅️
            </button>
            <button className="btn" onClick={() => (reading ? stopSpeaking() : narrate())}>
              {reading ? '⏹️ Stop' : '🔊 Read to me'}
            </button>
            <button className={`btn ${auto ? 'accent' : 'ghost'}`} onClick={() => setAuto((a) => !a)}>
              {auto ? '⏸️ Auto' : '▶️ Auto'}
            </button>
            <button className="btn ghost" onClick={() => turn(1)}>
              ➡️
            </button>
          </div>
        </>
      )}

      {phase === 'moral' && (
        <motion.div className="card center" style={{ gap: 16, padding: 30 }} initial={{ scale: 0.5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}>
          <motion.div style={{ fontSize: '5rem' }} animate={{ rotate: [0, 12, -12, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            💡
          </motion.div>
          <h2>Moral of the story</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{story.moral}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn ghost" onClick={() => speak(story.moral, { lang })}>
              🔊 Hear again
            </button>
            <button
              className="btn"
              onClick={() => {
                if (quiz.length) setPhase('quiz');
                else {
                  setPhase('done');
                  complete('story', { id: story.id, name: story.title, stars: 2, lang });
                }
              }}
            >
              {quiz.length ? '❓ Quiz time!' : '🎉 Finish'}
            </button>
          </div>
        </motion.div>
      )}

      {phase === 'quiz' && q && (
        <motion.div key={qIdx} className="card center" style={{ gap: 16, padding: 26 }} initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <span className="chip">
            Question {qIdx + 1} / {quiz.length}
          </span>
          <h2>{q.question}</h2>
          <button className="btn ghost small" onClick={() => speak(q.question, { lang })}>
            🔈
          </button>
          <div className="grid" style={{ width: '100%', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {q.options.map((o, i) => (
              <motion.button
                key={o}
                className="btn"
                whileTap={{ scale: 0.9 }}
                animate={picked === i ? (i === q.answer ? { scale: [1, 1.15, 1] } : { x: [0, -10, 10, -10, 0] }) : {}}
                style={{
                  background: picked == null ? undefined : i === q.answer ? 'var(--ok)' : picked === i ? 'var(--bad)' : undefined,
                }}
                onClick={() => answer(i)}
              >
                {o}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {phase === 'done' && (
        <motion.div className="card center" style={{ gap: 14, padding: 30 }} initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <div style={{ fontSize: '5rem' }}>🏆</div>
          <h2>You finished the story!</h2>
          {quiz.length > 0 && (
            <p style={{ fontSize: '1.4rem' }}>
              Quiz: {score} / {quiz.length} {'⭐'.repeat(score)}
            </p>
          )}
          <div className="row" style={{ justifyContent: 'center' }}>
            <button
              className="btn ghost"
              onClick={() => {
                setPhase('read');
                setPage(0);
                setQIdx(0);
                setScore(0);
              }}
            >
              🔁 Read again
            </button>
            <button className="btn" onClick={() => nav('/stories')}>
              📚 More stories
            </button>
          </div>
        </motion.div>
      )}
    </Page>
  );
}
