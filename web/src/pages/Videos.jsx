import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../store/AppContext.jsx';
import { Modal, Page, TopBar } from '../components/ui.jsx';
import { track } from '../lib/analytics.js';

/** Accepts a raw ID or any YouTube URL form and returns the 11-char video ID. */
export function youtubeId(v) {
  if (!v) return '';
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = String(v).match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : '';
}

function embedUrl(video, privacy) {
  const id = youtubeId(video.videoId || video.url);
  if (video.provider === 'youtube' && id) {
    const host = privacy ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
    // rel=0: related videos only from same channel; no annotations; inline on mobile.
    return `${host}/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=1`;
  }
  if (video.provider === 'vimeo') {
    const vid = String(video.videoId || video.url).match(/(\d{6,})/)?.[1];
    return vid ? `https://player.vimeo.com/video/${vid}?autoplay=1&title=0&byline=0&portrait=0&dnt=1` : '';
  }
  return video.url || '';
}

export const isDirectFile = (url) => /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url || '');

export function thumbFor(video) {
  if (video.thumbnail) return video.thumbnail;
  const id = youtubeId(video.videoId || video.url);
  return video.provider === 'youtube' && id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

export default function Videos() {
  const { content, profile, settings, t, complete } = useApp();
  const [cat, setCat] = useState('All');
  const [playing, setPlaying] = useState(null);
  const vids = content.videos.filter(
    (v) => v.published !== false && (v.videoId || v.url) && (!profile.age || !v.ageGroups?.length || v.ageGroups.includes(profile.age)),
  );
  const cats = ['All', ...new Set(vids.map((v) => v.category).filter(Boolean))];
  const list = cat === 'All' ? vids : vids.filter((v) => v.category === cat);
  const age = settings.ageGroups.find((g) => g.id === profile.age);

  const open = (v) => {
    setPlaying(v);
    track('video_play', { id: v.id, name: v.title });
  };

  return (
    <Page>
      <TopBar title={t('videos')} emoji="📺" />
      <div className="row" style={{ marginBottom: 6 }}>
        <span className="chip">
          {age?.emoji} Picked for ages {age?.range || 'all'}
        </span>
      </div>
      <div className="pill-tabs">
        {cats.map((c) => (
          <button key={c} className={c === cat ? 'active' : ''} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid auto-lg">
        {list.map((v, i) => (
          <motion.button
            key={v.id}
            className="card"
            style={{ padding: 10, textAlign: 'left' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => open(v)}
          >
            <div className="thumb">
              {thumbFor(v) && <img src={thumbFor(v)} alt="" loading="lazy" referrerPolicy="no-referrer" />}
              <div className="play">▶️</div>
            </div>
            <b style={{ display: 'block', marginTop: 8 }}>{v.title}</b>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {v.category}
            </span>
          </motion.button>
        ))}
      </div>
      {!list.length && <div className="card center">No cartoons for this age yet. Grown-ups can add them in the Admin Panel 🎬</div>}

      <Modal open={!!playing} onClose={() => setPlaying(null)}>
        {playing && (
          <div className="grid" style={{ gap: 12 }}>
            <div className="row">
              <b style={{ flex: 1 }}>{playing.title}</b>
              <button
                className="btn small"
                onClick={() => {
                  complete('video', { id: playing.id, name: playing.title, celebrate: false });
                  setPlaying(null);
                }}
              >
                ✅ Done
              </button>
            </div>
            <div className="video-frame">
              {isDirectFile(embedUrl(playing)) ? (
                <video src={embedUrl(playing)} controls autoPlay playsInline controlsList="nodownload" style={{ width: '100%', height: '100%' }} />
              ) : (
                <iframe
                  title={playing.title}
                  src={embedUrl(playing, settings.video?.privacyEnhanced !== false)}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen={settings.video?.allowFullscreen !== false}
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                />
              )}
              {/* shield over the title bar so kids can't tap out to YouTube */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 64 }} />
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
}
