// Privacy-first analytics: anonymous events only (no name, no device IDs).
// Events go to the Supabase "events" table (insert-only for the public key).
import { hasSupabase, supabaseHeaders, supabaseRest } from './content.js';

const SESSION_ID = (crypto.randomUUID?.() || String(Math.random()).slice(2)).slice(0, 18);
let context = {};
const queue = [];
let timer;

export function setAnalyticsContext(ctx) {
  context = { age_group: ctx.age, gender: ctx.gender, theme: ctx.themeId };
}

export function track(event, item = {}) {
  const row = {
    event,
    item_id: item.id ? String(item.id).slice(0, 80) : null,
    item_name: item.name ? String(item.name).slice(0, 120) : null,
    value: Number.isFinite(item.value) ? item.value : null,
    lang: item.lang || null,
    platform: 'web',
    session_id: SESSION_ID,
    ...context,
  };
  if (import.meta.env.DEV) console.debug('[track]', row);
  if (!hasSupabase) return;
  queue.push(row);
  clearTimeout(timer);
  timer = setTimeout(flush, 2500);
}

async function flush() {
  if (!queue.length) return;
  const rows = queue.splice(0, queue.length);
  try {
    await fetch(supabaseRest('events'), {
      method: 'POST',
      headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify(rows),
      keepalive: true,
    });
  } catch {
    /* offline: drop silently, analytics must never break the kid experience */
  }
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', flush);
