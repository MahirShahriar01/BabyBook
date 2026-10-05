# 📲 Google Play Release Guide (Kids / Families)

Apps for children must follow the **Google Play Families Policy**, the **Families Self-Certified Ads SDK Program**, **COPPA** (US) and **GDPR-K** (EU). This project is built for that; this checklist finishes the job.

References: [Families policy](https://support.google.com/googleplay/android-developer/answer/9893335) · [AdMob child-directed settings](https://support.google.com/admob/answer/6223431) · [Families Self-Certified Ads SDK](https://support.google.com/googleplay/android-developer/answer/12918983).

## ✅ What the code already does

| Requirement | Where |
|---|---|
| Child-directed ad requests (`ageRestrictedTreatment: child`), G rating | `mobile/lib/services/ads_service.dart` |
| Non-personalized ads only, no remarketing | `AdRequest(nonPersonalizedAds: true)` |
| **No advertising ID** (`AD_ID` permission removed) | `android/app/src/main/AndroidManifest.xml` |
| Uses Google Mobile Ads SDK ≥ 20.6 (Families-certified) | `google_mobile_ads` 9.x |
| Ads never inside learning activities; interstitial frequency cap; rewarded only behind parental gate | `ads_service.dart`, `parents_screen.dart` |
| Remote kill-switch for all ads | Admin → AdMob |
| No accounts, no personal data collection, no outbound links for kids | whole app |
| Parental gate for grown-up areas | `parentalGate()` in `widgets/common.dart` |
| Microphone used only on tap, only on-device speech | `speech_service.dart` |
| `allowBackup=false`, cleartext traffic disabled | manifest |

## 1. AdMob setup
1. Create an AdMob account → **Apps → Add app** (Android, not yet published).
2. Create ad units: **Banner**, **Interstitial**, **Rewarded**.
3. In the AdMob app settings, set **"Designed for families"** / child-directed treatment and **max ad content rating G**. Under *Blocking controls*, block sensitive categories.
4. Put the **App ID** in the build (`-PadmobAppId=…`) and unit IDs in **Admin → AdMob**. Keep **Test mode ON** until the app is approved and live.
5. Add `app-ads.txt` to your developer website.

## 2. Build the release
See [BUILD_GUIDE.md §4](BUILD_GUIDE.md#4-android-app-mobile): unique application ID, launcher icon, keystore, `flutter build appbundle --release`.

## 3. Play Console
1. **Create app** → name "Kids Explorer AI" (or yours), App, Free.
2. **Store listing**: short & full description, 512×512 icon, 1024×500 feature graphic, ≥ 4 phone screenshots + 7"/10" tablet screenshots. No misleading claims ("#1", "best"), no calls to action aimed at kids to buy/download.
3. **App content**:
   * **Privacy policy** URL → host [PRIVACY_POLICY.md](PRIVACY_POLICY.md) (edited) on your website.
   * **Ads**: *Yes, contains ads*.
   * **App access**: all functionality available without login.
   * **Target audience and content**: select age groups **5 & under, 6–8, 9–12** (only children → "Designed for Families"). Confirm the app complies with the Families policy.
   * **Content rating** (IARC questionnaire): educational, no violence, no user-to-user communication, no purchases → typically *Everyone / PEGI 3*.
   * **Data safety** (see below).
   * **Government apps / financial / health**: No.
4. **Teacher Approved** (optional): apply once live for the "Kids" tab badge.
5. Upload the `.aab` to **Internal testing** → test on real devices → **Closed testing** (new personal developer accounts need 12+ testers for 14 days) → **Production**.

## 4. Data safety form (default configuration)

| Question | Answer |
|---|---|
| Does the app collect or share user data? | **Yes** if Supabase analytics or AdMob are enabled; otherwise No |
| Data types | *App activity → App interactions* (anonymous, e.g. "story finished"); *Device or other IDs*: **No** (AD_ID removed) |
| Is data encrypted in transit? | Yes (HTTPS only) |
| Can users request deletion? | Yes — "Erase all data on this device" in Grown-ups zone; analytics are anonymous |
| Purpose | Analytics (improving content); Advertising (AdMob, non-personalized) |
| Audio | Voice is processed by the device's speech service for the feature and **not collected** by the app. If you enable cloud AI, declare *Audio/Messages → typed text sent for app functionality, not stored*. |

## 5. Pre-launch checklist
- [ ] Unique application ID & signing key backed up (Play App Signing enabled)
- [ ] Real AdMob App ID compiled in; test mode left ON until approval
- [ ] Privacy policy published and linked in-app (Grown-ups zone) and in Play Console
- [ ] Every video in the curator reviewed by a human; prefer "Made for Kids" channels
- [ ] Stories/images you upload are yours or licensed
- [ ] `flutter analyze` and `flutter test` pass; tested on a low-end phone and a tablet
- [ ] Bangla/Hindi voices tested (Google TTS language packs)
- [ ] Version code incremented
