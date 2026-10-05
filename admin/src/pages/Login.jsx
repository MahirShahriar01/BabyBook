import { useState } from 'react';
import { signIn } from '../lib/api.js';
import { useAdmin } from '../lib/AdminContext.jsx';
import { Button, Field, Input } from '../components/ui.jsx';

export default function Login() {
  const { setSession, isSupabase } = useAdmin();
  const [email, setEmail] = useState(isSupabase ? '' : 'admin@demo.local');
  const [password, setPassword] = useState(isSupabase ? '' : 'demo');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setSession(await signIn(email.trim(), password));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-100 via-violet-100 to-sky-100 p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-soft">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-3xl">🚀</div>
          <h1 className="mt-3 text-2xl font-extrabold">Kids Explorer AI</h1>
          <p className="text-sm text-slate-500">Admin Panel · manage the website & Android app</p>
        </div>
        {!isSupabase && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <b>Demo mode</b> — Supabase is not configured, so changes are stored in this browser. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> in <code>admin/.env</code> for production.
          </div>
        )}
        <Field label="Email">
          <Input type="email" value={email} onChange={setEmail} required autoComplete="username" />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={setPassword} required autoComplete="current-password" />
        </Field>
        {error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <Button className="w-full justify-center py-3" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
