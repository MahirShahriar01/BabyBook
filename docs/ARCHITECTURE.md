# 🧭 Architecture

## 1. Big picture

```
shared/content/*.json ──sync-content.mjs──► web/src/data/seed.json
        (source of truth for samples)   ├─► admin/src/data/seed.json
                                        └─► mobile/assets/content/seed.json

Admin Panel ──(Supabase JS, authenticated)──► Postgres tables + Storage
Website / Android ──(REST, anon key, read-only)──► published rows
Website / Android ──(REST, insert-only)──► events (anonymous analytics)
Website / Android ──(optional)──► Edge Function "buddy" ──► Gemini / OpenAI-compatible LLM
```

Every app starts from its **bundled seed**, then shows the **last cached remote copy**, then refreshes in the background. The kids never wait for the network and the apps work fully offline.

## 2. Content model

All content is JSON (stored as `jsonb` in Supabase so the format is identical everywhere).

| Document | Shape (simplified) |
|---|---|
| `settings` | `appName, tagline, announcement, fontFamily, themeMode ('kid_choice' \| 'gender_auto' \| 'forced'), defaultThemeId, forcedThemeId, genderThemes{boy,girl,neutral}, themes[], ageGroups[], avatars[], features{}, homeOrder[], ads{}, buddy{personas[], languages[], useRemoteAi, remoteAiUrl}, screenTime{}, rewards{}, video{}, dailyMissions` |
| `languages[]` | `code, name, nativeName, flag, ttsLocale, enabled, groups[{title, letters[{char, sound, audio?, words[{word, emoji, meaning}]}]}]` |
| `stories[]` | `id, title, language, emoji, color, ageGroups[], published, pages[{scene, image?, audio?, text}], moral, quiz[{question, options[], answer}]` |
| `videos[]` | `id, title, provider ('youtube' \| 'vimeo' \| 'url'), videoId, url, thumbnail?, ageGroups[], category, published` |
| `topics[]` | `id, title, emoji, color, animation, ageGroups[], published, items[{id, name, emoji, fact, bn?, sound?, hex?, count?, object?}]` |
| `quiz[]` | `id, q, emoji, options[], answer, ageGroups[], published` |
| `buddy{lang}` | `greeting, praise[], correctIntro, perfect, fallback, safetyReply, safety[], questionStarters[], questionEnders[], corrections[{pattern, replace, tip}], polite[...], kidWords{kid:[formal, meaning]}, qa[{keywords[], answer}], practiceWords[]` |

### Supabase tables (`supabase/schema.sql`)

| Table | Columns | Public (anon) | Admin |
|---|---|---|---|
| `app_settings` | `id ('global' \| 'buddy'), data` | read | write (editor) |
| `languages` | `id (code), data, enabled, sort` | read enabled | write |
| `stories`, `videos`, `topics`, `quiz` | `id, data, published, sort` | read published | write |
| `events` | anonymous event columns | **insert only** | read (viewer), delete (owner) |
| `admins` | `user_id, email, role (owner/editor/viewer)` | – | owner manages |
| Storage bucket `media` | images, audio | read | write |

Row Level Security enforces all of this; the anon key shipped inside the apps can never modify content or read analytics.

## 3. Theming & gender

`resolveTheme(settings, profile)` (web: `web/src/lib/theme.js`, Flutter: `Settings.themeFor`):

* **kid_choice** → theme picked in onboarding; if none, the gender preset; else default.
* **gender_auto** → `genderThemes[profile.gender]` (gender comes from the hero/avatar chosen: boy, girl or neutral heroes).
* **forced** → one theme for everybody (events, holidays).

Web applies the theme as CSS custom properties (`--primary`, `--bg-from`, …); Flutter rebuilds `ThemeData` from the same values. Admins change colors, fonts, heroes and mapping live.

## 4. Gamified learning loop

* `complete(kind, info)` is the single entry point every activity calls (letter, story, game, explore, buddy, quiz, ailab, video).
* It adds stars (admin-configurable), increments daily-mission counters, updates the streak, awards a sticker every 5 stars, sends one anonymous event and (Android) paces interstitial ads.
* Level = ⌊stars / 10⌋ + 1. Daily missions rotate deterministically by date across enabled modules.
* Screen time is counted per minute while the app is visible; the admin sets a default limit and wiggle-break interval, parents can override.

## 5. Talking Buddy engine

Same algorithm in JS (`web/src/lib/buddyEngine.js`) and Dart (`mobile/lib/services/buddy_engine.dart`), covered by parity tests in both test suites.

1. **Safety filter** – blocked words → gentle "ask a grown-up" reply. Runs before anything else, also before cloud AI.
2. **Grammar & dialect corrections** – regex rules (`i is` → `I am`, `goed` → `went`, Bangla `খামু` → `খাব`, Hindi `मेरे को` → `मुझे` …).
3. **Baby-talk → formal words** with meanings (`doggy` → `dog`: a friendly pet that barks).
4. **Polite phrasing** (`gimme water` → `May I please have water?`).
5. **Punctuation & capitals** per language (`?`, `.`, `।`, Spanish `¿…?`, capital `I`), each with a kid-friendly tip.
6. **Answer** – "what does X mean" dictionary (built from alphabet words + explore facts) → keyword Q&A → fallback.
7. Reply is shown as text **and** spoken with the selected persona's pitch/speed.

Speech in/out uses the device: Web Speech API in browsers, Android TTS + SpeechRecognizer in Flutter. **No paid API is required.** Optional cloud AI: `supabase/functions/buddy` (any OpenAI-compatible endpoint, e.g. Gemini free tier). The child's name is never sent.

**Pronunciation trainer**: speech-recognition alternatives are compared to the target with Levenshtein similarity → 0–3 stars; for < 3 stars the word is repeated slowly syllable-by-syllable.

## 6. AI Lab algorithms

| Experiment | Algorithm |
|---|---|
| Draw & AI guesses | Web: `$1 Unistroke Recognizer` with generated templates; Flutter: corner counting (Douglas–Peucker) + roundness |
| Teach the Robot | k-nearest-neighbours over animal features (wings, fins, legs, fur, water) — kids label training data, then test |
| Can AI predict? | First-order Markov frequency counting with +1 smoothing |

## 7. Ads (Android only)

`mobile/lib/services/ads_service.dart` — `RequestConfiguration(ageRestrictedTreatment: child, maxAdContentRating: G)`, `AdRequest(nonPersonalizedAds: true)`, `AD_ID` permission removed in the manifest, banners only on menu screens, interstitials only after finished stories/games every N activities, rewarded ads only behind the parental gate. All switches and unit IDs come from the admin panel.

## 8. Security notes

* The admin panel uses Supabase Auth + an `admins` allow-list (`is_admin()` SQL function); RLS protects every table.
* The **service-role key** is only used by `scripts/seed-supabase.mjs` on your machine — never ship it.
* Analytics events contain no name, no device ID, no IP stored by the app (Supabase logs aside).
* Kid-facing apps contain no outbound links; YouTube embeds use privacy-enhanced mode with a tap shield over the title bar (web) and `strictRelatedVideos` (Android).
