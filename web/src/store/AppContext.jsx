import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { fetchRemote, loadCached } from '../lib/content.js';
import { applyTheme, resolveTheme } from '../lib/theme.js';
import { loadProfile, loadProgress, missionsFor, saveProfile, saveProgress, today } from '../lib/progress.js';
import { translator } from '../lib/i18n.js';
import { setAnalyticsContext, track } from '../lib/analytics.js';
import { setSoundEnabled, sfx } from '../lib/sound.js';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

function freshDaily(progress, settings) {
  const d = today();
  if (progress.daily?.date === d) return progress;
  // streak: consecutive days with at least one activity
  return {
    ...progress,
    daily: { date: d, minutes: 0, missions: missionsFor(d, settings.dailyMissions || 3, settings.features) },
  };
}

export function AppProvider({ children }) {
  const [content, setContent] = useState(loadCached);
  const [profile, setProfileState] = useState(loadProfile);
  const [progress, setProgressState] = useState(() => freshDaily(loadProgress(), loadCached().settings));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();
  const settings = content.settings;

  // Pull the latest Admin Panel content in the background (works offline too).
  useEffect(() => {
    let alive = true;
    fetchRemote().then((fresh) => alive && fresh && setContent(fresh));
    return () => {
      alive = false;
    };
  }, []);

  const theme = useMemo(() => resolveTheme(settings, profile), [settings, profile]);
  useEffect(() => applyTheme(theme, settings.fontFamily), [theme, settings.fontFamily]);
  useEffect(() => setAnalyticsContext(profile), [profile]);
  useEffect(() => setSoundEnabled(profile.sound !== false), [profile.sound]);

  const setProfile = useCallback((patch) => {
    setProfileState((p) => {
      const next = { ...p, ...patch };
      saveProfile(next);
      return next;
    });
  }, []);

  const setProgress = useCallback((fn) => {
    setProgressState((p) => {
      const next = fn(p);
      saveProgress(next);
      return next;
    });
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  /**
   * Record a finished learning activity: stars, mission progress, streak, analytics.
   * @param {string} kind  letter | story | game | explore | buddy | quiz | ailab | video
   * @param {{id?:string,name?:string,stars?:number,celebrate?:boolean,value?:number,lang?:string}} info
   */
  const complete = useCallback(
    (kind, info = {}) => {
      const stars = info.stars ?? settings.rewards?.starsPerActivity ?? 1;
      const key = `${kind}:${info.id || 'x'}`;
      setProgress((p0) => {
        const p = freshDaily(p0, settings);
        const d = today();
        const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        const streak =
          p.streak.last === d ? p.streak : { last: d, count: p.streak.last === yesterday ? p.streak.count + 1 : 1 };
        const missions = p.daily.missions.map((m) => (m.key === kind ? { ...m, count: Math.min(m.goal, m.count + 1) } : m));
        const total = p.stars + stars;
        // a new sticker every 5 stars
        const stickers = [...p.stickers];
        const pool = settings.rewards?.stickers || ['⭐'];
        if (Math.floor(total / 5) > Math.floor(p.stars / 5)) stickers.push(pool[stickers.length % pool.length]);
        return { ...p, stars: total, stickers, streak, done: { ...p.done, [key]: (p.done[key] || 0) + 1 }, daily: { ...p.daily, missions } };
      });
      track(`${kind}_complete`, { id: info.id, name: info.name, value: info.value ?? stars, lang: info.lang });
      if (info.celebrate !== false) {
        sfx.success();
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 }, colors: [theme.primary, theme.secondary, theme.accent] });
      }
    },
    [setProgress, settings, theme],
  );

  // Screen-time counter (only while the tab is visible).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible' || !profile.done) return;
      setProgress((p) => {
        const q = freshDaily(p, settings);
        return { ...q, daily: { ...q.daily, minutes: q.daily.minutes + 1 } };
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [profile.done, setProgress, settings]);

  const limit = progress.limitMinutes || settings.screenTime?.defaultDailyMinutes || 0;
  const timeUp = Boolean(limit) && progress.daily.minutes >= limit;

  const value = {
    content,
    settings,
    profile,
    setProfile,
    progress,
    setProgress,
    theme,
    t: translator(profile.uiLang),
    complete,
    toast,
    showToast,
    timeUp,
    limit,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
