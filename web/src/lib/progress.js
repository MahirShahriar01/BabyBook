// Local-only persistence (no account, no server). Everything about the kid stays on
// this device: name, age group, avatar, theme, stars, stickers and activity history.
const PROFILE_KEY = 'kea.profile.v1';
const PROGRESS_KEY = 'kea.progress.v1';

const read = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private mode / quota: keep working in memory */
  }
};

export const emptyProfile = { name: '', age: '', gender: '', avatar: '', themeId: '', uiLang: 'en', learnLang: 'en', persona: '', sound: true, done: false };

export const emptyProgress = {
  stars: 0,
  stickers: [],
  done: {}, // { 'story:thirsty-crow': 3, 'letter:en:A': 1, ... } -> times completed
  daily: { date: '', minutes: 0, missions: [] },
  streak: { last: '', count: 0 },
  limitMinutes: 0, // 0 = use admin default
};

export const loadProfile = () => read(PROFILE_KEY, emptyProfile);
export const saveProfile = (p) => write(PROFILE_KEY, p);
export const loadProgress = () => read(PROGRESS_KEY, emptyProgress);
export const saveProgress = (p) => write(PROGRESS_KEY, p);

export function clearAll() {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

export const today = () => new Date().toISOString().slice(0, 10);

/** Level grows every 10 stars; returns { level, inLevel, need }. */
export function levelFor(stars) {
  const level = Math.floor(stars / 10) + 1;
  return { level, inLevel: stars % 10, need: 10 };
}

/** Rotating daily missions (spaced practice): one per module, different each day. */
const MISSION_POOL = [
  { id: 'letter', emoji: '🔤', text: 'Learn 3 letters', to: '/alphabet', key: 'letter', goal: 3 },
  { id: 'story', emoji: '📖', text: 'Read a story', to: '/stories', key: 'story', goal: 1 },
  { id: 'game', emoji: '🧩', text: 'Win a brain game', to: '/games', key: 'game', goal: 1 },
  { id: 'explore', emoji: '🦁', text: 'Discover 5 new things', to: '/explore', key: 'explore', goal: 5 },
  { id: 'buddy', emoji: '🤖', text: 'Talk to your Buddy', to: '/buddy', key: 'buddy', goal: 2 },
  { id: 'quiz', emoji: '❓', text: 'Answer 3 quiz questions', to: '/quiz', key: 'quiz', goal: 3 },
  { id: 'ailab', emoji: '🧪', text: 'Try an AI experiment', to: '/ai-lab', key: 'ailab', goal: 1 },
];

export function missionsFor(dateStr, count = 3, features = {}) {
  const pool = MISSION_POOL.filter((m) => features[m.key === 'letter' ? 'alphabet' : m.key] !== false);
  const seed = [...dateStr].reduce((n, c) => n + c.charCodeAt(0), 0);
  const out = [];
  for (let i = 0; out.length < Math.min(count, pool.length); i++) {
    const m = pool[(seed + i * 3) % pool.length];
    if (!out.includes(m)) out.push(m);
  }
  return out.map((m) => ({ ...m, count: 0 }));
}
