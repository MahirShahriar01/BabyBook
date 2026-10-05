import { useState } from 'react';
import { useAdmin } from '../lib/AdminContext.jsx';
import { analyze } from '../lib/buddyEngine.js';
import { Badge, Button, Card, Field, Input, PageHeader, Select, TextArea, Toggle } from '../components/ui.jsx';

const LOCALES = { en: 'en-US', bn: 'bn-BD', es: 'es-ES', fr: 'fr-FR', hi: 'hi-IN' };
const testVoice = (text, p, lang = 'en') => {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALES[lang] || lang;
  u.pitch = p.pitch;
  u.rate = p.rate;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
};

function RuleList({ rules, onChange, fields }) {
  return (
    <div className="space-y-2">
      {rules.map((r, i) => (
        <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_1.5fr_32px]">
          {fields.map((f) => (
            <Input key={f} value={r[f]} placeholder={f} className={f === 'pattern' ? 'font-mono' : ''} onChange={(v) => onChange(rules.map((x, k) => (k === i ? { ...x, [f]: v } : x)))} />
          ))}
          <Button size="sm" variant="ghost" onClick={() => onChange(rules.filter((_, k) => k !== i))}>
            ×
          </Button>
        </div>
      ))}
      <Button size="sm" variant="subtle" onClick={() => onChange([...rules, Object.fromEntries(fields.map((f) => [f, '']))])}>
        ＋ Add rule
      </Button>
    </div>
  );
}

export default function Buddy() {
  const { bundle, saveSettings, saveBuddy } = useAdmin();
  const [cfg, setCfg] = useState(() => JSON.parse(JSON.stringify(bundle.settings.buddy)));
  const [kbAll, setKbAll] = useState(() => JSON.parse(JSON.stringify(bundle.buddy)));
  const [lang, setLang] = useState('en');
  const [test, setTest] = useState('gimme my doggy');
  const kb = kbAll[lang] || {};
  const setKb = (p) => setKbAll((all) => ({ ...all, [lang]: { ...all[lang], ...p } }));
  const setP = (i, p) => setCfg((c) => ({ ...c, personas: c.personas.map((x, k) => (k === i ? { ...x, ...p } : x)) }));
  let result = null;
  let ruleError = '';
  try {
    result = analyze(test, kbAll, { lang, name: 'Mahi', buddy: cfg.personas[0]?.name, seed: 1 });
  } catch (e) {
    ruleError = e.message;
  }

  const langs = bundle.languages.map((l) => ({ value: l.code, label: `${l.flag} ${l.name}` }));
  const kidWords = Object.entries(kb.kidWords || {}).map(([from, [to, meaning]]) => ({ from, to, meaning }));

  return (
    <>
      <PageHeader
        icon="🤖"
        title="Talking Buddy"
        subtitle="Voices, languages and the free on-device correction engine (grammar, polite words, punctuation, answers)."
        actions={
          <>
            <Button variant="ghost" onClick={() => saveSettings({ ...bundle.settings, buddy: cfg }, 'Buddy settings saved')}>
              💾 Save settings
            </Button>
            <Button disabled={!!ruleError} onClick={() => saveBuddy(kbAll, 'Knowledge base saved')}>
              💾 Save knowledge
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="🎭 Voice personas">
          <div className="space-y-3">
            {cfg.personas.map((p, i) => (
              <div key={i} className="grid items-end gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[60px_1fr_90px_90px_auto]">
                <Field label="Emoji">
                  <Input value={p.emoji} onChange={(v) => setP(i, { emoji: v })} />
                </Field>
                <Field label="Name">
                  <Input value={p.name} onChange={(v) => setP(i, { name: v })} />
                </Field>
                <Field label={`Pitch ${p.pitch}`}>
                  <input type="range" min="0.1" max="2" step="0.05" value={p.pitch} onChange={(e) => setP(i, { pitch: Number(e.target.value) })} className="w-full" />
                </Field>
                <Field label={`Speed ${p.rate}`}>
                  <input type="range" min="0.5" max="1.5" step="0.05" value={p.rate} onChange={(e) => setP(i, { rate: Number(e.target.value) })} className="w-full" />
                </Field>
                <div className="flex gap-1">
                  <Button size="sm" variant="subtle" onClick={() => testVoice(`Hi! I am ${p.name}. Let's learn together!`, p)}>
                    🔊
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCfg((c) => ({ ...c, personas: c.personas.filter((_, k) => k !== i) }))}>
                    ×
                  </Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="subtle" onClick={() => setCfg((c) => ({ ...c, personas: [...c.personas, { id: `p${Date.now().toString(36)}`, name: 'New Buddy', emoji: '🦄', pitch: 1.2, rate: 1 }] }))}>
              ＋ Add persona
            </Button>
            <Field label="Default persona">
              <Select value={cfg.defaultPersona} onChange={(v) => setCfg({ ...cfg, defaultPersona: v })} options={cfg.personas.map((p) => ({ value: p.id, label: `${p.emoji} ${p.name}` }))} />
            </Field>
          </div>
        </Card>

        <Card title="⚙️ Behaviour">
          <div className="space-y-4">
            <Toggle checked={cfg.enabled} onChange={(v) => setCfg({ ...cfg, enabled: v })} label="Talking Buddy enabled" />
            <Field label="Languages the buddy speaks">
              <div className="flex flex-wrap gap-2">
                {bundle.languages.map((l) => {
                  const on = cfg.languages.includes(l.code);
                  return (
                    <button key={l.code} onClick={() => setCfg({ ...cfg, languages: on ? cfg.languages.filter((x) => x !== l.code) : [...cfg.languages, l.code] })} className={`rounded-full border px-3 py-1 text-sm font-semibold ${on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}>
                      {l.flag} {l.name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Toggle
              checked={cfg.useRemoteAi}
              onChange={(v) => setCfg({ ...cfg, useRemoteAi: v })}
              label="Use cloud AI for richer answers (optional)"
              hint="Calls your Supabase Edge Function 'buddy' (Gemini free tier / OpenAI). The on-device safety filter always runs first and the child's name is never sent."
            />
            {cfg.useRemoteAi && (
              <Field label="Cloud AI endpoint" hint="https://YOUR-PROJECT.functions.supabase.co/buddy">
                <Input value={cfg.remoteAiUrl} onChange={(v) => setCfg({ ...cfg, remoteAiUrl: v })} />
              </Field>
            )}
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              ✅ Default mode is 100% free and private: speech recognition and voices come from the device (Web Speech API / Android speech services) and corrections use the
              rules below.
            </div>
          </div>
        </Card>
      </div>

      <Card
        className="mt-6"
        title="🧠 Knowledge base"
        actions={<Select value={lang} onChange={setLang} options={langs.filter((l) => kbAll[l.value] || cfg.languages.includes(l.value))} />}
      >
        {!kbAll[lang] && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm">
            No knowledge base for this language yet.
            <Button size="sm" onClick={() => setKbAll({ ...kbAll, [lang]: { ...JSON.parse(JSON.stringify(kbAll.en)), corrections: [], polite: [], kidWords: {}, qa: [], practiceWords: [] } })}>
              Create from English template
            </Button>
          </div>
        )}
        {kbAll[lang] && (
          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Greeting ({name}, {buddy})">
                  <TextArea value={kb.greeting} onChange={(v) => setKb({ greeting: v })} rows={2} />
                </Field>
                <Field label="Fallback answer">
                  <TextArea value={kb.fallback} onChange={(v) => setKb({ fallback: v })} rows={2} />
                </Field>
                <Field label="Correction intro">
                  <Input value={kb.correctIntro} onChange={(v) => setKb({ correctIntro: v })} />
                </Field>
                <Field label="Perfect sentence">
                  <Input value={kb.perfect} onChange={(v) => setKb({ perfect: v })} />
                </Field>
              </div>
              <Field label="Praise words (one per line)">
                <TextArea value={(kb.praise || []).join('\n')} onChange={(v) => setKb({ praise: v.split('\n').filter(Boolean) })} rows={3} />
              </Field>
              <div>
                <h4 className="mb-2 font-bold">✏️ Grammar & dialect corrections <Badge>regex</Badge></h4>
                <RuleList rules={kb.corrections || []} onChange={(v) => setKb({ corrections: v })} fields={['pattern', 'replace', 'tip']} />
              </div>
              <div>
                <h4 className="mb-2 font-bold">🙏 Polite / formal phrasing</h4>
                <RuleList rules={kb.polite || []} onChange={(v) => setKb({ polite: v })} fields={['pattern', 'replace', 'tip']} />
              </div>
              <div>
                <h4 className="mb-2 font-bold">👶 Baby-talk → formal word</h4>
                <RuleList
                  rules={kidWords}
                  onChange={(rows) => setKb({ kidWords: Object.fromEntries(rows.filter((r) => r.from).map((r) => [r.from, [r.to, r.meaning]])) })}
                  fields={['from', 'to', 'meaning']}
                />
              </div>
              <div>
                <h4 className="mb-2 font-bold">💬 Questions & answers</h4>
                <div className="space-y-2">
                  {(kb.qa || []).map((qa, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[1fr_2fr_32px]">
                      <Input value={qa.keywords.join(', ')} placeholder="keywords, comma separated" onChange={(v) => setKb({ qa: kb.qa.map((x, k) => (k === i ? { ...x, keywords: v.split(',').map((s) => s.trim()).filter(Boolean) } : x)) })} />
                      <Input value={qa.answer} placeholder="answer" onChange={(v) => setKb({ qa: kb.qa.map((x, k) => (k === i ? { ...x, answer: v } : x)) })} />
                      <Button size="sm" variant="ghost" onClick={() => setKb({ qa: kb.qa.filter((_, k) => k !== i) })}>
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="subtle" onClick={() => setKb({ qa: [...(kb.qa || []), { keywords: [], answer: '' }] })}>
                    ＋ Add answer
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pronunciation practice words (one per line)">
                  <TextArea value={(kb.practiceWords || []).join('\n')} onChange={(v) => setKb({ practiceWords: v.split('\n').filter(Boolean) })} rows={5} />
                </Field>
                <Field label="🛡️ Safety words (blocked topics, one per line)">
                  <TextArea value={(kb.safety || []).join('\n')} onChange={(v) => setKb({ safety: v.split('\n').filter(Boolean) })} rows={5} />
                </Field>
              </div>
            </div>

            <div className="xl:sticky xl:top-20 xl:self-start">
              <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-brand-50 p-4">
                <h4 className="mb-2 font-bold">🧪 Test console</h4>
                <Input value={test} onChange={setTest} placeholder="Type like a kid…" />
                {ruleError && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Invalid rule pattern: {ruleError}</div>}
                {result && (
                  <div className="mt-3 space-y-2 text-sm">
                    <div>
                      <b>Corrected:</b> {result.corrected}
                    </div>
                    {result.words.map((w) => (
                      <div key={w.from}>
                        📘 {w.from} → <b>{w.to}</b>: {w.meaning}
                      </div>
                    ))}
                    {result.tips.map((t) => (
                      <div key={t}>💡 {t}</div>
                    ))}
                    {result.answer && <div>🤖 {result.answer}</div>}
                    {!result.safe && <Badge color="amber">Blocked by safety filter</Badge>}
                    <Button size="sm" variant="ghost" onClick={() => testVoice(result.speech, cfg.personas[0] || { pitch: 1, rate: 1 }, lang)}>
                      🔊 Hear reply
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
