import { lazy, Suspense, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAdmin } from './lib/AdminContext.jsx';
import { signOut } from './lib/api.js';
import { Button, cx } from './components/ui.jsx';
import Login from './pages/Login.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Stories = lazy(() => import('./pages/Stories.jsx'));
const Videos = lazy(() => import('./pages/Videos.jsx'));
const Alphabet = lazy(() => import('./pages/Alphabet.jsx'));
const Topics = lazy(() => import('./pages/Topics.jsx'));
const Quiz = lazy(() => import('./pages/Quiz.jsx'));
const Buddy = lazy(() => import('./pages/Buddy.jsx'));
const Themes = lazy(() => import('./pages/Themes.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const AdMob = lazy(() => import('./pages/AdMob.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Data = lazy(() => import('./pages/Data.jsx'));

const NAV = [
  { group: 'Overview' },
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/reports', icon: '📈', label: 'Reports' },
  { group: 'Content' },
  { to: '/stories', icon: '📖', label: 'Storybook Builder' },
  { to: '/videos', icon: '📺', label: 'Video Curator' },
  { to: '/alphabet', icon: '🔤', label: 'Alphabet & Words' },
  { to: '/topics', icon: '🦁', label: 'Explore Topics' },
  { to: '/quiz', icon: '❓', label: 'Quiz / GK' },
  { to: '/buddy', icon: '🤖', label: 'Talking Buddy' },
  { group: 'Apps' },
  { to: '/themes', icon: '🎨', label: 'Themes & Gender' },
  { to: '/settings', icon: '⚙️', label: 'App Settings' },
  { to: '/admob', icon: '💰', label: 'AdMob (Android)' },
  { to: '/data', icon: '💾', label: 'Import / Export' },
];

export default function App() {
  const { session, setSession, bundle, error, toast, isSupabase, reload } = useAdmin();
  const [menu, setMenu] = useState(false);

  if (session === undefined) return <div className="grid h-screen place-items-center text-4xl">🌀</div>;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-ink-900 text-white transition lg:static lg:translate-x-0',
          menu ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-xl">🚀</span>
          <div>
            <div className="font-extrabold leading-tight">Kids Explorer AI</div>
            <div className="text-xs text-white/60">Admin Panel</div>
          </div>
        </div>
        <nav className="space-y-0.5 px-3 pb-6">
          {NAV.map((n, i) =>
            n.group ? (
              <div key={i} className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-white/40">
                {n.group}
              </div>
            ) : (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                onClick={() => setMenu(false)}
                className={({ isActive }) =>
                  cx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium', isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white')
                }
              >
                <span>{n.icon}</span>
                {n.label}
              </NavLink>
            ),
          )}
        </nav>
      </aside>
      {menu && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenu(false)} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="rounded-lg px-2 text-2xl lg:hidden" onClick={() => setMenu(true)} aria-label="Menu">
            ☰
          </button>
          <span className={cx('rounded-full px-3 py-1 text-xs font-bold', isSupabase ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
            {isSupabase ? '● Live · Supabase' : '● Demo mode · saved in this browser'}
          </span>
          <div className="flex-1" />
          {import.meta.env.VITE_WEB_APP_URL && (
            <a className="hidden text-sm font-semibold text-brand-600 sm:block" href={import.meta.env.VITE_WEB_APP_URL} target="_blank" rel="noreferrer">
              Open kids app ↗
            </a>
          )}
          <span className="hidden text-sm text-slate-500 md:block">{session.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              setSession(null);
            }}
          >
            Sign out
          </Button>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              ⚠️ {error}{' '}
              <button className="font-bold underline" onClick={reload}>
                Retry
              </button>
            </div>
          )}
          {!bundle ? (
            <div className="grid h-64 place-items-center text-4xl">🌀</div>
          ) : (
            <Suspense fallback={<div className="grid h-64 place-items-center text-4xl">🌀</div>}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/alphabet" element={<Alphabet />} />
                <Route path="/topics" element={<Topics />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/buddy" element={<Buddy />} />
                <Route path="/themes" element={<Themes />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admob" element={<AdMob />} />
                <Route path="/data" element={<Data />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          )}
        </main>
      </div>

      {toast && (
        <div
          className={cx(
            'fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl',
            toast.kind === 'error' ? 'bg-rose-600' : 'bg-ink-800',
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
