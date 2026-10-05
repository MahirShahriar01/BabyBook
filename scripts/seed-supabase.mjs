#!/usr/bin/env node
// Uploads shared/content/seed.json into a Supabase project (first-time setup).
// Usage (service role key is needed to bypass RLS — keep it secret, never ship it in an app):
//   SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seed = JSON.parse(fs.readFileSync(path.join(root, 'shared/content/seed.json'), 'utf8'));
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' };

async function upsert(table, rows) {
  const res = await fetch(`${url}/rest/v1/${table}`, { method: 'POST', headers, body: JSON.stringify(rows) });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  console.log(`✔ ${table}: ${rows.length}`);
}

const docs = (list, flag = 'published') => list.map((d, i) => ({ id: d.id || `item-${i}`, data: d, [flag]: d[flag] !== false, sort: i }));

await upsert('app_settings', [
  { id: 'global', data: seed.settings },
  { id: 'buddy', data: seed.buddy },
]);
await upsert('languages', seed.languages.map((l, i) => ({ id: l.code, data: l, enabled: l.enabled !== false, sort: i })));
await upsert('stories', docs(seed.stories));
await upsert('videos', docs(seed.videos));
await upsert('topics', docs(seed.topics));
await upsert('quiz', docs(seed.quiz.map((q, i) => ({ id: q.id || `q${i + 1}`, ...q }))));
console.log('Done. Open the Admin Panel and sign in.');
