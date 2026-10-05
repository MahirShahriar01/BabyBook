import { useState } from 'react';
import { useAdmin } from '../lib/AdminContext.jsx';
import { AgeChips, Badge, Button, Card, EmptyState, Field, Input, MediaInput, Modal, PageHeader, RowActions, Select, Toggle, slugify } from '../components/ui.jsx';

export function youtubeId(v) {
  if (!v) return '';
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = String(v).match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : '';
}

const blank = () => ({ id: '', title: '', provider: 'youtube', videoId: '', url: '', thumbnail: '', ageGroups: ['2-4', '5-7'], category: 'Songs', published: true });

export default function Videos() {
  const { bundle, saveItem, deleteItem, move } = useAdmin();
  const [draft, setDraft] = useState(null);
  const [origId, setOrigId] = useState(null);
  const [age, setAge] = useState('all');
  const cats = bundle.settings.video?.categories || ['Songs', 'Alphabet', 'Stories', 'Science'];
  const list = bundle.videos.filter((v) => age === 'all' || v.ageGroups?.includes(age));

  const open = (v) => {
    setDraft({ ...blank(), ...(v || {}) });
    setOrigId(v?.id ?? null);
  };
  const set = (p) => setDraft((d) => ({ ...d, ...p }));
  const thumb = (v) => v.thumbnail || (v.provider === 'youtube' && youtubeId(v.videoId || v.url) ? `https://i.ytimg.com/vi/${youtubeId(v.videoId || v.url)}/mqdefault.jpg` : '');

  const save = async () => {
    const item = { ...draft, id: draft.id || slugify(`v-${draft.title}`) };
    if (item.provider === 'youtube') item.videoId = youtubeId(item.videoId || item.url);
    if (!item.title || (!item.videoId && !item.url)) return alert('Add a title and a YouTube link / video URL.');
    if (await saveItem('videos', item, origId)) setDraft(null);
  };

  return (
    <>
      <PageHeader
        icon="📺"
        title="Video Curator"
        subtitle="Kid-safe cartoons that play inside the apps. Each kid only sees videos for their age group."
        actions={
          <>
            <Select value={age} onChange={setAge} options={[{ value: 'all', label: 'All ages' }, ...bundle.settings.ageGroups.map((g) => ({ value: g.id, label: `Ages ${g.range}` }))]} />
            <Button onClick={() => open()}>＋ Add video</Button>
          </>
        }
      />
      <div className="mb-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
        ℹ️ Only add videos you have reviewed. YouTube embeds play in privacy-enhanced mode (youtube-nocookie.com). On Android, videos marked &quot;Made for Kids&quot; by the
        uploader work best.
      </div>
      {!list.length ? (
        <EmptyState icon="🎬" title="No videos">
          Paste a YouTube link to add the first one.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => {
            const i = bundle.videos.indexOf(v);
            return (
              <Card key={v.id} className="!p-0 overflow-hidden">
                <div className="relative aspect-video bg-gradient-to-br from-brand-400 to-violet-500">
                  {thumb(v) && <img src={thumb(v)} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
                  <div className="absolute left-2 top-2 flex gap-1">
                    {v.published !== false ? <Badge color="green">Live</Badge> : <Badge>Hidden</Badge>}
                    <Badge color="violet">{v.category}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-semibold">{v.title}</div>
                  <div className="mb-3 mt-1 text-xs text-slate-500">
                    {v.provider} · ages {(v.ageGroups || []).join(', ')} {!v.videoId && !v.url && '· ⚠️ no link'}
                  </div>
                  <RowActions onEdit={() => open(v)} onDelete={() => deleteItem('videos', v.id)} onUp={i > 0 ? () => move('videos', i, -1) : null} onDown={i < bundle.videos.length - 1 ? () => move('videos', i, 1) : null} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={origId ? 'Edit video' : 'Add video'}
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
            <Field label="Title">
              <Input value={draft.title} onChange={(v) => set({ title: v })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Source">
                <Select
                  value={draft.provider}
                  onChange={(v) => set({ provider: v })}
                  options={[
                    { value: 'youtube', label: 'YouTube' },
                    { value: 'vimeo', label: 'Vimeo' },
                    { value: 'url', label: 'Direct video file / other embed URL' },
                  ]}
                />
              </Field>
              <Field label="Category">
                <Select value={draft.category} onChange={(v) => set({ category: v })} options={cats} />
              </Field>
            </div>
            {draft.provider === 'youtube' ? (
              <Field label="YouTube link or video ID" hint={youtubeId(draft.videoId) ? `✓ Video ID: ${youtubeId(draft.videoId)}` : 'e.g. https://www.youtube.com/watch?v=XqZsoesa55w'}>
                <Input value={draft.videoId} onChange={(v) => set({ videoId: v })} />
              </Field>
            ) : (
              <Field label={draft.provider === 'vimeo' ? 'Vimeo link' : 'Video URL (.mp4 / .webm / embed URL)'}>
                <Input value={draft.url} onChange={(v) => set({ url: v })} />
              </Field>
            )}
            {draft.provider === 'youtube' && youtubeId(draft.videoId) && (
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe title="preview" className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${youtubeId(draft.videoId)}?rel=0&modestbranding=1`} allowFullScreen />
              </div>
            )}
            <MediaInput label="Custom thumbnail (optional)" value={draft.thumbnail} onChange={(v) => set({ thumbnail: v })} />
            <Field label="Show to ages">
              <AgeChips value={draft.ageGroups} onChange={(v) => set({ ageGroups: v })} />
            </Field>
            <Toggle checked={draft.published !== false} onChange={(v) => set({ published: v })} label="Visible to kids" />
          </div>
        )}
      </Modal>
    </>
  );
}
