import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../store/AppContext.jsx';
import { Page, TopBar, shuffle } from '../../components/ui.jsx';
import { sfx } from '../../lib/sound.js';
import { speak } from '../../lib/speech.js';
import { itemName, topicTitle } from '../../lib/localize.js';

/** Pick 3 items from one topic and 1 from another; find the one that doesn't belong. */
export default function OddOneOut() {
  const { content, complete, t, profile } = useApp();
  const ui = profile.uiLang === 'bn' ? 'bn' : 'en';
  const topics = (content.topics || []).filter((tp) => tp.items.length >= 3 && tp.published !== false);
  const make = () => {
    const [a, b] = shuffle(topics).slice(0, 2);
    const same = shuffle(a.items).slice(0, 3);
    const odd = shuffle(b.items)[0];
    return { group: a, oddGroup: b, odd, cards: shuffle([...same, odd]) };
  };
  const [r, setR] = useState(make);
  const [wrong, setWrong] = useState([]);
  const [found, setFound] = useState(false);
  const [score, setScore] = useState(0);

  const pick = (it) => {
    if (found) return;
    if (it.id === r.odd.id) {
      setFound(true);
      sfx.star();
      speak(t('oddRight', { x: itemName(it, ui), g: topicTitle(r.group, ui), o: topicTitle(r.oddGroup, ui) }), { lang: ui });
      const s = score + 1;
      setScore(s);
      if (s % 3 === 0) complete('game', { id: 'odd', name: 'Odd one out x3', stars: 2 });
    } else {
      sfx.wrong();
      setWrong([...wrong, it.id]);
    }
  };

  return (
    <Page>
      <TopBar title="Odd One Out" emoji="🕵️" back="/games" right={<span className="chip">🕵️ {score}</span>} />
      <div className="card center" style={{ gap: 16, padding: 24 }}>
        <h2>{t('whichOdd')}</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', width: 'min(480px, 100%)' }}>
          {r.cards.map((it) => (
            <motion.button
              key={it.id}
              className="card center"
              style={{ fontSize: '4rem', opacity: wrong.includes(it.id) ? 0.35 : 1, outline: found && it.id === r.odd.id ? '5px solid var(--ok)' : 'none' }}
              whileTap={{ scale: 0.88 }}
              animate={wrong.includes(it.id) ? { x: [0, -8, 8, 0] } : found && it.id === r.odd.id ? { rotate: [0, 15, -15, 0] } : {}}
              onClick={() => pick(it)}
            >
              {it.emoji}
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>{itemName(it, ui)}</span>
            </motion.button>
          ))}
        </div>
        {found && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="center" style={{ gap: 10 }}>
            <b>
              {r.odd.emoji} → {r.oddGroup.emoji} {topicTitle(r.oddGroup, ui)} · {r.group.emoji} {topicTitle(r.group, ui)}
            </b>
            <button
              className="btn"
              onClick={() => {
                setR(make());
                setWrong([]);
                setFound(false);
              }}
            >
              ➡️ {t('next')}
            </button>
          </motion.div>
        )}
      </div>
    </Page>
  );
}
