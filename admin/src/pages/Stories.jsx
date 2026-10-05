import { useState } from 'react';
import { useAdmin } from '../lib/AdminContext.jsx';
import { AgeChips, Badge, Button, Card, EmptyState, Field, Input, MediaInput, Modal, PageHeader, RowActions, Select, TextArea, Toggle, slugify } from '../components/ui.jsx';

const blank = () => ({
  id: '',
  title: '',
  language: 'en',
  emoji: '📘',
  color: '#3DA5FF',
  ageGroups: ['2-4', '5-7', '8-10'],
  published: false,
  pages: [{ scene: '🌳🐦', image: '', audio: '', text: '' }],
  moral: '',
  quiz: [],
});

export default function Stories() {
  const { bundle, saveItem, deleteItem, move } = useAdmin();
  const [draft, setDraft] = useState(null);
  const [origId, setOrigId] = useState(null);
  const [filter, setFilter] = useState('all');
  const langs = bundle.languages.map((l) => ({ value: l.code, label: `${l.flag} ${l.name}` }));
  const list = bundle.stories.filter((s) => filter === 'all' || s.language === filter);

  const open = (s) => {
    setDraft(JSON.parse(JSON.stringify(s || blank())));
    setOrigId(s?.id ?? null);
  };
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setPage = (i, patch) => set({ pages: draft.pages.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  const setQ = (i, patch) => set({ quiz: draft.quiz.map((q, k) => (k === i ? { ...q, ...patch } : q)) });

  const save = async () => {
    const item = { ...draft, id: draft.id || slugify(draft.title) };
    if (!item.title.trim() || !item.pages.some((p) => p.text.trim())) return alert('A story needs a title and at least one page with text.');
    if (await saveItem('stories', item, origId)) setDraft(null);
  };

  return (
    <>
      <PageHeader
        icon="📖"
        title="Storybook Builder"
        subtitle="Page-by-page stories with narration, moral and quiz. Shown on web and Android."
        actions={
          <>
            <Select value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All languages' }, ...langs]} />
            <Button onClick={() => open()}>＋ New story</Button>
          </>
        }
      />
      {!list.length ? (
        <EmptyState icon="📚" title="No stories yet">
          Create your first story with the button above.
        </EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="table-clean w-full">
              <thead>
                <tr>
                  <th>Story</th>
                  <th>Lang</th>
                  <th>Ages</th>
                  <th>Pages</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((s) => {
                  const i = bundle.stories.indexOf(s);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-xl text-xl" style={{ background: `${s.color}33` }}>
                            {s.emoji}
                          </span>
                          <div>
                            <div className="font-semibold">{s.title}</div>
                            <div className="max-w-sm truncate text-xs text-slate-500">💡 {s.moral}</div>
                          </div>
                        </div>
                      </td>
                      <td>{s.language}</td>
                      <td className="text-xs">{(s.ageGroups || []).join(', ')}</td>
                      <td>{s.pages.length}</td>
                      <td>{s.published !== false ? <Badge color="green">Published</Badge> : <Badge>Draft</Badge>}</td>
                      <td>
                        <RowActions onEdit={() => open(s)} onDelete={() => deleteItem('stories', s.id)} onUp={i > 0 ? () => move('stories', i, -1) : null} onDown={i < bundle.stories.length - 1 ? () => move('stories', i, 1) : null} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!draft}
        wide
        onClose={() => setDraft(null)}
        title={origId ? `Edit: ${draft?.title}` : 'New story'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save}>💾 Save story</Button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_90px_110px]">
                <Field label="Title">
                  <Input value={draft.title} onChange={(v) => set({ title: v })} />
                </Field>
                <Field label="Emoji">
                  <Input value={draft.emoji} onChange={(v) => set({ emoji: v })} />
                </Field>
                <Field label="Color">
                  <input type="color" className="h-9 w-full rounded-lg border" value={draft.color} onChange={(e) => set({ color: e.target.value })} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Language">
                  <Select value={draft.language} onChange={(v) => set({ language: v })} options={langs} />
                </Field>
                <Field label="ID (URL slug)" hint="Leave empty to generate from the title">
                  <Input value={draft.id} onChange={(v) => set({ id: slugify(v) })} />
                </Field>
              </div>
              <Field label="Target ages">
                <AgeChips value={draft.ageGroups} onChange={(v) => set({ ageGroups: v })} />
              </Field>
              <Toggle checked={draft.published !== false} onChange={(v) => set({ published: v })} label="Published" hint="Drafts are hidden from kids" />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-bold">📄 Pages ({draft.pages.length})</h4>
                  <Button size="sm" variant="subtle" onClick={() => set({ pages: [...draft.pages, { scene: '✨', image: '', audio: '', text: '' }] })}>
                    ＋ Add page
                  </Button>
                </div>
                <div className="space-y-3">
                  {draft.pages.map((p, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge color="violet">Page {i + 1}</Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="subtle" disabled={i === 0} onClick={() => { const a = [...draft.pages]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ pages: a }); }}>↑</Button>
                          <Button size="sm" variant="subtle" disabled={i === draft.pages.length - 1} onClick={() => { const a = [...draft.pages]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set({ pages: a }); }}>↓</Button>
                          <Button size="sm" variant="ghost" className="text-rose-600" disabled={draft.pages.length === 1} onClick={() => set({ pages: draft.pages.filter((_, k) => k !== i) })}>🗑️</Button>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                        <Field label="Scene (emojis)">
                          <Input value={p.scene} onChange={(v) => setPage(i, { scene: v })} />
                        </Field>
                        <Field label="Text (read aloud with word highlighting)">
                          <TextArea value={p.text} onChange={(v) => setPage(i, { text: v })} rows={2} />
                        </Field>
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <MediaInput label="Illustration (optional)" value={p.image} onChange={(v) => setPage(i, { image: v })} />
                        <MediaInput label="Narration audio (optional)" accept="audio/*" value={p.audio} onChange={(v) => setPage(i, { audio: v })} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Field label="💡 Moral of the story">
                <TextArea value={draft.moral} onChange={(v) => set({ moral: v })} rows={2} />
              </Field>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-bold">❓ Quiz ({draft.quiz.length})</h4>
                  <Button size="sm" variant="subtle" onClick={() => set({ quiz: [...draft.quiz, { question: '', options: ['', '', ''], answer: 0 }] })}>
                    ＋ Add question
                  </Button>
                </div>
                {draft.quiz.map((q, i) => (
                  <div key={i} className="mb-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex gap-2">
                      <Input value={q.question} onChange={(v) => setQ(i, { question: v })} placeholder={`Question ${i + 1}`} />
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => set({ quiz: draft.quiz.filter((_, k) => k !== i) })}>
                        🗑️
                      </Button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {q.options.map((o, k) => (
                        <label key={k} className="flex items-center gap-2">
                          <input type="radio" name={`ans-${i}`} checked={q.answer === k} onChange={() => setQ(i, { answer: k })} title="Correct answer" />
                          <Input value={o} onChange={(v) => setQ(i, { options: q.options.map((x, j) => (j === k ? v : x)) })} placeholder={`Option ${k + 1}`} />
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Select the radio button next to the correct answer.</p>
                  </div>
                ))}
              </div>
            </div>

            {/* live preview */}
            <div className="lg:sticky lg:top-0 lg:self-start">
              <div className="mb-2 text-xs font-bold uppercase text-slate-500">Kid preview</div>
              <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-200">
                <div className="grid h-40 place-items-center text-5xl" style={{ background: `linear-gradient(135deg, ${draft.color}33, ${draft.color}99)` }}>
                  {draft.pages[0]?.image ? <img src={draft.pages[0].image} alt="" className="h-40 w-full object-cover" /> : draft.pages[0]?.scene}
                </div>
                <div className="p-4 text-lg font-semibold leading-relaxed">{draft.pages[0]?.text || 'Page text…'}</div>
              </div>
              <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm">💡 {draft.moral || 'Moral…'}</div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
