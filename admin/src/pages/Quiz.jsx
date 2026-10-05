import { useState } from 'react';
import { useAdmin } from '../lib/AdminContext.jsx';
import { AgeChips, Badge, Button, Card, Field, Input, Modal, PageHeader, RowActions, Toggle } from '../components/ui.jsx';

const blank = () => ({ id: '', q: '', emoji: '❓', options: ['', '', ''], answer: 0, ageGroups: ['5-7'], published: true });

export default function Quiz() {
  const { bundle, saveItem, deleteItem } = useAdmin();
  const [draft, setDraft] = useState(null);
  const [orig, setOrig] = useState(null);
  const open = (q) => {
    setDraft(JSON.parse(JSON.stringify(q || blank())));
    setOrig(q?.id ?? null);
  };
  const set = (p) => setDraft((d) => ({ ...d, ...p }));
  const save = async () => {
    const item = { ...draft, id: draft.id || `q-${Date.now().toString(36)}` };
    if (!item.q || item.options.some((o) => !o)) return alert('Fill in the question and all options');
    if (await saveItem('quiz', item, orig)) setDraft(null);
  };

  return (
    <>
      <PageHeader icon="❓" title="Quiz / General Knowledge" subtitle="Random rounds of 5 questions, filtered by the kid's age." actions={<Button onClick={() => open()}>＋ New question</Button>} />
      <Card>
        <table className="table-clean w-full">
          <thead>
            <tr>
              <th />
              <th>Question</th>
              <th>Answer</th>
              <th>Ages</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {bundle.quiz.map((q) => (
              <tr key={q.id}>
                <td className="text-2xl">{q.emoji}</td>
                <td>
                  {q.q} {q.published === false && <Badge>Hidden</Badge>}
                </td>
                <td>
                  <Badge color="green">{q.options[q.answer]}</Badge>
                </td>
                <td className="text-xs">{(q.ageGroups || []).join(', ')}</td>
                <td>
                  <RowActions onEdit={() => open(q)} onDelete={() => deleteItem('quiz', q.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title="Question"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save}>💾 Save</Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_90px]">
              <Field label="Question">
                <Input value={draft.q} onChange={(v) => set({ q: v })} />
              </Field>
              <Field label="Emoji">
                <Input value={draft.emoji} onChange={(v) => set({ emoji: v })} />
              </Field>
            </div>
            <Field label="Options (select the correct one)">
              <div className="space-y-2">
                {draft.options.map((o, k) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="radio" checked={draft.answer === k} onChange={() => set({ answer: k })} />
                    <Input value={o} onChange={(v) => set({ options: draft.options.map((x, j) => (j === k ? v : x)) })} />
                    {draft.options.length > 2 && (
                      <Button size="sm" variant="ghost" onClick={() => set({ options: draft.options.filter((_, j) => j !== k), answer: 0 })}>
                        ×
                      </Button>
                    )}
                  </label>
                ))}
                {draft.options.length < 4 && (
                  <Button size="sm" variant="subtle" onClick={() => set({ options: [...draft.options, ''] })}>
                    ＋ option
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Ages">
              <AgeChips value={draft.ageGroups} onChange={(v) => set({ ageGroups: v })} />
            </Field>
            <Toggle checked={draft.published !== false} onChange={(v) => set({ published: v })} label="Visible" />
          </div>
        )}
      </Modal>
    </>
  );
}
