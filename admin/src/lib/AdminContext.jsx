import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from './api.js';

const Ctx = createContext(null);
export const useAdmin = () => useContext(Ctx);

export function AdminProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef();

  const notify = useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    api.getSession().then(setSession);
    const sub = api.supabase?.auth.onAuthStateChange((_e, s) => setSession(s ? { email: s.user.email, id: s.user.id } : null));
    return () => sub?.data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    try {
      setError('');
      setBundle(await api.loadBundle());
    } catch (e) {
      setError(e.message || String(e));
    }
  }, []);

  useEffect(() => {
    if (session) reload();
  }, [session, reload]);

  /** Run a save, keep UI state in sync and report errors as toasts. */
  const run = useCallback(
    async (fn, nextBundle, okMsg = 'Saved ✓') => {
      setSaving(true);
      const prev = bundle;
      if (nextBundle) setBundle(nextBundle);
      try {
        await fn();
        notify(okMsg);
        return true;
      } catch (e) {
        if (nextBundle) setBundle(prev);
        notify(e.message || 'Save failed', 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [bundle, notify],
  );

  const actions = {
    saveSettings: (settings, msg) => run(() => api.saveSettings(settings), { ...bundle, settings }, msg),
    saveBuddy: (buddy, msg) => run(() => api.saveBuddy(buddy), { ...bundle, buddy }, msg),
    saveItem: (col, item, prevId) => {
      const key = col === 'languages' ? 'code' : 'id';
      const list = [...bundle[col]];
      const idx = list.findIndex((x) => x[key] === (prevId ?? item[key]));
      if (idx >= 0) list[idx] = item;
      else list.unshift(item);
      return run(async () => {
        if (prevId && prevId !== item[key]) await api.deleteItem(col, prevId, list);
        await api.saveItem(col, item, list);
      }, { ...bundle, [col]: list });
    },
    deleteItem: (col, id) => {
      const key = col === 'languages' ? 'code' : 'id';
      const list = bundle[col].filter((x) => x[key] !== id);
      return run(() => api.deleteItem(col, id, list), { ...bundle, [col]: list }, 'Deleted');
    },
    move: (col, index, dir) => {
      const list = [...bundle[col]];
      const j = index + dir;
      if (j < 0 || j >= list.length) return;
      [list[index], list[j]] = [list[j], list[index]];
      return run(() => api.saveOrder(col, list), { ...bundle, [col]: list }, 'Order saved');
    },
    importAll: (b) => run(() => api.importBundle(b), b, 'Imported ✓'),
  };

  const value = {
    session,
    setSession,
    bundle,
    reload,
    error,
    toast,
    notify,
    saving,
    isSupabase: api.isSupabase,
    ...actions,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
