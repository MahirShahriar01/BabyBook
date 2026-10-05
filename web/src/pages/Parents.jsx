import { useState } from 'react';
import { useApp } from '../store/AppContext.jsx';
import { Page, ParentalGate, ProgressBar, TopBar } from '../components/ui.jsx';
import { clearAll } from '../lib/progress.js';
import { UI_LANGS } from '../lib/i18n.js';

const KIND_LABELS = { letter: '🔤 Letters', story: '📖 Stories', game: '🧩 Games', explore: '🌍 Explore', buddy: '🤖 Buddy', quiz: '❓ Quiz', ailab: '🧪 AI Lab', video: '📺 Videos' };

export default function Parents() {
  const { settings, profile, setProfile, progress, setProgress, content, limit } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const counts = {};
  for (const [k, v] of Object.entries(progress.done)) {
    const kind = k.split(':')[0];
    counts[kind] = (counts[kind] || 0) + v;
  }

  if (!unlocked) {
    return (
      <Page>
        <TopBar title="Grown-ups" emoji="👨‍👩‍👧" />
        <ParentalGate open onPass={() => setUnlocked(true)} onClose={() => history.back()} />
      </Page>
    );
  }

  const row = { display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, alignItems: 'center', marginTop: 10 };
  const sel = { padding: 10, borderRadius: 14, border: '2px solid rgba(0,0,0,.1)', background: 'var(--surface)', color: 'var(--text)' };

  return (
    <Page>
      <TopBar title="Grown-ups Zone" emoji="👨‍👩‍👧" />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="card">
          <h3>👤 Child profile</h3>
          <div style={row}>
            <label>Name</label>
            <input style={sel} value={profile.name} maxLength={20} onChange={(e) => setProfile({ name: e.target.value })} />
          </div>
          <div style={row}>
            <label>Age group</label>
            <select style={sel} value={profile.age} onChange={(e) => setProfile({ age: e.target.value })}>
              {settings.ageGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.range} · {g.label}
                </option>
              ))}
            </select>
          </div>
          <div style={row}>
            <label>Hero</label>
            <select style={sel} value={profile.avatar} onChange={(e) => {
              const a = settings.avatars.find((x) => x.id === e.target.value);
              setProfile({ avatar: a.id, gender: a.gender });
            }}>
              {settings.avatars.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.name}
                </option>
              ))}
            </select>
          </div>
          <div style={row}>
            <label>Theme</label>
            <select style={sel} value={profile.themeId} onChange={(e) => setProfile({ themeId: e.target.value })} disabled={settings.themeMode !== 'kid_choice'}>
              {settings.themes.map((th) => (
                <option key={th.id} value={th.id}>
                  {th.emoji} {th.name}
                </option>
              ))}
            </select>
          </div>
          {settings.themeMode !== 'kid_choice' && <p className="muted" style={{ fontSize: '0.85rem' }}>Theme is set by the administrator ({settings.themeMode.replace('_', ' ')}).</p>}
          <div style={row}>
            <label>App language</label>
            <select style={sel} value={profile.uiLang} onChange={(e) => setProfile({ uiLang: e.target.value })}>
              {UI_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div style={row}>
            <label>Learning language</label>
            <select style={sel} value={profile.learnLang} onChange={(e) => setProfile({ learnLang: e.target.value })}>
              {content.languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>
          <div style={row}>
            <label>Sound effects</label>
            <input type="checkbox" checked={profile.sound !== false} onChange={(e) => setProfile({ sound: e.target.checked })} style={{ width: 28, height: 28 }} />
          </div>
        </div>

        <div className="card">
          <h3>⏱️ Screen time</h3>
          <p>
            Today: <b>{progress.daily.minutes} min</b> {limit ? `of ${limit} min` : ''}
          </p>
          {limit > 0 && <ProgressBar value={progress.daily.minutes} max={limit} />}
          <div style={row}>
            <label>Daily limit</label>
            <select style={sel} value={progress.limitMinutes} onChange={(e) => setProgress((p) => ({ ...p, limitMinutes: Number(e.target.value) }))}>
              <option value={0}>Default ({settings.screenTime?.defaultDailyMinutes || 0} min)</option>
              {[15, 30, 45, 60, 90, 120, 100000].map((m) => (
                <option key={m} value={m}>
                  {m === 100000 ? 'No limit' : `${m} minutes`}
                </option>
              ))}
            </select>
          </div>
          <button className="btn ghost small" style={{ marginTop: 12 }} onClick={() => setProgress((p) => ({ ...p, daily: { ...p.daily, minutes: 0 } }))}>
            ⏳ Give more time today
          </button>
        </div>

        <div className="card">
          <h3>📊 Learning report</h3>
          <p>
            ⭐ {progress.stars} stars · 🔥 {progress.streak.count} day streak · 🎁 {progress.stickers.length} stickers
          </p>
          {Object.entries(KIND_LABELS).map(([k, label]) => (
            <div key={k} className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <span>{label}</span>
              <b>{counts[k] || 0}</b>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>🔒 Privacy</h3>
          <ul style={{ paddingLeft: 18, margin: '8px 0' }}>
            <li>No sign-up, no account, no email.</li>
            <li>Your child&apos;s name and progress stay in this browser only.</li>
            <li>Only anonymous usage counts (e.g. &quot;a story was read&quot;) are sent, if enabled by the operator.</li>
            <li>Videos play from YouTube in privacy-enhanced mode.</li>
          </ul>
          <button
            className="btn small"
            style={{ background: 'var(--bad)' }}
            onClick={() => {
              if (confirm('Erase the profile and all progress on this device?')) {
                clearAll();
                location.hash = '#/welcome';
                location.reload();
              }
            }}
          >
            🗑️ Erase all data on this device
          </button>
        </div>
      </div>
    </Page>
  );
}
