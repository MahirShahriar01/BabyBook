# 🛠️ Admin Panel Guide

Open the admin panel (`npm run dev` in `admin/`, or your hosted URL) and sign in.
The header badge shows **● Live · Supabase** (changes reach the apps on their next launch) or **● Demo mode** (changes stay in this browser — export `content.json` to publish).

## Dashboard 📊
Sessions today/yesterday, sessions in the selected period, stories finished, games won, daily active sessions split by **Website / Android**, top stories, popular brain games, most-watched videos, age groups, theme popularity, platform split and activity per module. Choose 7 / 14 / 30 / 90 days.

## Reports 📈
Filter raw anonymous events by type, platform and item; see explore items, languages and hero choices; **Export CSV** for Excel / Google Sheets. Owners can clear analytics.

## Storybook Builder 📖
1. **＋ New story** → title, emoji, color, language, target ages.
2. Add **pages**: scene emojis (shown as animated illustration) *or* upload an illustration; the page text (read aloud with word highlighting); optional narration audio (overrides text-to-speech).
3. Write the **moral** and add **quiz questions** (select the radio button next to the correct answer).
4. Toggle **Published** and save. Use ↑ ↓ in the list to change the order kids see.

## Video Curator 📺
Paste any YouTube link (watch, youtu.be, shorts, embed) — the ID and thumbnail are detected automatically and a preview plays. Pick category and **ages** (each kid only sees videos tagged with their age group). Vimeo and direct `.mp4` links work on the website. Only add videos you have watched.

## Alphabet & Words 🔤
* Edit a language: code, names, flag, **voice locale** (e.g. `bn-BD`, `ar-SA`) and groups (e.g. Vowels, Consonants, Numbers).
* **Quick add letters**: type `ا ب ت ث` and press Add.
* For each letter: sound hint, words (emoji, word, meaning) and optional phonics audio.
* **＋ Add language** to support any new language — the apps show it immediately (alphabet grid, tracing, pronunciation practice).

## Explore Topics 🦁
Create topics (animals, ships, dinosaurs …) with an emoji, color and **animation** (`drive`, `sail`, `fly`, `orbit`, `spin`, …). Items have name, Bangla name, sound ("Roar!") and a spoken fun fact.

## Quiz / GK ❓
2–4 options, one correct answer, ages, published.

## Talking Buddy 🤖
* **Voice personas** — name, emoji, **pitch** and **speed**; press 🔊 to hear. Choose the default persona.
* **Languages** the buddy speaks.
* **Cloud AI** (optional) — turn on and paste your Edge Function URL. Leave off for the 100% free on-device mode.
* **Knowledge base** per language: greeting, praise words, grammar/dialect **corrections** (regex `pattern` → `replace` + kid-friendly `tip`), **polite phrasing**, **baby-talk → formal word** with meaning, **questions & answers** (keywords → answer), pronunciation practice words and 🛡️ safety words.
* The **test console** shows exactly how the buddy will respond while you edit; invalid regex is flagged before saving.

## Themes & Gender 🎨
* **Theme mode**: *Kid chooses* · *Automatic by gender* · *One theme for everyone*.
* **Gender → theme** mapping and the list of **heroes** (emoji, name, gender).
* Edit any theme's 7 colors with live preview, duplicate or delete themes, change the font.

## App Settings ⚙️
Branding & announcement banner, **feature switches** (turn modules on/off), **level order** on the home map, age group labels, default **screen-time limit** and **break reminders**, stars per activity, daily missions, sticker collection, video player options.

## AdMob (Android) 💰
Master switch, test mode, banner / interstitial (every N activities) / rewarded toggles, ad unit IDs. Families-policy flags (child-directed, under age of consent, non-personalized) are locked on. Changing the **App ID** needs a new app build; unit IDs and switches apply remotely.

## Import / Export 💾
Download `content.json` (backup or static hosting), import a file, reset demo data.

## Team & roles (Supabase)
Add rows to the `admins` table: `owner` (everything + team + delete analytics), `editor` (content & settings), `viewer` (dashboard/reports only).
