import { useState } from 'react';
import { motion } from 'framer-motion';
import { listen, speak, sttSupported } from '../lib/speech.js';
import { pronunciationScore, syllables } from '../lib/buddyEngine.js';
import { sfx } from '../lib/sound.js';

const FEEDBACK = {
  en: ['Let\'s try again together!', 'Good try!', 'Very good!', 'Perfect pronunciation!'],
  bn: ['চলো আবার একসাথে বলি!', 'ভালো চেষ্টা!', 'খুব ভালো!', 'একদম সঠিক উচ্চারণ!'],
  es: ['¡Intentémoslo otra vez!', '¡Buen intento!', '¡Muy bien!', '¡Pronunciación perfecta!'],
  fr: ['Essayons encore !', 'Bon essai !', 'Très bien !', 'Prononciation parfaite !'],
  hi: ['चलो फिर से बोलें!', 'अच्छी कोशिश!', 'बहुत अच्छा!', 'बिल्कुल सही उच्चारण!'],
};

/**
 * Pronunciation trainer: the kid says a word, we compare speech-recognition output
 * with the target and give 0-3 stars plus a slow, syllable-by-syllable model answer.
 */
export default function SayIt({ word, lang = 'en', onScore }) {
  const [state, setState] = useState('idle'); // idle | listening | result | error
  const [res, setRes] = useState(null);

  if (!sttSupported) {
    return (
      <div className="card" style={{ fontSize: '0.95rem' }}>
        🎤 Speaking practice works in Chrome, Edge or Safari. You can still tap 🔈 to listen and repeat!
      </div>
    );
  }

  const run = async () => {
    sfx.tap();
    setState('listening');
    try {
      const { alternatives } = await listen(lang).promise;
      const r = pronunciationScore(word, alternatives);
      setRes(r);
      setState('result');
      const fb = (FEEDBACK[lang] || FEEDBACK.en)[r.stars];
      if (r.stars >= 2) sfx.star();
      else sfx.wrong();
      onScore?.(r);
      await speak(fb, { lang });
      if (r.stars < 3) {
        await speak(syllables(word).join(' - '), { lang, rate: 0.6 });
        await speak(word, { lang, rate: 0.85 });
      }
    } catch (e) {
      setRes({ error: e.message });
      setState('error');
    }
  };

  return (
    <div className="card center" style={{ gap: 10 }}>
      <button className={`mic ${state === 'listening' ? 'live' : ''}`} onClick={run} disabled={state === 'listening'} aria-label="Say it">
        🎤
      </button>
      <b>{state === 'listening' ? 'Listening… say it now!' : `Tap and say "${word}"`}</b>
      {state === 'result' && res && (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="center" style={{ gap: 4 }}>
          <div style={{ fontSize: '2.2rem' }}>{'⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars)}</div>
          <div className="muted">
            I heard: “{res.heard || '…'}” · {res.score}%
          </div>
          {res.stars < 3 && <div>Say it slowly: <b>{syllables(word).join(' · ')}</b></div>}
        </motion.div>
      )}
      {state === 'error' && <div className="muted">I could not hear you. Check the microphone and try again 🎧</div>}
    </div>
  );
}
