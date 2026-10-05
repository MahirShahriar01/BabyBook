import { useState } from 'react';
import { useAdmin } from '../lib/AdminContext.jsx';
import { AgeChips, Badge, Button, Card, Field, Input, Modal, PageHeader, RowActions, Select, Toggle, slugify } from '../components/ui.jsx';

const ANIMS = ['bounce', 'drive', 'sail', 'fly', 'spin', 'wobble', 'pulse', 'float', 'orbit', 'pop'];
const blank = () => ({ id: '', title: '', emoji: '✨', color: '#FF8A3D', animation: 'bounce', ageGroups: ['2-4', '5-7', '8-10'], published: true, items: [] });

export default function Topics() {
  const { bundle, saveItem, deleteItem, move } = useAdmin();
  const [draft, setDraft] = useState(null);
  const [orig, setOrig] = useState(null);
  const open = (t) => {
    setDraft(JSON.parse(JSON.stringify(t || blank())));
    setOrig(t?.id ?? null);
  };
  const set = (p) => setDraft((d) => ({ ...d, ...p }));
  const setItem = (i, p) => set({ items: draft.items.map((x, k) => (k === i ? { ...x, ...p } : x)) });

  const save = async () => {
    const item = { ...draft, id: draft.id || slugify(draft.title) };
    item.items = item.items.filter((x) => x.name).map((x) => ({ ...x, id: x.id || slugify(x.name) }));
    if (!item.title) return alert('Add a title');
    if (await saveItem('topics', item, orig)) setDraft(null);
  };

  return (
    <>
      <PageHeader icon="🦁" title="Explore Topics" subtitle="Animals, vehicles, ships, planes, shapes, countries, space, feelings and more — with audio facts and animations." actions={<Button onClick={() => open()}>＋ New topic</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {bundle.topics.map((t, i) => (
          <Card key={t.id}>
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl text-3xl" style={{ background: `${t.color}33` }}>
                {t.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{t.title}</div>
                <div className="text-xs text-slate-500">
                  {t.items.length} items · {t.animation} · ages {(t.ageGroups || []).join(', ')}
                </div>
              </div>
              {t.published !== false ? <Badge color="green">Live</Badge> : <Badge>Hidden</Badge>}
            </div>
            <div className="my-3 truncate text-2xl">{t.items.map((x) => x.emoji).join(' ')}</div>
            <RowActions onEdit={() => open(t)} onDelete={() => deleteItem('topics', t.id)} onUp={i > 0 ? () => move('topics', i, -1) : null} onDown={i < bundle.topics.length - 1 ? () => move('topics', i, 1) : null} />
          </Card>
        ))}
      </div>
      <Modal
        open={!!draft}
        wide
        onClose={() => setDraft(null)}
        title={orig ? `Edit ${draft?.title}` : 'New topic'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save}>💾 Save topic</Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_90px_100px_150px]">
              <Field label="Title">
                <Input value={draft.title} onChange={(v) => set({ title: v })} />
              </Field>
              <Field label="Emoji">
                <Input value={draft.emoji} onChange={(v) => set({ emoji: v })} />
              </Field>
              <Field label="Color">
                <input type="color" className="h-9 w-full rounded-lg border" value={draft.color} onChange={(e) => set({ color: e.target.value })} />
              </Field>
              <Field label="Animation">
                <Select value={draft.animation} onChange={(v) => set({ animation: v })} options={ANIMS} />
              </Field>
            </div>
            <Field label="Ages">
              <AgeChips value={draft.ageGroups} onChange={(v) => set({ ageGroups: v })} />
            </Field>
            <Toggle checked={draft.published !== false} onChange={(v) => set({ published: v })} label="Visible to kids" />
            <div className="overflow-x-auto">
              <table className="table-clean w-full min-w-[760px]">
                <thead>
                  <tr>
                    <th>Emoji</th>
                    <th>Name</th>
                    <th>Bangla</th>
                    <th>Sound</th>
                    <th>Fun fact (spoken)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {draft.items.map((it, i) => (
                    <tr key={i}>
                      <td className="w-20">
                        <Input value={it.emoji} onChange={(v) => setItem(i, { emoji: v })} />
                      </td>
                      <td>
                        <Input value={it.name} onChange={(v) => setItem(i, { name: v })} />
                      </td>
                      <td>
                        <Input value={it.bn} onChange={(v) => setItem(i, { bn: v })} />
                      </td>
                      <td>
                        <Input value={it.sound} onChange={(v) => setItem(i, { sound: v })} placeholder="Roar!" />
                      </td>
                      <td className="min-w-[260px]">
                        <Input value={it.fact} onChange={(v) => setItem(i, { fact: v })} />
                      </td>
                      <td>
                        <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => set({ items: draft.items.filter((_, k) => k !== i) })}>
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="subtle" onClick={() => set({ items: [...draft.items, { id: '', name: '', emoji: '', fact: '', bn: '', sound: '' }] })}>
              ＋ Add item
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
