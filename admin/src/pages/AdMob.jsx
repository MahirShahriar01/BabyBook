import { useState } from 'react';
import { useAdmin } from '../lib/AdminContext.jsx';
import { Badge, Button, Card, Field, Input, PageHeader, Select, Toggle } from '../components/ui.jsx';

const TEST = {
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  bannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
  interstitialUnitId: 'ca-app-pub-3940256099942544/1033173712',
  rewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
};

export default function AdMob() {
  const { bundle, saveSettings } = useAdmin();
  const [ads, setAds] = useState(() => ({ ...bundle.settings.ads }));
  const set = (p) => setAds((a) => ({ ...a, ...p }));
  const usingTestIds = Object.entries(TEST).some(([k, v]) => ads[k] === v);

  return (
    <>
      <PageHeader
        icon="💰"
        title="AdMob Control (Android)"
        subtitle="Remote switches for ads in the Android app. The website shows no ads."
        actions={<Button onClick={() => saveSettings({ ...bundle.settings, ads }, 'Ad settings saved')}>💾 Save & publish</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="🔌 Ad switches">
          <div className="space-y-4">
            <Toggle checked={ads.enabled} onChange={(v) => set({ enabled: v })} label="Ads enabled" hint="Master switch — turns every ad off instantly without an app update." />
            <Toggle checked={ads.testMode} onChange={(v) => set({ testMode: v })} label="Test mode" hint="Forces Google's test ad units. Keep ON until your AdMob app is approved." />
            <hr />
            <Toggle checked={ads.banner} onChange={(v) => set({ banner: v })} label="Banner (bottom of menus only)" hint="Never shown inside games, stories, buddy or video player." />
            <Toggle checked={ads.interstitial} onChange={(v) => set({ interstitial: v })} label="Interstitial (between activities)" />
            <Field label="Show an interstitial after every N finished activities">
              <Input type="number" min={2} max={20} value={ads.interstitialEveryN} onChange={(v) => set({ interstitialEveryN: Math.max(2, v) })} />
            </Field>
            <Toggle checked={ads.rewarded} onChange={(v) => set({ rewarded: v })} label="Rewarded (optional bonus stickers)" hint="Only after a grown-up gate. Kids are never forced to watch." />
          </div>
        </Card>

        <Card title="🛡️ Families policy / COPPA">
          <div className="space-y-4">
            <Toggle checked disabled onChange={() => {}} label="tagForChildDirectedTreatment = true" hint="Required: app targets children. Locked on." />
            <Toggle checked disabled onChange={() => {}} label="tagForUnderAgeOfConsent = true" hint="GDPR: treat users as under the age of consent. Locked on." />
            <Toggle checked disabled onChange={() => {}} label="Non-personalized ads only (npa=1)" hint="No interest-based ads or remarketing. Locked on." />
            <Field label="Max ad content rating">
              <Select value={ads.maxAdContentRating} onChange={(v) => set({ maxAdContentRating: v })} options={[{ value: 'G', label: 'G — general audiences (recommended)' }, { value: 'PG', label: 'PG — parental guidance' }]} />
            </Field>
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              The Android app also removes the <code>AD_ID</code> permission and only uses Google-certified Families ads SDK. Set your AdMob app&apos;s{' '}
              <b>&quot;Designed for families&quot;</b> and child-directed settings in the AdMob console too.
            </div>
          </div>
        </Card>

        <Card title="🆔 Ad unit IDs" className="xl:col-span-2" actions={usingTestIds ? <Badge color="amber">Using Google test IDs</Badge> : <Badge color="green">Production IDs</Badge>}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="AdMob App ID (also set in android/app/src/main/AndroidManifest.xml)" hint="Changing the App ID requires a new app build.">
              <Input className="font-mono" value={ads.androidAppId} onChange={(v) => set({ androidAppId: v.trim() })} />
            </Field>
            <Field label="Banner unit ID">
              <Input className="font-mono" value={ads.bannerUnitId} onChange={(v) => set({ bannerUnitId: v.trim() })} />
            </Field>
            <Field label="Interstitial unit ID">
              <Input className="font-mono" value={ads.interstitialUnitId} onChange={(v) => set({ interstitialUnitId: v.trim() })} />
            </Field>
            <Field label="Rewarded unit ID">
              <Input className="font-mono" value={ads.rewardedUnitId} onChange={(v) => set({ rewardedUnitId: v.trim() })} />
            </Field>
          </div>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => set(TEST)}>
            ↺ Reset to Google test IDs
          </Button>
        </Card>
      </div>
    </>
  );
}
