// Content loader: bundled seed  ->  cached remote copy  ->  fresh remote copy.
// Remote source is the Admin Panel's Supabase project (REST, read-only anon key)
// or a static JSON bundle exported from the Admin Panel (VITE_CONTENT_URL).
import seed from '../data/seed.json';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const CONTENT_URL = import.meta.env.VITE_CONTENT_URL || '';
const CACHE_KEY = 'kea.content.v1';

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('YOUR-PROJECT'));

export function supabaseHeaders() {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
}

export function supabaseRest(path) {
  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`;
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Deep-merge so new settings keys added in code keep their defaults. */
export function deepMerge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  return out;
}

/** Combine a (partial) remote bundle with the bundled seed. */
export function mergeBundle(remote) {
  if (!remote) return seed;
  const pick = (key) => (Array.isArray(remote[key]) && remote[key].length ? remote[key] : seed[key]);
  return {
    ...seed,
    settings: deepMerge(seed.settings, remote.settings || {}),
    buddy: deepMerge(seed.buddy, remote.buddy || {}),
    languages: pick('languages'),
    stories: pick('stories'),
    videos: pick('videos'),
    topics: pick('topics'),
    quiz: pick('quiz'),
    source: remote.source || 'remote',
  };
}

export function loadCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? mergeBundle(JSON.parse(raw)) : { ...seed, source: 'seed' };
  } catch {
    return { ...seed, source: 'seed' };
  }
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const rowsToItems = (rows) => rows.map((r) => ({ ...r.data, id: r.id }));

async function fetchSupabase() {
  const h = { headers: supabaseHeaders() };
  const [settingsRows, languages, stories, videos, topics, quiz] = await Promise.all([
    fetchJson(supabaseRest('app_settings?select=id,data'), h),
    fetchJson(supabaseRest('languages?select=id,data&enabled=eq.true&order=sort.asc'), h),
    fetchJson(supabaseRest('stories?select=id,data&published=eq.true&order=sort.asc'), h),
    fetchJson(supabaseRest('videos?select=id,data&published=eq.true&order=sort.asc'), h),
    fetchJson(supabaseRest('topics?select=id,data&published=eq.true&order=sort.asc'), h),
    fetchJson(supabaseRest('quiz?select=id,data&published=eq.true&order=sort.asc'), h),
  ]);
  const byId = Object.fromEntries(settingsRows.map((r) => [r.id, r.data]));
  return {
    settings: byId.global || {},
    buddy: byId.buddy || {},
    languages: languages.map((r) => ({ ...r.data, code: r.id })),
    stories: rowsToItems(stories),
    videos: rowsToItems(videos),
    topics: rowsToItems(topics),
    quiz: rowsToItems(quiz),
    source: 'supabase',
  };
}

/** Fetch the freshest content. Resolves to null when offline / not configured. */
export async function fetchRemote() {
  try {
    let remote = null;
    if (hasSupabase) remote = await fetchSupabase();
    else if (CONTENT_URL) remote = { ...(await fetchJson(CONTENT_URL)), source: 'json' };
    if (!remote) return null;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(remote));
    } catch {
      /* storage full: ignore */
    }
    return mergeBundle(remote);
  } catch (e) {
    console.warn('[content] remote fetch failed, using cached/seed content', e);
    return null;
  }
}

export { seed };
