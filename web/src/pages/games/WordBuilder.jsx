import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, TopBar, VoiceHint, shuffle } from '../../components/ui.jsx';
import { spellableWords } from '../../lib/games.js';
import { speak } from '../../lib/speech.js';
import { sfx } from '../../lib/sound.js';

const EXTRA = { en: 'ABCDEFGHIKLMNOPRSTU', bn: 'কখগচজতদনপবমরলস', hi: 'कखगजतदनपबमरलस', es: 'ABCDEGLMNOPRST', fr: 'ABCDEGLMNOPRST' };

/** Spell a picture word by tapping its letters in order (English, Bangla, …). */
export default function WordBuilder() {
  const { content, profile, complete, t } = useApp();
  const language = content.languages.find((l) => l.code === profile.learnLang) || content.languages[0];
  const words = useMemo(() => spellableWords(language, profile.age), [language, profile.age]);
  const [round, setRound] = useState(() => makeRound(words, language, profile.age));
  const [placed, setPlaced] = useState([]);
  const [wrong, setWrong] = useState(null);
  const [score, setScore] = useState(0);
  const done = round && placed.length === round.word.parts.length;

  function makeRound(list, lang, age) {
    if (!list.length) return null;
    const word = list[Math.floor(Math.random() * list.length)];
    const extra = age === '2-4' ? 0 : age === '5-7' ? 1 : 2;
    const pool = [...(EXTRA[lang.code] || EXTRA.en)].filter((c) => !word.parts.includes(c));
    const tiles = shuffle([...word.parts.map((p, i) => ({ id: `w${i}`, ch: p })), ...shuffle(pool).slice(0, extra).map((c, i) => ({ id: `x${i}`, ch: c }))]);
    setTimeout(() => speak(word.word, { lang: lang.code }), 300);
    return { word, tiles };
  }

  const tap = (tile) => {
    if (done || placed.includes(tile.id)) return;
    const need = round.word.parts[placed.length];
    if (tile.ch === need) {
      sfx.pop();
      const next = [...placed, tile.id];
      setPlaced(next);
      if (next.length === round.word.parts.length) {
        const s = score + 1;
        setScore(s);
        complete('game', { id: 'word-builder', name: `Word ${round.word.word}`, stars: 2, lang: language.code });
        speak(`${round.word.word}! ${t('great')}`, { lang: language.code });
      }
    } else {
      sfx.wrong();
      setWrong(tile.id);
      setTimeout(() => setWrong(null), 500);
    }
  };

  if (!round) return <TopBar title="🔡" back="/games" />;
  return (
    <Page>
      <TopBar title={t('buildWord')} emoji="🔡" back="/games" right={<span className="chip">✅ {score}</span>} />
      <VoiceHint lang={language.code} />
      <div className="card center" style={{ gap: 16, padding: 24 }}>
        <motion.button key={round.word.word} style={{ fontSize: '6rem' }} initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => speak(round.word.word, { lang: language.code })}>
          {round.word.emoji}
        </motion.button>
        <div className="row" style={{ justifyContent: 'center', gap: 8 }} lang={language.code}>
          {round.word.parts.map((p, i) => (
            <motion.div
              key={i}
              className="letter-tile"
              style={{ width: 64, background: i < placed.length ? 'var(--ok)' : 'rgba(0,0,0,.12)', fontSize: '2.2rem' }}
              animate={i < placed.length ? { scale: [0.6, 1.15, 1] } : {}}
            >
              {i < placed.length ? p : '?'}
            </motion.div>
          ))}
        </div>
        {(round.word.sentence || round.word.meaning) && done && <p className="muted">{round.word.sentence || round.word.meaning}</p>}
        <div className="row" style={{ justifyContent: 'center', gap: 10 }} lang={language.code}>
          {round.tiles.map((tile, i) => (
            <motion.button
              key={tile.id}
              className="letter-tile"
              style={{ width: 70, fontSize: '2.2rem', background: `hsl(${(i * 47) % 360} 80% 55%)`, opacity: placed.includes(tile.id) ? 0.15 : 1 }}
              animate={wrong === tile.id ? { x: [0, -10, 10, -6, 0] } : {}}
              whileTap={{ scale: 0.85 }}
              onClick={() => tap(tile)}
            >
              {tile.ch}
            </motion.button>
          ))}
        </div>
        {done && (
          <button
            className="btn big"
            onClick={() => {
              setPlaced([]);
              setRound(makeRound(words, language, profile.age));
            }}
          >
            ➡️ {t('next')}
          </button>
        )}
      </div>
    </Page>
  );
}
