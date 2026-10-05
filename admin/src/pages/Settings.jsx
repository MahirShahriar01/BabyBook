import { useState } from 'react';
import { useAdmin } from '../lib/AdminContext.jsx';
import { Button, Card, Field, Input, PageHeader, TextArea, Toggle } from '../components/ui.jsx';

const FEATURES = {
  alphabet: ['🔤', 'Alphabet & phonics'],
  explore: ['🦁', 'Explore topics'],
  stories: ['📖', 'Stories'],
  games: ['🧩', 'Brain games'],
  quiz: ['❓', 'Quiz / GK'],
  videos: ['📺', 'Cartoon videos'],
  buddy: ['🤖', 'Talking Buddy'],
  ailab: ['🧪', 'AI Lab'],
  rewards: ['🎁', 'Stars, stickers & missions'],
  parents: ['👨‍👩‍👧', 'Grown-ups zone'],
};

export default function Settings() {
  const { bundle, saveSettings } = useAdmin();
  const [s, setS] = useState(() => JSON.parse(JSON.stringify(bundle.settings)));
  const order = s.homeOrder || Object.keys(FEATURES).slice(0, 8);
  const moveKey = (i, d) => {
    const a = [...order];
    [a[i], a[i + d]] = [a[i + d], a[i]];
    setS({ ...s, homeOrder: a });
  };

  return (
    <>
      <PageHeader icon="⚙️" title="App Settings" subtitle="Global settings for both the website and the Android app." actions={<Button onClick={() => saveSettings(s)}>💾 Save & publish</Button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="🏷️ Branding">
          <div className="space-y-3">
            <Field label="App name">
              <Input value={s.appName} onChange={(v) => setS({ ...s, appName: v })} />
            </Field>
            <Field label="Tagline">
              <Input value={s.tagline} onChange={(v) => setS({ ...s, tagline: v })} />
            </Field>
            <Field label="📣 Announcement banner (optional)" hint="Shown on the kids' home screen, e.g. 'New story every Friday!'">
              <TextArea value={s.announcement} onChange={(v) => setS({ ...s, announcement: v })} rows={2} />
            </Field>
          </div>
        </Card>

        <Card title="🧩 Features (level map)">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(FEATURES).map(([k, [icon, label]]) => (
              <Toggle key={k} checked={s.features[k] !== false} onChange={(v) => setS({ ...s, features: { ...s.features, [k]: v } })} label={`${icon} ${label}`} />
            ))}
          </div>
          <h4 className="mb-2 mt-5 font-bold">Level order on the home map</h4>
          <ol className="space-y-1">
            {order.map((k, i) => (
              <li key={k} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span className="w-16 text-xs font-bold text-slate-400">Level {i + 1}</span>
                <span className="flex-1">
                  {FEATURES[k]?.[0]} {FEATURES[k]?.[1] || k}
                </span>
                <Button size="sm" variant="subtle" disabled={i === 0} onClick={() => moveKey(i, -1)}>
                  ↑
                </Button>
                <Button size="sm" variant="subtle" disabled={i === order.length - 1} onClick={() => moveKey(i, 1)}>
                  ↓
                </Button>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="🎂 Age groups">
          <div className="space-y-2">
            {s.ageGroups.map((g, i) => (
              <div key={g.id} className="grid grid-cols-[70px_60px_1fr_100px] gap-2">
                <Input value={g.id} disabled />
                <Input value={g.emoji} onChange={(v) => setS({ ...s, ageGroups: s.ageGroups.map((x, k) => (k === i ? { ...x, emoji: v } : x)) })} />
                <Input value={g.label} onChange={(v) => setS({ ...s, ageGroups: s.ageGroups.map((x, k) => (k === i ? { ...x, label: v } : x)) })} />
                <Input value={g.range} onChange={(v) => setS({ ...s, ageGroups: s.ageGroups.map((x, k) => (k === i ? { ...x, range: v } : x)) })} />
              </div>
            ))}
            <p className="text-xs text-slate-400">Group IDs are used to tag content, so they cannot be renamed.</p>
          </div>
        </Card>

        <Card title="⏱️ Healthy screen time & rewards">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Default daily limit (minutes, 0 = none)">
              <Input type="number" min={0} value={s.screenTime.defaultDailyMinutes} onChange={(v) => setS({ ...s, screenTime: { ...s.screenTime, defaultDailyMinutes: v } })} />
            </Field>
            <Field label="Break reminder every (minutes)">
              <Input type="number" min={0} value={s.screenTime.breakReminderMinutes} onChange={(v) => setS({ ...s, screenTime: { ...s.screenTime, breakReminderMinutes: v } })} />
            </Field>
            <Field label="Stars per activity">
              <Input type="number" min={1} value={s.rewards.starsPerActivity} onChange={(v) => setS({ ...s, rewards: { ...s.rewards, starsPerActivity: v } })} />
            </Field>
            <Field label="Daily missions">
              <Input type="number" min={0} max={5} value={s.dailyMissions} onChange={(v) => setS({ ...s, dailyMissions: v })} />
            </Field>
          </div>
          <Field label="Sticker collection (emojis separated by spaces)" className="mt-3">
            <Input value={s.rewards.stickers.join(' ')} onChange={(v) => setS({ ...s, rewards: { ...s.rewards, stickers: v.split(/\s+/).filter(Boolean) } })} />
          </Field>
        </Card>

        <Card title="📺 Video player">
          <div className="space-y-3">
            <Toggle checked={s.video?.privacyEnhanced !== false} onChange={(v) => setS({ ...s, video: { ...s.video, privacyEnhanced: v } })} label="Privacy-enhanced YouTube (youtube-nocookie.com)" />
            <Toggle checked={s.video?.allowFullscreen !== false} onChange={(v) => setS({ ...s, video: { ...s.video, allowFullscreen: v } })} label="Allow fullscreen" />
            <Field label="Categories (comma separated)">
              <Input value={(s.video?.categories || []).join(', ')} onChange={(v) => setS({ ...s, video: { ...s.video, categories: v.split(',').map((x) => x.trim()).filter(Boolean) } })} />
            </Field>
          </div>
        </Card>
      </div>
    </>
  );
}
