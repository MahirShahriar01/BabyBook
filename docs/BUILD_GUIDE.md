# 🛠️ Build Guide — Windows & macOS

This guide takes you from a fresh computer to:

1. the **kids website** running and built for hosting,
2. the **admin panel** running and built,
3. a signed **Android App Bundle (.aab)** for Google Play (and an APK for testing).

> Commands marked **(Win)** are for Windows PowerShell; **(mac)** for macOS Terminal (zsh). Everything else is the same on both.

---

## 0. Get the code

```bash
git clone https://github.com/MahirShahriar01/BabyBook.git
cd BabyBook
```

Each branch is self-contained: `feature/web-app`, `feature/mobile-app`, `feature/admin-panel`. The integration branch has all three folders.

```bash
git checkout feature/web-app     # or feature/mobile-app / feature/admin-panel
```

---

## 1. Install the tools

### Node.js 20 LTS or newer (website + admin)

| | Steps |
|---|---|
| **Windows** | Download the LTS installer from <https://nodejs.org> → run it (keep "Add to PATH" ticked). Or: `winget install OpenJS.NodeJS.LTS` |
| **macOS** | `brew install node@20` (install Homebrew from <https://brew.sh> first) — or the macOS installer from nodejs.org |

Check: `node -v` (v20+) and `npm -v`.

### Git

* **Windows:** `winget install Git.Git` (or <https://git-scm.com>).
* **macOS:** `xcode-select --install` (installs git) or `brew install git`.

### Flutter + Android (mobile app only)

1. **Android Studio** (includes the Android SDK and emulator): <https://developer.android.com/studio>
   * First launch → *More Actions → SDK Manager* → install **Android SDK Platform (latest)**, **Android SDK Command-line Tools**, **Android SDK Build-Tools**, **Android Emulator**.
   * *Device Manager* → create a virtual device (e.g. Pixel 8, API 35).
2. **Flutter SDK 3.47+ (stable)**: <https://docs.flutter.dev/get-started/install>

   **(Win)**
   ```powershell
   # unzip flutter_windows_x.y.z-stable.zip to C:\src\flutter, then:
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\src\flutter\bin", "User")
   # open a NEW terminal
   flutter --version
   ```
   **(mac)**
   ```bash
   brew install --cask flutter        # or unzip to ~/development/flutter
   flutter --version
   ```
3. Accept licenses and check the setup:
   ```bash
   flutter doctor --android-licenses
   flutter doctor
   ```
   All Android items should be ✓. (On macOS the Xcode / iOS items can be ignored — this project targets Android.)
4. **Java**: Android Studio ships a JDK 17+; `flutter doctor` finds it automatically. If not:
   `flutter config --jdk-dir "<Android Studio>/jbr"` (Win: `C:\Program Files\Android\Android Studio\jbr`, mac: `/Applications/Android Studio.app/Contents/jbr/Contents/Home`).

---

## 2. Website (`web/`)

```bash
cd web
npm install
npm run dev          # http://localhost:5173  (also on your Wi-Fi IP for tablets)
```

**Configure (optional)** — copy the example env file and fill in values:

**(Win)** `copy .env.example .env`   **(mac)** `cp .env.example .env`

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Live content + anonymous analytics from Supabase |
| `VITE_CONTENT_URL` | Or: a static `content.json` exported from the admin panel |
| `VITE_BUDDY_AI_URL` | Optional cloud brain for the Talking Buddy |

Without any of these, the site uses the bundled sample content.

**Build for hosting**

```bash
npm run lint && npm test
npm run build        # output: web/dist/
npm run preview      # test the production build locally
```

`dist/` is plain static files (hash routing, relative paths) → upload to **Netlify, Vercel, GitHub Pages, Firebase Hosting, Cloudflare Pages, cPanel** or any web server. HTTPS is required for microphone access (speech recognition).

> 🎤 Voice input works in **Chrome, Edge and Safari**. Firefox can listen to speech but not recognize it; the buddy then offers typing.

---

## 3. Admin panel (`admin/`)

```bash
cd admin
npm install
npm run dev          # http://localhost:5174
```

* **Demo mode** (no `.env`): sign in with any email/password. Edits are stored in this browser. Use *Import / Export → Download content.json* to publish.
* **Production**: create `admin/.env` from `.env.example` with your Supabase URL + anon key, then follow [supabase/README.md](../supabase/README.md) to create tables and your admin user.

```bash
npm run lint
npm run build        # output: admin/dist/  → host it privately (e.g. Netlify with password, Cloudflare Access)
```

---

## 4. Android app (`mobile/`)

### Run on an emulator or phone

```bash
cd mobile
flutter pub get
flutter devices              # start the emulator from Android Studio, or plug in a phone with USB debugging on
flutter run
```

Connect to your backend (optional) with `--dart-define`:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=YOUR-ANON-KEY
# or a static bundle:
flutter run --dart-define=CONTENT_URL=https://your-site.com/content.json
```

> **(Win)** PowerShell uses a backtick `` ` `` for line continuation instead of `\` — or put everything on one line.

### Tests & checks

```bash
flutter analyze
flutter test
```

### Test APK

```bash
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk  (install with: adb install -r app-release.apk)
```

Without `key.properties` the release build is signed with the debug key — fine for testing, **not** for Play Store.

### Play Store App Bundle (signed)

1. **Create an upload keystore (once; keep it safe & backed up!)**

   **(Win)**
   ```powershell
   keytool -genkey -v -keystore $env:USERPROFILE\upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
   **(mac)**
   ```bash
   keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
   (`keytool` is in Android Studio's JBR: `"<Android Studio>/jbr/bin/keytool"` if it's not on PATH.)

2. **Create `mobile/android/key.properties`** (copy `key.properties.example`; it is git-ignored):
   ```properties
   storePassword=•••
   keyPassword=•••
   keyAlias=upload
   storeFile=C:/Users/you/upload-keystore.jks      # Win (forward slashes)
   # storeFile=/Users/you/upload-keystore.jks      # mac
   ```

3. **Set your real AdMob App ID** (from the AdMob console) and build:
   ```bash
   flutter build appbundle --release \
     -PadmobAppId=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY \
     --dart-define=SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
     --dart-define=SUPABASE_ANON_KEY=YOUR-ANON-KEY
   # → build/app/outputs/bundle/release/app-release.aab
   ```
   Alternatively set the environment variable `ADMOB_APP_ID` before building. Ad **unit** IDs are set remotely in the admin panel.

4. **Version bump** for every upload: edit `version:` in `mobile/pubspec.yaml` (`1.0.1+2` → name `1.0.1`, code `2`).

5. **Before you publish**
   * Change the application ID `com.kidsexplorer.kids_explorer` in `android/app/build.gradle.kts` (and the Kotlin package folder) to your own — it can never change after the first upload.
   * Replace the launcher icon: add [`flutter_launcher_icons`](https://pub.dev/packages/flutter_launcher_icons) or replace `android/app/src/main/res/mipmap-*/ic_launcher.png`.
   * Follow [PLAY_STORE_RELEASE.md](PLAY_STORE_RELEASE.md).

---

## 5. Keeping content in sync

Content lives in `shared/content/*.json`. After editing those files run:

```bash
node scripts/sync-content.mjs     # regenerates web/src/data, admin/src/data, mobile/assets/content
```

To load the sample content into Supabase the first time:

```bash
# (mac)
SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
# (Win PowerShell)
$env:SUPABASE_URL="https://xyz.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/seed-supabase.mjs
```

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails behind a proxy | `npm config set proxy http://…` / `https-proxy` |
| Port 5173 busy | `npm run dev -- --port 5180` |
| `flutter doctor` → *cmdline-tools component is missing* | Android Studio → SDK Manager → SDK Tools → tick *Android SDK Command-line Tools* |
| `Android license status unknown` | `flutter doctor --android-licenses` and accept all |
| Gradle: *minSdk 24 required* | already set in `build.gradle.kts` (AdMob needs API 24+) |
| App has no voice | Android Settings → *Text-to-speech output* → install Google TTS + the language (e.g. Bangla) |
| Mic does nothing on Android | Allow the microphone permission; install/enable *Speech Services by Google* |
| No Bangla voice on the website | Use Chrome on Android, or install a Bangla voice in Windows/macOS speech settings |
| Ads don't show | Keep *Test mode* on until the AdMob app is approved; new ad units take up to an hour |
| Windows: `flutter` not recognized | Open a new terminal after editing PATH; check `where flutter` |
| macOS: "developer cannot be verified" for Flutter | `xattr -dr com.apple.quarantine ~/development/flutter` |
