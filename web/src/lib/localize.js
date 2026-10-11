// Picks the Bangla (or other) version of content when the kid uses that interface language.
export const topicTitle = (tp, lang) => (lang === 'bn' && tp.titleBn) || tp.title;
export const itemName = (it, lang) => (lang === 'bn' && it.bn) || it.name;
export const itemFact = (it, lang) => (lang === 'bn' && it.bnFact) || it.fact;

export function quizText(q, lang) {
  if (lang === 'bn' && q.bn?.q) return { q: q.bn.q, options: q.bn.options };
  return { q: q.q || q.question, options: q.options };
}

/** "অ-তে অজগর", "A for Apple", "अ से अनार" … from the language's letterPhrase template. */
export function letterPhrase(language, letter, word) {
  const tpl = language?.letterPhrase || '{char} — {word}';
  return word ? tpl.replace('{char}', letter.char).replace('{word}', word.word) : letter.char;
}

/** What to say when a letter is introduced: its spoken name, the phrase and a short sentence. */
export function letterSpeech(language, letter) {
  const w = letter.words?.[0];
  const name = letter.name || letter.char;
  const stop = language?.code === 'bn' || language?.code === 'hi' ? '।' : '.';
  return [name + stop, w ? letterPhrase(language, { ...letter, char: name }, w) + stop : '', w?.sentence || ''].filter(Boolean).join(' ');
}
