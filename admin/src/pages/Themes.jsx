import { useState } from 'react';
import { useAdmin } from '../lib/AdminContext.jsx';
import { Badge, Button, Card, ColorInput, Field, Input, PageHeader, Select, Toggle } from '../components/ui.jsx';

const FONTS = ['Baloo 2', 'Fredoka', 'Comic Neue', 'Nunito', 'Poppins', 'Hind Siliguri'];

function Preview({ t, font }) {
  return (
    <div className="overflow-hidden rounded-2xl p-4" style={{ background: `linear-gradient(160deg, ${t.bgFrom}, ${t.bgTo})`, color: t.text, fontFamily: `'${font}', system-ui` }}>
      <div className="mb-3 flex items-center justify-between">
        <b>
          {t.emoji} Hi, Mahi!
        </b>
        <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: t.surface }}>
          ⭐ 12
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[t.primary, t.secondary, t.accent].map((c, i) => (
          <div key={i} className="grid h-16 place-items-center rounded-xl text-2xl text-white shadow" style={{ background: c }}>
            {['🔤', '📖', '🧩'][i]}
          </div>
        ))}
      </div>
      <button className="mt-3 w-full rounded-full py-2 text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}>
        Let&apos;s go!
      </button>
    </div>
  );
}

export default function Themes() {
  const { bundle, saveSettings } = useAdmin();
  const [s, setS] = useState(() => JSON.parse(JSON.stringify(bundle.settings)));
  const [sel, setSel] = useState(0);
  const t = s.themes[sel];
  const setT = (p) => setS((x) => ({ ...x, themes: x.themes.map((th, i) => (i === sel ? { ...th, ...p } : th)) }));
  const themeOpts = s.themes.map((th) => ({ value: th.id, label: `${th.emoji} ${th.name}` }));

  return (
    <>
      <PageHeader
        icon="🎨"
        title="Themes & Gender"
        subtitle="Control colors for the website and Android app remotely. Changes apply on the kids' next app open."
        actions={<Button onClick={() => saveSettings(s, 'Themes saved — apps update on next launch')}>💾 Save & publish</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="🎛️ Theme mode">
          <div className="space-y-3">
            {[
              ['kid_choice', '🧒 Kid chooses', 'Kids pick a theme in onboarding (recommended theme is based on hero/gender).'],
              ['gender_auto', '👦👧 Automatic by gender', 'Theme is set from the hero the kid picked, using the mapping below.'],
              ['forced', '🔒 One theme for everyone', 'Great for events (e.g. Eid, Pohela Boishakh, Christmas).'],
            ].map(([id, label, hint]) => (
              <label key={id} className={`block cursor-pointer rounded-xl border p-3 ${s.themeMode === id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                <input type="radio" className="mr-2" checked={s.themeMode === id} onChange={() => setS({ ...s, themeMode: id })} />
                <b>{label}</b>
                <div className="ml-5 text-xs text-slate-500">{hint}</div>
              </label>
            ))}
            {s.themeMode === 'forced' && (
              <Field label="Theme for everyone">
                <Select value={s.forcedThemeId} onChange={(v) => setS({ ...s, forcedThemeId: v })} options={themeOpts} />
              </Field>
            )}
            <Field label="Default theme">
              <Select value={s.defaultThemeId} onChange={(v) => setS({ ...s, defaultThemeId: v })} options={themeOpts} />
            </Field>
            <Field label="Font">
              <Select value={s.fontFamily} onChange={(v) => setS({ ...s, fontFamily: v })} options={FONTS} />
            </Field>
          </div>
        </Card>

        <Card title="👦👧 Gender → theme">
          <div className="space-y-3">
            {['boy', 'girl', 'neutral'].map((g) => (
              <Field key={g} label={{ boy: '👦 Boy', girl: '👧 Girl', neutral: '🦸 Other heroes' }[g]}>
                <Select value={s.genderThemes[g]} onChange={(v) => setS({ ...s, genderThemes: { ...s.genderThemes, [g]: v } })} options={themeOpts} />
              </Field>
            ))}
            <h4 className="pt-2 font-bold">🦸 Heroes (avatars)</h4>
            {s.avatars.map((a, i) => (
              <div key={i} className="grid grid-cols-[60px_1fr_110px_32px] gap-2">
                <Input value={a.emoji} onChange={(v) => setS({ ...s, avatars: s.avatars.map((x, k) => (k === i ? { ...x, emoji: v } : x)) })} />
                <Input value={a.name} onChange={(v) => setS({ ...s, avatars: s.avatars.map((x, k) => (k === i ? { ...x, name: v } : x)) })} />
                <Select value={a.gender} onChange={(v) => setS({ ...s, avatars: s.avatars.map((x, k) => (k === i ? { ...x, gender: v } : x)) })} options={['boy', 'girl', 'neutral']} />
                <Button size="sm" variant="ghost" onClick={() => setS({ ...s, avatars: s.avatars.filter((_, k) => k !== i) })}>
                  ×
                </Button>
              </div>
            ))}
            <Button size="sm" variant="subtle" onClick={() => setS({ ...s, avatars: [...s.avatars, { id: `a${Date.now().toString(36)}`, emoji: '🐯', name: 'Tiger', gender: 'neutral' }] })}>
              ＋ Add hero
            </Button>
          </div>
        </Card>

        <Card title="👀 Live preview">
          <Preview t={t} font={s.fontFamily} />
          <div className="mt-3 flex flex-wrap gap-2">
            {s.themes.map((th, i) => (
              <button key={th.id} onClick={() => setSel(i)} className={`rounded-full border px-3 py-1 text-sm ${i === sel ? 'border-brand-500 bg-brand-50 font-bold' : 'border-slate-200'}`}>
                {th.emoji} {th.name}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card
        className="mt-6"
        title={`✏️ Edit theme: ${t.emoji} ${t.name}`}
        actions={
          <>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                const id = `theme-${Date.now().toString(36)}`;
                setS({ ...s, themes: [...s.themes, { ...t, id, name: `${t.name} copy` }] });
                setSel(s.themes.length);
              }}
            >
              ⧉ Duplicate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-600"
              disabled={s.themes.length < 2 || [s.defaultThemeId, s.forcedThemeId, ...Object.values(s.genderThemes)].includes(t.id)}
              onClick={() => {
                setS({ ...s, themes: s.themes.filter((_, i) => i !== sel) });
                setSel(0);
              }}
            >
              🗑️ Delete
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Name">
            <Input value={t.name} onChange={(v) => setT({ name: v })} />
          </Field>
          <Field label="Emoji">
            <Input value={t.emoji} onChange={(v) => setT({ emoji: v })} />
          </Field>
          <Field label="ID">
            <Input value={t.id} disabled />
          </Field>
          <div className="pt-6">
            <Toggle checked={t.dark} onChange={(v) => setT({ dark: v })} label="Dark theme" />
          </div>
          {[
            ['primary', 'Primary'],
            ['secondary', 'Secondary'],
            ['accent', 'Accent'],
            ['surface', 'Cards'],
            ['bgFrom', 'Background top'],
            ['bgTo', 'Background bottom'],
            ['text', 'Text'],
          ].map(([k, label]) => (
            <ColorInput key={k} label={label} value={t[k]} onChange={(v) => setT({ [k]: v })} />
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Used by: {Object.entries(s.genderThemes).filter(([, v]) => v === t.id).map(([g]) => <Badge key={g}>{g}</Badge>)}
          {s.defaultThemeId === t.id && <Badge color="violet">default</Badge>}
        </div>
      </Card>
    </>
  );
}
