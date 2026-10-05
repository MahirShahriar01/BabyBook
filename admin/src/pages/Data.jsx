import { useRef } from 'react';
import { exportBundle, resetDemo } from '../lib/api.js';
import { useAdmin } from '../lib/AdminContext.jsx';
import { Button, Card, PageHeader, download } from '../components/ui.jsx';

export default function Data() {
  const { bundle, importAll, isSupabase, notify, reload } = useAdmin();
  const file = useRef();

  return (
    <>
      <PageHeader icon="💾" title="Import / Export" subtitle="Back up all content or publish it as a static JSON file." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="⬇️ Export content.json">
          <p className="mb-4 text-sm text-slate-600">
            One file with settings, themes, languages, stories, videos, topics, quiz and buddy rules. Use it as a backup, or host it anywhere and point the apps to it
            (<code>VITE_CONTENT_URL</code> for the website, <code>CONTENT_URL</code> for Android) — no database needed.
          </p>
          <Button onClick={() => download('content.json', JSON.stringify(exportBundle(bundle), null, 1))}>⬇️ Download content.json</Button>
        </Card>
        <Card title="⬆️ Import">
          <p className="mb-4 text-sm text-slate-600">Replace all content with a previously exported file. {isSupabase && 'This writes to the live database.'}</p>
          <Button variant="ghost" onClick={() => file.current.click()}>
            ⬆️ Choose file…
          </Button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const b = JSON.parse(await f.text());
                if (!b.settings || !Array.isArray(b.stories)) throw new Error('Not a Kids Explorer content file');
                if (confirm(`Import ${b.stories.length} stories, ${b.videos?.length || 0} videos, ${b.languages?.length || 0} languages?`)) await importAll({ ...bundle, ...b });
              } catch (err) {
                notify(err.message, 'error');
              }
            }}
          />
        </Card>
        {!isSupabase && (
          <Card title="↺ Reset demo data">
            <p className="mb-4 text-sm text-slate-600">Discard local edits and go back to the bundled sample content.</p>
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm('Reset all demo content?')) return;
                resetDemo();
                reload();
                notify('Demo data reset');
              }}
            >
              Reset
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}
