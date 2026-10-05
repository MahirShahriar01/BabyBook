import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../store/AppContext.jsx';
import { Page, ProgressBar, TopBar, shuffle } from '../components/ui.jsx';
import { SHAPES, knn, predictNext, recognize } from '../lib/recognizer.js';
import { speak } from '../lib/speech.js';
import { sfx } from '../lib/sound.js';

const LABS = [
  { id: 'what', emoji: '💡', title: 'What is AI?' },
  { id: 'draw', emoji: '✏️', title: 'Draw & AI guesses' },
  { id: 'teach', emoji: '🧑‍🏫', title: 'Teach the Robot' },
  { id: 'predict', emoji: '🔮', title: 'Can AI predict?' },
];

export default function AiLab() {
  const { t } = useApp();
  const [lab, setLab] = useState('what');
  return (
    <Page>
      <TopBar title={t('ailab')} emoji="🧪" />
      <div className="pill-tabs">
        {LABS.map((l) => (
          <button key={l.id} className={l.id === lab ? 'active' : ''} onClick={() => setLab(l.id)}>
            {l.emoji} {l.title}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={lab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          {lab === 'what' && <WhatIsAi onNext={() => setLab('draw')} />}
          {lab === 'draw' && <DrawGuess />}
          {lab === 'teach' && <TeachRobot />}
          {lab === 'predict' && <Predict />}
        </motion.div>
      </AnimatePresence>
    </Page>
  );
}

// ------------------------------------------------------------------ 1. explainer
const STEPS = [
  { emoji: '📸', title: '1. Look at examples', text: 'AI looks at LOTS of examples — like thousands of cat pictures.' },
  { emoji: '🧠', title: '2. Find patterns', text: 'It notices patterns: cats have pointy ears, whiskers and a tail.' },
  { emoji: '🔮', title: '3. Make a guess', text: 'When it sees a new picture, it guesses: "I think this is a cat!"' },
  { emoji: '🔁', title: '4. Learn from mistakes', text: 'If the guess is wrong, people help it fix it, and it gets better.' },
  { emoji: '🤝', title: 'AI is a helper', text: 'AI is a tool made by people. It can be wrong, so we always think for ourselves too!' },
];

function WhatIsAi({ onNext }) {
  const { complete } = useApp();
  const [i, setI] = useState(0);
  const s = STEPS[i];
  return (
    <div className="card center" style={{ gap: 14, padding: 26 }}>
      <ProgressBar value={i + 1} max={STEPS.length} />
      <motion.div key={i} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} style={{ fontSize: '6rem' }}>
        {s.emoji}
      </motion.div>
      <h2>{s.title}</h2>
      <p style={{ fontSize: '1.3rem', maxWidth: 560 }}>{s.text}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn ghost" onClick={() => speak(`${s.title}. ${s.text}`)}>
          🔊
        </button>
        {i < STEPS.length - 1 ? (
          <button className="btn" onClick={() => setI(i + 1)}>
            Next ➡️
          </button>
        ) : (
          <button
            className="btn accent"
            onClick={() => {
              complete('ailab', { id: 'what-is-ai', name: 'What is AI' });
              onNext();
            }}
          >
            🧪 Try an experiment!
          </button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 2. draw & guess
function DrawGuess() {
  const { complete, theme } = useApp();
  const canvas = useRef(null);
  const pts = useRef([]);
  const drawing = useRef(false);
  const [guesses, setGuesses] = useState([]);
  const [target, setTarget] = useState(() => shuffle(Object.keys(SHAPES))[0]);

  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * canvas.current.width) / r.width, y: ((e.clientY - r.top) * canvas.current.height) / r.height };
  };
  const clear = () => {
    const c = canvas.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    pts.current = [];
    setGuesses([]);
  };
  const finish = () => {
    drawing.current = false;
    const g = recognize(pts.current).slice(0, 3);
    setGuesses(g);
    if (!g.length) return;
    const top = SHAPES[g[0].name];
    sfx.pop();
    speak(`Hmm… I think it is a ${top.name}! I am ${Math.round(g[0].score * 100)} percent sure.`);
    if (g[0].name === target) {
      complete('ailab', { id: 'draw', name: `draw:${target}`, stars: 2 });
      setTimeout(() => {
        setTarget(shuffle(Object.keys(SHAPES).filter((k) => k !== target))[0]);
        clear();
      }, 2600);
    }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      <div className="card center" style={{ gap: 10 }}>
        <h3>
          Draw a {SHAPES[target].name} {SHAPES[target].emoji} in one line
        </h3>
        <canvas
          ref={canvas}
          width={500}
          height={500}
          className="trace-wrap"
          style={{ cursor: 'crosshair' }}
          onPointerDown={(e) => {
            clear();
            drawing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            pts.current = [pos(e)];
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const p = pos(e);
            const ctx = canvas.current.getContext('2d');
            const last = pts.current[pts.current.length - 1];
            ctx.strokeStyle = theme.primary;
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            pts.current.push(p);
          }}
          onPointerUp={finish}
        />
        <button className="btn ghost small" onClick={clear}>
          🧽 Clear
        </button>
      </div>
      <div className="card" style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        <h3>🤖 The AI&apos;s brain</h3>
        {!guesses.length && <p className="muted">Draw something and I will guess! I compare your line with shapes I have learned.</p>}
        {guesses.map((g, i) => (
          <motion.div key={g.name} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.15 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>
                {SHAPES[g.name].emoji} {SHAPES[g.name].name}
              </b>
              <span>{Math.round(g.score * 100)}%</span>
            </div>
            <ProgressBar value={g.score * 100} max={100} />
          </motion.div>
        ))}
        {guesses[0] && (
          <div className="bubble" style={{ marginTop: 8 }}>
            {guesses[0].name === target ? '🎉 I got it! ' : '🤔 '}
            AI gives a <b>score</b> to every idea and picks the highest. That is how computers make a guess!
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 3. teach the robot (k-NN)
// features: [wings, fins, legs/4, fur, lives in water]
const CREATURES = [
  { e: '🦅', n: 'eagle', f: [1, 0, 0.5, 0, 0] },
  { e: '🦜', n: 'parrot', f: [1, 0, 0.5, 0, 0] },
  { e: '🐟', n: 'fish', f: [0, 1, 0, 0, 1] },
  { e: '🐬', n: 'dolphin', f: [0, 1, 0, 0, 1] },
  { e: '🐶', n: 'dog', f: [0, 0, 1, 1, 0] },
  { e: '🐘', n: 'elephant', f: [0, 0, 1, 0, 0] },
  { e: '🦋', n: 'butterfly', f: [1, 0, 1, 0, 0] },
  { e: '🐙', n: 'octopus', f: [0, 0, 1, 0, 1] },
  { e: '🐴', n: 'horse', f: [0, 0, 1, 1, 0] },
  { e: '🦆', n: 'duck', f: [1, 0, 0.5, 0, 1] },
  { e: '🦈', n: 'shark', f: [0, 1, 0, 0, 1] },
  { e: '🐱', n: 'cat', f: [0, 0, 1, 1, 0] },
  { e: '🐦', n: 'bird', f: [1, 0, 0.5, 0, 0] },
  { e: '🐢', n: 'turtle', f: [0, 0, 1, 0, 1] },
];
const LABELS = [
  { id: 'fly', emoji: '🪽', text: 'Flies' },
  { id: 'swim', emoji: '🌊', text: 'Swims' },
  { id: 'walk', emoji: '🐾', text: 'Walks' },
];

function TeachRobot() {
  const { complete } = useApp();
  const [pool] = useState(() => shuffle(CREATURES));
  const [examples, setExamples] = useState([]);
  const [phase, setPhase] = useState('teach');
  const [result, setResult] = useState(null);
  const trainSet = pool.slice(0, 6);
  const testSet = pool.slice(6);
  const current = trainSet[examples.length];
  const [testIdx, setTestIdx] = useState(0);
  const testItem = testSet[testIdx % testSet.length];

  const label = (lab) => {
    sfx.pop();
    const next = [...examples, { ...current, label: lab, features: current.f }];
    setExamples(next);
    if (next.length === trainSet.length) {
      setPhase('test');
      speak('Thank you for teaching me! Now let me guess some new animals.');
    }
  };

  const guess = () => {
    const r = knn(examples, testItem.f, 3);
    setResult(r);
    const lab = LABELS.find((l) => l.id === r.label);
    speak(`I think the ${testItem.n} ${lab?.text.toLowerCase()}, because it is like the ${r.nearest.n} you showed me.`);
  };

  return (
    <div className="card center" style={{ gap: 14, padding: 22 }}>
      {phase === 'teach' && current && (
        <>
          <h3>
            Teach me! ({examples.length + 1}/{trainSet.length})
          </h3>
          <motion.div key={current.n} initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: '6rem' }}>
            {current.e}
          </motion.div>
          <b style={{ fontSize: '1.5rem' }}>Does the {current.n} mostly fly, swim or walk?</b>
          <div className="row" style={{ justifyContent: 'center' }}>
            {LABELS.map((l) => (
              <button key={l.id} className="btn big" onClick={() => label(l.id)}>
                {l.emoji} {l.text}
              </button>
            ))}
          </div>
          <p className="muted">The robot only knows what YOU teach it. That is called training data!</p>
        </>
      )}
      {phase === 'test' && (
        <>
          <h3>🤖 Robot&apos;s memory</h3>
          <div className="row" style={{ justifyContent: 'center' }}>
            {examples.map((x) => (
              <span key={x.n} className="chip">
                {x.e} → {LABELS.find((l) => l.id === x.label)?.emoji}
              </span>
            ))}
          </div>
          <motion.div key={testItem.n} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ fontSize: '6rem' }}>
            {testItem.e}
          </motion.div>
          <b>New animal: {testItem.n}</b>
          {!result ? (
            <button className="btn big" onClick={guess}>
              🔮 Robot, guess!
            </button>
          ) : (
            <div className="center" style={{ gap: 10 }}>
              <div className="bubble">
                I think it <b>{LABELS.find((l) => l.id === result.label)?.text.toLowerCase()}</b> {LABELS.find((l) => l.id === result.label)?.emoji} ({Math.round(result.confidence * 100)}% sure), because it looks like the {result.nearest.e} {result.nearest.n}.
              </div>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button
                  className="btn"
                  onClick={() => {
                    complete('ailab', { id: 'teach', name: 'teach robot' });
                    setResult(null);
                    setTestIdx(testIdx + 1);
                  }}
                >
                  👍 Right!
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    speak('Oops! Thank you. Teach me more and I will get smarter.');
                    setResult(null);
                    setTestIdx(testIdx + 1);
                  }}
                >
                  👎 Wrong
                </button>
              </div>
              <p className="muted" style={{ maxWidth: 520 }}>
                If you taught the robot something wrong, it will guess wrong too. Good data makes good AI!
              </p>
            </div>
          )}
          <button
            className="btn ghost small"
            onClick={() => {
              setExamples([]);
              setPhase('teach');
              setResult(null);
            }}
          >
            🔁 Teach again
          </button>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ 4. prediction
const OPTS = ['🔴', '🔵', '🟡'];

function Predict() {
  const { complete } = useApp();
  const [hist, setHist] = useState([]);
  const [hits, setHits] = useState(0);
  const [tries, setTries] = useState(0);
  const pred = predictNext(hist, OPTS);

  const add = (o) => {
    sfx.tap();
    if (hist.length >= 2) {
      setTries((n) => n + 1);
      if (pred[0].option === o) setHits((n) => n + 1);
    }
    const next = [...hist, o].slice(-30);
    setHist(next);
    if (next.length === 12) complete('ailab', { id: 'predict', name: 'predict' });
  };

  return (
    <div className="card center" style={{ gap: 14, padding: 22 }}>
      <h3>Tap colors in a pattern. The AI tries to guess your next tap!</h3>
      <div className="row" style={{ justifyContent: 'center', minHeight: 44, fontSize: '1.8rem' }}>
        {hist.slice(-14).map((h, i) => (
          <motion.span key={hist.length - 14 + i} initial={{ scale: 0 }} animate={{ scale: 1 }}>
            {h}
          </motion.span>
        ))}
      </div>
      {hist.length >= 2 && (
        <div className="bubble">
          🔮 I predict you will tap <b style={{ fontSize: '1.6rem' }}>{pred[0].option}</b> next ({Math.round(pred[0].p * 100)}%)
        </div>
      )}
      <div className="row" style={{ justifyContent: 'center' }}>
        {OPTS.map((o) => (
          <motion.button key={o} whileTap={{ scale: 0.8 }} className="card" style={{ fontSize: '3.5rem', padding: '10px 24px' }} onClick={() => add(o)}>
            {o}
          </motion.button>
        ))}
      </div>
      <span className="chip">
        🎯 AI guessed right {hits} of {tries} times
      </span>
      <p className="muted" style={{ maxWidth: 560 }}>
        The AI counts what you tapped after each color before. The more you follow a pattern, the better it predicts. Try being random to trick it! 😄
      </p>
    </div>
  );
}
