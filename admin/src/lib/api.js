// Admin data layer. Two interchangeable back-ends:
//  - Supabase (production): auth + Postgres tables + Storage, changes go live instantly
//    for the web app and Android app.
//  - Demo mode (no env vars): everything is kept in this browser's localStorage and
//    can be exported as content.json for static hosting.
import { createClient } from '@supabase/supabase-js';
import seed from '../data/seed.json';

const URL = import.meta.env.VITE_SUPABASE_URL || '';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isSupabase = Boolean(URL && KEY && !URL.includes('YOUR-PROJECT'));
export const supabase = isSupabase ? createClient(URL, KEY) : null;

export const COLLECTIONS = ['stories', 'videos', 'topics', 'quiz', 'languages'];
const DEMO_KEY = 'kea.admin.bundle.v1';
const DEMO_AUTH = 'kea.admin.demoAuth';
const clone = (x) => JSON.parse(JSON.stringify(x));

// ------------------------------------------------------------------ auth
export async function getSession() {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    return data.session ? { email: data.session.user.email, id: data.session.user.id } : null;
  }
  return localStorage.getItem(DEMO_AUTH) ? { email: 'demo@local', id: 'demo' } : null;
}

export async function signIn(email, password) {
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: isAdmin } = await supabase.rpc('is_admin', { min_role: 'viewer' });
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error('This account is not an admin. Add it to the "admins" table (see supabase/schema.sql).');
    }
    return getSession();
  }
  // Demo mode: any non-empty credentials (there is nothing to protect locally).
  if (!email || !password) throw new Error('Enter any email and password for demo mode');
  localStorage.setItem(DEMO_AUTH, '1');
  return getSession();
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  localStorage.removeItem(DEMO_AUTH);
}

// ------------------------------------------------------------------ content
function demoBundle() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return { ...clone(seed), ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt cache */
  }
  return clone(seed);
}
const demoSave = (b) => localStorage.setItem(DEMO_KEY, JSON.stringify(b));

const flagFor = (col) => (col === 'languages' ? 'enabled' : 'published');
const idOf = (col, item) => (col === 'languages' ? item.code : item.id);

export async function loadBundle() {
  if (!supabase) return demoBundle();
  const sel = (t) => supabase.from(t).select('id,data,sort').order('sort');
  const [settings, ...lists] = await Promise.all([supabase.from('app_settings').select('id,data'), ...COLLECTIONS.map(sel)]);
  for (const r of [settings, ...lists]) if (r.error) throw r.error;
  const byId = Object.fromEntries(settings.data.map((r) => [r.id, r.data]));
  const bundle = {
    settings: { ...seed.settings, ...(byId.global || {}) },
    buddy: byId.buddy || seed.buddy,
  };
  COLLECTIONS.forEach((c, i) => {
    bundle[c] = lists[i].data.map((r) => (c === 'languages' ? { ...r.data, code: r.id } : { ...r.data, id: r.id }));
  });
  return bundle;
}

export async function saveSettings(settings) {
  if (!supabase) return demoSave({ ...demoBundle(), settings });
  const { error } = await supabase.from('app_settings').upsert({ id: 'global', data: settings });
  if (error) throw error;
}

export async function saveBuddy(buddy) {
  if (!supabase) return demoSave({ ...demoBundle(), buddy });
  const { error } = await supabase.from('app_settings').upsert({ id: 'buddy', data: buddy });
  if (error) throw error;
}

/** Insert or update one item; `list` is the full ordered collection after the change. */
export async function saveItem(col, item, list) {
  if (!supabase) return demoSave({ ...demoBundle(), [col]: list });
  const sort = list.findIndex((x) => idOf(col, x) === idOf(col, item));
  const flag = flagFor(col);
  const { error } = await supabase.from(col).upsert({ id: idOf(col, item), data: item, [flag]: item[flag] !== false, sort: Math.max(0, sort) });
  if (error) throw error;
}

export async function deleteItem(col, id, list) {
  if (!supabase) return demoSave({ ...demoBundle(), [col]: list });
  const { error } = await supabase.from(col).delete().eq('id', id);
  if (error) throw error;
}

export async function saveOrder(col, list) {
  if (!supabase) return demoSave({ ...demoBundle(), [col]: list });
  const flag = flagFor(col);
  const rows = list.map((item, sort) => ({ id: idOf(col, item), data: item, [flag]: item[flag] !== false, sort }));
  const { error } = await supabase.from(col).upsert(rows);
  if (error) throw error;
}

/** Replace everything (import). */
export async function importBundle(b) {
  if (!supabase) return demoSave(b);
  await saveSettings(b.settings);
  await saveBuddy(b.buddy);
  for (const c of COLLECTIONS) if (Array.isArray(b[c])) await saveOrder(c, b[c]);
}

export function resetDemo() {
  localStorage.removeItem(DEMO_KEY);
}

/** Bundle format consumed by the web app (VITE_CONTENT_URL) and mobile app (CONTENT_URL). */
export function exportBundle(b) {
  return { version: 1, updatedAt: new Date().toISOString().slice(0, 10), ...b };
}

// ------------------------------------------------------------------ media
export async function upload(file) {
  if (!supabase) {
    if (file.size > 1.5e6) throw new Error('Demo mode stores files in the browser; please use files under 1.5 MB or connect Supabase.');
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '31536000', contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

// ------------------------------------------------------------------ analytics
export async function loadEvents(days = 30) {
  if (!supabase) return demoEvents(days);
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const out = [];
  // page through up to 50k rows
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await supabase.from('events').select('*').gte('created_at', since).order('created_at', { ascending: false }).range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export async function clearEvents() {
  if (!supabase) return;
  const { error } = await supabase.from('events').delete().lt('created_at', new Date().toISOString());
  if (error) throw error;
}

/** Deterministic sample analytics so the dashboard is meaningful in demo mode. */
function demoEvents(days) {
  let s = 42;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const kinds = [
    ['story_complete', seed.stories.map((x) => [x.id, x.title])],
    ['game_complete', [['sudoku', 'Sudoku'], ['memory', 'Memory'], ['pattern', 'Pattern'], ['math', 'Number Pop'], ['odd', 'Odd one out']]],
    ['letter_complete', [['en:A', 'A'], ['bn:অ', 'অ'], ['en:B', 'B'], ['es:Ñ', 'Ñ']]],
    ['explore_complete', seed.topics.flatMap((t) => t.items.slice(0, 3).map((i) => [`${t.id}:${i.id}`, i.name]))],
    ['buddy_complete', [['en', 'buddy_chat'], ['bn', 'buddy_chat']]],
    ['video_play', seed.videos.filter((v) => v.videoId).map((v) => [v.id, v.title])],
    ['quiz_complete', seed.quiz.slice(0, 8).map((q) => [q.id, q.q])],
    ['ailab_complete', [['draw', 'draw'], ['teach', 'teach robot'], ['predict', 'predict']]],
  ];
  const rows = [];
  const now = Date.now();
  for (let d = days - 1; d >= 0; d--) {
    const sessions = 18 + Math.floor(rnd() * 25) + Math.floor((days - d) * 0.6);
    for (let k = 0; k < sessions; k++) {
      const sid = `demo-${d}-${k}`;
      const platform = rnd() < 0.62 ? 'android' : 'web';
      const age = pick(['2-4', '5-7', '5-7', '8-10']);
      const gender = pick(['boy', 'girl', 'neutral']);
      const theme = pick(['bubblegum', 'ocean', 'jungle', 'space', 'cyber', 'sunshine']);
      const n = 2 + Math.floor(rnd() * 7);
      for (let e = 0; e < n; e++) {
        const [event, items] = pick(kinds);
        const [item_id, item_name] = pick(items);
        rows.push({
          created_at: new Date(now - d * 864e5 - rnd() * 864e5 * 0.9).toISOString(),
          event,
          item_id,
          item_name,
          platform,
          session_id: sid,
          age_group: age,
          gender,
          theme,
          lang: pick(['en', 'en', 'bn', 'es']),
          value: 1,
        });
      }
    }
  }
  return rows;
}
