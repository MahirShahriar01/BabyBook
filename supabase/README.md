# 🗄️ Supabase backend (optional, free tier is enough)

1. Create a project at <https://supabase.com> → note **Project URL** and **anon public key** (Settings → API).
2. **SQL Editor** → paste and run [`schema.sql`](schema.sql). It creates the tables, RLS policies, reporting views and the public `media` storage bucket.
3. **Seed sample content** from your computer (service-role key from Settings → API — keep it secret):
   ```bash
   SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
   ```
4. **Create your admin**: Authentication → Users → *Add user* (email + password), then in SQL:
   ```sql
   insert into public.admins (user_id, email, role)
   select id, email, 'owner' from auth.users where email = 'you@example.com';
   ```
   Disable public sign-ups (Authentication → Providers → Email → *Allow new users to sign up* off).
5. Put URL + anon key in `admin/.env`, `web/.env` and the Flutter `--dart-define`s.

## Optional: Talking Buddy cloud AI
```bash
supabase functions deploy buddy --no-verify-jwt
supabase secrets set AI_API_KEY=... AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai AI_MODEL=gemini-2.0-flash
supabase secrets set ALLOWED_ORIGINS=https://your-kids-site.com
```
Then Admin → Talking Buddy → *Use cloud AI* → `https://<project>.functions.supabase.co/buddy`. Any OpenAI-compatible provider works (Gemini free tier, OpenAI `gpt-4o-mini`, Groq, OpenRouter, local Ollama). The on-device safety filter runs first; the child's name is never sent.

## Tables
`app_settings`, `languages`, `stories`, `videos`, `topics`, `quiz` (JSONB `data` + `published`/`enabled` + `sort`), `events` (anonymous, insert-only for apps), `admins` (owner / editor / viewer). Views: `report_daily`, `report_top_items`.
