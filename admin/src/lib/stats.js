// Turns raw anonymous events into dashboard numbers.
const day = (iso) => iso.slice(0, 10);

export function aggregate(events, days = 30) {
  const daily = {};
  for (let d = days - 1; d >= 0; d--) {
    const k = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
    daily[k] = { day: k.slice(5), sessions: new Set(), events: 0, web: new Set(), android: new Set() };
  }
  const count = (map, k, n = 1) => k && (map[k] = (map[k] || 0) + n);
  const sessions = new Set();
  const items = {};
  const byEvent = {};
  const age = {};
  const theme = {};
  const gender = {};
  const platform = {};
  const lang = {};
  const sessionMeta = {};

  for (const e of events) {
    const d = daily[day(e.created_at)];
    if (d) {
      d.events++;
      d.sessions.add(e.session_id);
      if (e.platform === 'web') d.web.add(e.session_id);
      if (e.platform === 'android') d.android.add(e.session_id);
    }
    sessions.add(e.session_id);
    count(byEvent, e.event);
    count(lang, e.lang);
    if (e.item_id) {
      const k = `${e.event}|${e.item_id}`;
      items[k] = items[k] || { event: e.event, id: e.item_id, name: e.item_name || e.item_id, total: 0 };
      items[k].total++;
    }
    if (!sessionMeta[e.session_id]) {
      sessionMeta[e.session_id] = true;
      count(age, e.age_group);
      count(theme, e.theme);
      count(gender, e.gender);
      count(platform, e.platform);
    }
  }
  const top = (ev, n = 8) =>
    Object.values(items)
      .filter((i) => i.event === ev)
      .sort((a, b) => b.total - a.total)
      .slice(0, n);
  const pie = (m) => Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const series = Object.values(daily).map((d) => ({ day: d.day, sessions: d.sessions.size, events: d.events, web: d.web.size, android: d.android.size }));
  const today = series[series.length - 1] || { sessions: 0, events: 0 };
  const yesterday = series[series.length - 2] || { sessions: 0 };
  return {
    series,
    totals: {
      sessions: sessions.size,
      events: events.length,
      today: today.sessions,
      yesterday: yesterday.sessions,
      avgPerSession: sessions.size ? (events.length / sessions.size).toFixed(1) : '0',
      stories: byEvent.story_complete || 0,
      games: byEvent.game_complete || 0,
      buddy: byEvent.buddy_complete || 0,
      videos: byEvent.video_play || 0,
    },
    topStories: top('story_complete'),
    topGames: top('game_complete'),
    topVideos: top('video_play'),
    topExplore: top('explore_complete'),
    byEvent: pie(byEvent),
    age: pie(age),
    theme: pie(theme),
    gender: pie(gender),
    platform: pie(platform),
    lang: pie(lang),
  };
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}
