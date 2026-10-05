# 🛠️ Kids Explorer AI — Admin Panel

React + Vite + Tailwind CSS + Recharts + Supabase. Manages content, themes, ads and reports for **both** the website and the Android app.

## Run
```bash
npm install
npm run dev        # http://localhost:5174
npm run lint
npm run build      # → dist/ (host privately)
```

## Modes
* **Demo mode** (no `.env`): sign in with any email/password; data lives in this browser; sample analytics; export `content.json` for static hosting.
* **Supabase mode**: copy `.env.example` → `.env`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, run [`../supabase/schema.sql`](../supabase/schema.sql), seed with `node ../scripts/seed-supabase.mjs`, create your user and add it to `admins`. See [../supabase/README.md](../supabase/README.md).

## Pages
Dashboard · Reports · Storybook Builder · Video Curator · Alphabet & Words · Explore Topics · Quiz/GK · Talking Buddy · Themes & Gender · App Settings · AdMob (Android) · Import/Export.
How to use each one: [../docs/ADMIN_GUIDE.md](../docs/ADMIN_GUIDE.md).

## Structure
```
src/lib/api.js           Supabase / demo data layer (auth, CRUD, uploads, events)
src/lib/AdminContext.jsx state + optimistic saves with rollback
src/lib/stats.js         event aggregation for charts, CSV export
src/lib/buddyEngine.js   same engine as the apps (powers the test console)
src/components/ui.jsx    Tailwind UI kit (cards, fields, toggles, modal, media upload)
src/pages/*              one file per screen
```
