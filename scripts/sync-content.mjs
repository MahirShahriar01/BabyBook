#!/usr/bin/env node
// Builds one content bundle (seed.json) from shared/content/*.json and copies it
// into every app so each branch (web / mobile / admin) stays self-contained.
// Usage: node scripts/sync-content.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'shared/content', f), 'utf8'));

const bundle = {
  version: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  settings: read('settings.json'),
  languages: read('languages.json'),
  stories: read('stories.json'),
  videos: read('videos.json'),
  topics: read('topics.json'),
  quiz: read('quiz.json'),
  buddy: read('buddy.json'),
};

const targets = [
  'shared/content/seed.json',
  'web/src/data/seed.json',
  'admin/src/data/seed.json',
  'mobile/assets/content/seed.json',
];

const json = JSON.stringify(bundle, null, 1) + '\n';
for (const t of targets) {
  const dir = path.join(root, path.dirname(t));
  if (t !== targets[0] && !fs.existsSync(path.join(root, t.split('/')[0]))) continue;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(root, t), json);
  console.log('✔ wrote', t);
}
