import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { Page, Tile, TopBar } from '../components/ui.jsx';

export default function Stories() {
  const { content, profile, progress, t } = useApp();
  const nav = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const published = content.stories.filter((s) => s.published !== false);
  const forAge = published.filter((s) => !profile.age || !s.ageGroups?.length || s.ageGroups.includes(profile.age));
  const list = showAll ? published : forAge;
  const langs = Object.fromEntries(content.languages.map((l) => [l.code, l]));

  return (
    <Page>
      <TopBar title={t('stories')} emoji="📖" />
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="chip">📚 {list.length} stories</span>
        {forAge.length !== published.length && (
          <button className="btn ghost small" onClick={() => setShowAll((v) => !v)}>
            {showAll ? '🎯 Just for my age' : '🌍 Show all stories'}
          </button>
        )}
      </div>
      <div className="grid auto">
        {list.map((s, i) => (
          <Tile
            key={s.id}
            emoji={s.emoji || '📘'}
            label={s.title}
            sub={`${langs[s.language]?.flag || ''} ${s.pages.length} pages ${progress.done[`story:${s.id}`] ? '· ⭐ read' : ''}`}
            color={s.color || '#1E90FF'}
            delay={i * 0.05}
            anim="anim-float"
            onClick={() => nav(`/stories/${s.id}`)}
          />
        ))}
      </div>
      {!list.length && <div className="card center">No stories yet — ask a grown-up to add some in the Admin Panel ✨</div>}
    </Page>
  );
}
