import { useEffect, useMemo, useState } from 'react';
import { clearEvents, loadEvents } from '../lib/api.js';
import { aggregate, toCsv } from '../lib/stats.js';
import { useAdmin } from '../lib/AdminContext.jsx';
import { Button, Card, Input, PageHeader, Select, download } from '../components/ui.jsx';
import { Donut, TopList } from './Dashboard.jsx';

export default function Reports() {
  const { notify, isSupabase } = useAdmin();
  const [days, setDays] = useState(30);
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState('');
  const [ev, setEv] = useState('all');
  const [platform, setPlatform] = useState('all');

  const load = () => loadEvents(days).then(setEvents).catch((e) => notify(e.message, 'error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), [days]);

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (ev === 'all' || e.event === ev) &&
          (platform === 'all' || e.platform === platform) &&
          (!q || `${e.item_name} ${e.item_id}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [events, ev, platform, q],
  );
  const s = useMemo(() => aggregate(filtered, days), [filtered, days]);
  const evTypes = ['all', ...new Set(events.map((e) => e.event))];

  return (
    <>
      <PageHeader
        icon="📈"
        title="Reports"
        subtitle="Anonymous events only — no names, no device IDs, no location."
        actions={
          <>
            <Button variant="ghost" onClick={() => download(`kids-explorer-events-${days}d.csv`, toCsv(filtered), 'text/csv')}>
              ⬇️ Export CSV
            </Button>
            {isSupabase && (
              <Button
                variant="danger"
                onClick={async () => {
                  if (!confirm('Delete ALL analytics events? (owner only)')) return;
                  try {
                    await clearEvents();
                    notify('Analytics cleared');
                    load();
                  } catch (e) {
                    notify(e.message, 'error');
                  }
                }}
              >
                🗑️ Clear data
              </Button>
            )}
          </>
        }
      />
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={days} onChange={(v) => setDays(Number(v))} options={[7, 30, 90].map((d) => ({ value: d, label: `Last ${d} days` }))} />
          <Select value={ev} onChange={setEv} options={evTypes.map((e) => ({ value: e, label: e === 'all' ? 'All events' : e }))} />
          <Select value={platform} onChange={setPlatform} options={[{ value: 'all', label: 'All platforms' }, { value: 'web', label: 'Website' }, { value: 'android', label: 'Android' }]} />
          <Input value={q} onChange={setQ} placeholder="Search item…" />
        </div>
      </Card>
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="🌍 Explore items">
          <TopList items={s.topExplore} />
        </Card>
        <Card title="🗣️ Languages used">
          <Donut data={s.lang} />
        </Card>
        <Card title="🧒 Hero choice (gender)">
          <Donut data={s.gender} />
        </Card>
      </div>
      <Card title={`Events (${filtered.length})`}>
        <div className="overflow-x-auto">
          <table className="table-clean w-full">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Item</th>
                <th>Platform</th>
                <th>Age</th>
                <th>Lang</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((e, i) => (
                <tr key={e.id || i}>
                  <td className="whitespace-nowrap text-slate-500">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="font-medium">{e.event}</td>
                  <td className="max-w-xs truncate">{e.item_name || e.item_id}</td>
                  <td>{e.platform}</td>
                  <td>{e.age_group}</td>
                  <td>{e.lang}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && <p className="mt-2 text-xs text-slate-400">Showing 200 of {filtered.length}. Export CSV for everything.</p>}
        </div>
      </Card>
    </>
  );
}
