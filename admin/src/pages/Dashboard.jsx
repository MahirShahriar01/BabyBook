import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { loadEvents } from '../lib/api.js';
import { aggregate } from '../lib/stats.js';
import { useAdmin } from '../lib/AdminContext.jsx';
import { Badge, Card, PageHeader, Select } from '../components/ui.jsx';

export const COLORS = ['#FF4FA3', '#7C5CFF', '#1E90FF', '#22B573', '#FF8A3D', '#FFC93C', '#00C2A8', '#FF5D73'];

function Kpi({ icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{label}</span>
        <span className="grid h-10 w-10 place-items-center rounded-xl text-xl" style={{ background: `${color}22` }}>
          {icon}
        </span>
      </div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function TopList({ items, empty = 'No data yet' }) {
  const max = Math.max(1, ...items.map((i) => i.total));
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((i, k) => (
        <li key={i.id}>
          <div className="flex justify-between text-sm">
            <span className="truncate font-medium">
              {k + 1}. {i.name}
            </span>
            <span className="font-bold text-slate-600">{i.total}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${(i.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Donut({ data }) {
  if (!data.length) return <p className="text-sm text-slate-400">No data yet</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const { bundle, isSupabase } = useAdmin();
  const [days, setDays] = useState(14);
  const [events, setEvents] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setEvents(null);
    loadEvents(days)
      .then(setEvents)
      .catch((e) => setErr(e.message));
  }, [days]);

  const s = useMemo(() => (events ? aggregate(events, days) : null), [events, days]);
  const c = bundle;
  const counts = [
    ['📖', 'Stories', c.stories.length, '/stories'],
    ['📺', 'Videos', c.videos.length, '/videos'],
    ['🔤', 'Languages', c.languages.length, '/alphabet'],
    ['🦁', 'Topics', c.topics.length, '/topics'],
    ['❓', 'Quiz questions', c.quiz.length, '/quiz'],
  ];

  return (
    <>
      <PageHeader
        icon="📊"
        title="Dashboard"
        subtitle={isSupabase ? 'Live, anonymous usage from the website and Android app' : 'Demo mode shows sample analytics. Connect Supabase for real data.'}
        actions={<Select value={days} onChange={(v) => setDays(Number(v))} options={[{ value: 7, label: 'Last 7 days' }, { value: 14, label: 'Last 14 days' }, { value: 30, label: 'Last 30 days' }, { value: 90, label: 'Last 90 days' }]} />}
      />
      {err && <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
      {!s ? (
        <div className="grid h-64 place-items-center text-4xl">🌀</div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon="👧" label="Sessions today" value={s.totals.today} sub={`${s.totals.yesterday} yesterday`} color="#FF4FA3" />
            <Kpi icon="📱" label={`Sessions (${days}d)`} value={s.totals.sessions} sub={`${s.totals.avgPerSession} activities / session`} color="#7C5CFF" />
            <Kpi icon="📖" label="Stories finished" value={s.totals.stories} color="#1E90FF" />
            <Kpi icon="🧩" label="Games won" value={s.totals.games} sub={`${s.totals.buddy} buddy chats · ${s.totals.videos} videos`} color="#22B573" />
          </div>

          <Card title="Daily active sessions">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={s.series}>
                <defs>
                  <linearGradient id="gWeb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAnd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22B573" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#22B573" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="android" name="Android" stroke="#22B573" fill="url(#gAnd)" strokeWidth={2} />
                <Area type="monotone" dataKey="web" name="Website" stroke="#7C5CFF" fill="url(#gWeb)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="📖 Top stories read">
              <TopList items={s.topStories} />
            </Card>
            <Card title="🧩 Popular brain games">
              <TopList items={s.topGames} />
            </Card>
            <Card title="📺 Most watched videos">
              <TopList items={s.topVideos} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="🎂 Age groups">
              <Donut data={s.age} />
            </Card>
            <Card title="🎨 Theme popularity">
              <Donut data={s.theme} />
            </Card>
            <Card title="📱 Platform">
              <Donut data={s.platform} />
            </Card>
          </div>

          <Card title="Activity by module">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={s.byEvent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {s.byEvent.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Content library">
            <div className="grid gap-3 sm:grid-cols-5">
              {counts.map(([icon, label, n, to]) => (
                <Link key={label} to={to} className="rounded-xl bg-slate-50 p-4 text-center hover:bg-brand-50">
                  <div className="text-2xl">{icon}</div>
                  <div className="text-2xl font-extrabold">{n}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Badge color={c.settings.ads?.enabled ? 'green' : 'slate'}>AdMob {c.settings.ads?.enabled ? 'ON' : 'OFF'}</Badge>
              <Badge color="violet">Theme mode: {c.settings.themeMode}</Badge>
              <Badge color={c.settings.buddy?.useRemoteAi ? 'amber' : 'green'}>Buddy: {c.settings.buddy?.useRemoteAi ? 'cloud AI' : 'on-device'}</Badge>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
