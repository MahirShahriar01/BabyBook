import { useState } from 'react';
import { useAdmin } from '../lib/AdminContext.jsx';
import { Badge, Button, Card, Field, Input, MediaInput, Modal, PageHeader, RowActions, Toggle } from '../components/ui.jsx';

const blankLang = () => ({ code: '', name: '', nativeName: '', flag: '🏳️', ttsLocale: '', enabled: true, groups: [{ title: 'Alphabet', letters: [] }] });

export default function Alphabet() {
  const { bundle, saveItem, deleteItem, move } = useAdmin();
  const [draft, setDraft] = useState(null);
  const [orig, setOrig] = useState(null);
  const [g, setG] = useState(0);
  const [bulk, setBulk] = useState('');

  const open = (l) => {
    setDraft(JSON.parse(JSON.stringify(l || blankLang())));
    setOrig(l?.code ?? null);
    setG(0);
  };
  const set = (p) => setDraft((d) => ({ ...d, ...p }));
  const group = draft?.groups[g];
  const setGroup = (p) => set({ groups: draft.groups.map((x, i) => (i === g ? { ...x, ...p } : x)) });
  const setLetter = (i, p) => setGroup({ letters: group.letters.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const setWord = (li, wi, p) => setLetter(li, { words: group.letters[li].words.map((w, k) => (k === wi ? { ...w, ...p } : w)) });

  const save = async () => {
    const item = { ...draft, code: draft.code.trim().toLowerCase() };
    if (!/^[a-z]{2,3}(-[a-z0-9]+)?$/.test(item.code) || !item.name) return alert('Enter a language code (e.g. "ar", "de") and a name.');
    if (!item.ttsLocale) item.ttsLocale = item.code;
    if (await saveItem('languages', item, orig)) setDraft(null);
  };

  return (
    <>
      <PageHeader icon="🔤" title="Alphabet & Words" subtitle="Multi-language alphabets, phonics and word cards. Add any language — the apps pick it up automatically." actions={<Button onClick={() => open()}>＋ Add language</Button>} />
      <Card>
        <table className="table-clean w-full">
          <thead>
            <tr>
              <th>Language</th>
              <th>Code / voice</th>
              <th>Groups</th>
              <th>Letters</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {bundle.languages.map((l, i) => (
              <tr key={l.code}>
                <td>
                  <span className="mr-2 text-xl">{l.flag}</span>
                  <b>{l.name}</b> <span className="text-slate-500">{l.nativeName}</span>
                </td>
                <td className="font-mono text-xs">
                  {l.code} · {l.ttsLocale}
                </td>
                <td className="text-xs">{l.groups.map((x) => x.title).join(' · ')}</td>
                <td>{l.groups.reduce((n, x) => n + x.letters.length, 0)}</td>
                <td>{l.enabled !== false ? <Badge color="green">Enabled</Badge> : <Badge>Off</Badge>}</td>
                <td>
                  <RowActions onEdit={() => open(l)} onDelete={() => deleteItem('languages', l.code)} onUp={i > 0 ? () => move('languages', i, -1) : null} onDown={i < bundle.languages.length - 1 ? () => move('languages', i, 1) : null} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={!!draft}
        wide
        onClose={() => setDraft(null)}
        title={orig ? `Edit ${draft?.name}` : 'New language'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save}>💾 Save language</Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-5">
              <Field label="Code" hint="ISO 639-1, e.g. ar">
                <Input value={draft.code} onChange={(v) => set({ code: v })} />
              </Field>
              <Field label="Name">
                <Input value={draft.name} onChange={(v) => set({ name: v })} />
              </Field>
              <Field label="Native name">
                <Input value={draft.nativeName} onChange={(v) => set({ nativeName: v })} />
              </Field>
              <Field label="Flag">
                <Input value={draft.flag} onChange={(v) => set({ flag: v })} />
              </Field>
              <Field label="Voice locale" hint="e.g. ar-SA, bn-BD">
                <Input value={draft.ttsLocale} onChange={(v) => set({ ttsLocale: v })} />
              </Field>
            </div>
            <Toggle checked={draft.enabled !== false} onChange={(v) => set({ enabled: v })} label="Enabled in the apps" />

            <div className="flex flex-wrap items-center gap-2">
              {draft.groups.map((x, i) => (
                <button key={i} onClick={() => setG(i)} className={`rounded-full px-3 py-1 text-sm font-semibold ${i === g ? 'bg-brand-500 text-white' : 'bg-slate-100'}`}>
                  {x.title || `Group ${i + 1}`} ({x.letters.length})
                </button>
              ))}
              <Button size="sm" variant="subtle" onClick={() => { set({ groups: [...draft.groups, { title: 'New group', letters: [] }] }); setG(draft.groups.length); }}>
                ＋ Group
              </Button>
            </div>

            {group && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Group title" className="flex-1">
                    <Input value={group.title} onChange={(v) => setGroup({ title: v })} />
                  </Field>
                  <Button variant="ghost" className="text-rose-600" disabled={draft.groups.length === 1} onClick={() => { set({ groups: draft.groups.filter((_, i) => i !== g) }); setG(0); }}>
                    Delete group
                  </Button>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <Field label="Quick add letters" hint="Type letters separated by spaces, e.g. ا ب ت ث">
                    <div className="flex gap-2">
                      <Input value={bulk} onChange={setBulk} />
                      <Button
                        variant="ghost"
                        onClick={() => {
                          const chars = bulk.split(/\s+/).filter(Boolean);
                          setGroup({ letters: [...group.letters, ...chars.map((c) => ({ char: c, sound: '', words: [] }))] });
                          setBulk('');
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </Field>
                </div>
                <div className="space-y-2">
                  {group.letters.map((le, li) => (
                    <div key={li} className="grid items-start gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[70px_110px_1fr_40px]">
                      <Input value={le.char} onChange={(v) => setLetter(li, { char: v })} className="text-center text-xl font-bold" />
                      <Input value={le.sound} onChange={(v) => setLetter(li, { sound: v })} placeholder="sounds like" />
                      <div className="space-y-1">
                        {(le.words || []).map((w, wi) => (
                          <div key={wi} className="grid gap-1 sm:grid-cols-[60px_1fr_1.4fr_32px]">
                            <Input value={w.emoji} onChange={(v) => setWord(li, wi, { emoji: v })} />
                            <Input value={w.word} onChange={(v) => setWord(li, wi, { word: v })} placeholder="word" />
                            <Input value={w.meaning} onChange={(v) => setWord(li, wi, { meaning: v })} placeholder="meaning" />
                            <Button size="sm" variant="ghost" onClick={() => setLetter(li, { words: le.words.filter((_, k) => k !== wi) })}>
                              ×
                            </Button>
                          </div>
                        ))}
                        <Button size="sm" variant="subtle" onClick={() => setLetter(li, { words: [...(le.words || []), { word: '', emoji: '', meaning: '' }] })}>
                          ＋ word
                        </Button>
                        <MediaInput label="Phonics audio (optional, otherwise text-to-speech)" accept="audio/*" value={le.audio} onChange={(v) => setLetter(li, { audio: v })} />
                      </div>
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setGroup({ letters: group.letters.filter((_, k) => k !== li) })}>
                        🗑️
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="subtle" onClick={() => setGroup({ letters: [...group.letters, { char: '', sound: '', words: [] }] })}>
                  ＋ Add letter
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
