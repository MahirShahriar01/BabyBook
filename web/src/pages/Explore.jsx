import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { Page, Tile, TopBar } from '../components/ui.jsx';

export default function Explore() {
  const { content, profile, progress, t } = useApp();
  const nav = useNavigate();
  const topics = (content.topics || []).filter(
    (tp) => tp.published !== false && (!profile.age || !tp.ageGroups?.length || tp.ageGroups.includes(profile.age)),
  );
  const seen = (tp) => tp.items.filter((it) => progress.done[`explore:${tp.id}:${it.id}`]).length;

  return (
    <Page>
      <TopBar title={t('explore')} emoji="🌍" />
      <div className="grid auto">
        {topics.map((tp, i) => (
          <Tile
            key={tp.id}
            emoji={tp.emoji}
            label={tp.title}
            sub={`${seen(tp)} / ${tp.items.length} discovered`}
            color={tp.color}
            delay={i * 0.04}
            anim={`anim-${tp.animation === 'drive' || tp.animation === 'fly' || tp.animation === 'sail' ? 'float' : tp.animation || 'bounce'}`}
            onClick={() => nav(`/explore/${tp.id}`)}
          />
        ))}
      </div>
    </Page>
  );
}
