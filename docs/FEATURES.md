# ✨ Features & Learning Design

## Why it is built this way

Before building, we looked at what the most effective children's learning apps do ([Khan Academy Kids](https://blog.khanacademy.org/?p=21481), Lingokids, Duolingo ABC) and at Google Play's rules for kids' apps:

| Research insight | How Kids Explorer AI applies it |
|---|---|
| Adapt to the child's age — a 3-year-old and a 7-year-old need different experiences | Age chosen in onboarding filters stories, videos, topics, quiz; games scale (3×3 picture Sudoku → 6×6; counting → × tables; 3 → 8 memory pairs); toddlers get a mic-only buddy |
| Short lessons (≤ 5 min) keep kids motivated | Every activity is a bite-size "level": one letter, one story, one puzzle |
| Progress at their own pace through levels | Adventure map with levels, stars → level ups, badges |
| Learning through play, puzzles and vivid visuals | Animated tiles, themed animations (cars drive, ships sail, planets orbit), confetti, sound effects |
| Multisensory phonics (see, hear, say, write) | Letter → sound → word card (see/hear) → tracing (write) → speak & get stars (say) |
| Spaced, varied practice | Daily missions rotate across modules; streaks reward coming back |
| Social-emotional learning and good habits matter as much as ABC | "Feelings" and "Good Habits" explore topics; stories end with a moral |
| Healthy screen time | Daily limit + wiggle-break reminders, parent override |
| Families policy: no personal data, child-directed ads, parental gates | No accounts; on-device storage; AdMob child-directed + non-personalized; maths gate for grown-ups |

## Module by module

### 🎮 Onboarding (4 levels)
Animated robot mascot asks — and *speaks* — each question: **name** (live "Hello Rafi!" preview) → **age** (bouncing balloons 2–4 / 5–7 / 8–10+) → **hero** (Boy, Girl, Superhero, Robot, Cosmic Explorer, Unicorn) → **magic colors** (themes; the one matching the hero is marked "★ for you"). English or বাংলা interface.

### 🗺️ Home & motivation
Greeting by time of day, level & progress bar, 🔥 streak, 🎯 3 daily missions, adventure map (admin decides order and which levels exist), sticker book (new sticker every 5 ⭐), 7 badges, admin announcement banner.

### 🔤 Alphabet & phonics
Languages: English (26), Bangla (11 vowels, 39 consonants, 10 numerals), Spanish (27 incl. Ñ), French (26), Hindi (12 vowels, 31 consonants) — plus any language the admin adds. Letter pop-in animations, giant gradient letter, "A for Apple" voice-over, animated word cards with meanings, **tracing canvas with sparkle particles and coverage detection**, **pronunciation scoring** (0–3 ⭐ + slow syllable model).

### 📖 Storyteller
8 sample stories (Thirsty Crow, Lion & Mouse, Tortoise & Hare, Ant & Grasshopper, Boy Who Cried Wolf, Robo & the Little Seed, তৃষ্ণার্ত কাক, La Gallina de los Huevos de Oro). 3D page-flip, swipe, **read-to-me with word highlighting**, auto-play mode, uploaded narration audio, moral card, quiz, stars.

### 📺 Cartoon hub
Admin-curated YouTube (and Vimeo / MP4 on web) by age group and category; privacy-enhanced embed; no outbound links.

### 🧩 Brain games
Kids Sudoku (3×3 pictures, 4×4, 6×6 with hint & conflict highlighting), Memory Match (4 themes), What Comes Next (AB/AAB/ABC… and number sequences, drag & drop), Number Pop (counting, addition, subtraction, multiplication by age), Odd One Out (cross-topic reasoning).

### 🌍 Explore (15 topics, 141 items)
Animals, Birds, Fruits & Veggies, Vehicles, Ships & Boats, Planes & Sky, Shapes, Colors, Numbers 1–10, Countries (flags & capitals), Space, My Body, Helpers & Jobs, Feelings, Good Habits. Each item: emoji animation matched to the topic, English + Bangla name, sound, spoken fun fact, "say it" pronunciation, and a **Find-it** listening game.

### ❓ Quiz
Age-filtered general-knowledge rounds of 5.

### 🤖 Talking Buddy
5 voices (Robo Bolt, Magic Bunny, Friendly Bear, Space Astronaut, Sparkle Fairy) × 5 languages. Corrects grammar & dialect, teaches formal/polite words and meanings, fixes punctuation & capitals (with the reason), answers questions, speaks every reply, safety filter. "Say it right" mode for pronunciation practice. Free & on-device; optional cloud AI.

### 🧪 AI Lab
What is AI? (5 animated steps) · Draw & AI guesses (live confidence bars) · Teach the Robot (training data & k-NN) · Can AI predict? (pattern prediction, try to trick it).

### 👨‍👩‍👧 Grown-ups zone
Parental gate → edit profile/theme/languages, daily limit, extra time, learning report per module, privacy summary, optional rewarded ad for bonus stars (Android), erase all data.

### 🛠️ Admin panel
Dashboard & reports (CSV), storybook builder with live preview, video curator with link parsing & preview, alphabet/word manager with bulk letter entry, topic & quiz editors, buddy voices + rule editor + test console, theme designer with gender mapping & forced themes, feature switches & level order, screen-time defaults, AdMob control, import/export, demo mode or Supabase with roles.

## Ideas for next versions
* Offline voice packs bundled per language (Piper / Android offline TTS).
* Handwriting recognition for tracing (ML Kit Digital Ink).
* Teacher/classroom mode with QR-code class codes (still no child accounts).
* iOS build (Flutter code is cross-platform; add Apple Kids Category compliance).
