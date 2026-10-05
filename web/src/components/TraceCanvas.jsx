import { useEffect, useRef, useState } from 'react';

/**
 * Letter tracing canvas with sparkle particles.
 * The guide glyph is drawn faintly; the kid traces over it. When enough of the glyph
 * is covered, onDone() fires once.
 */
export default function TraceCanvas({ char, color = '#ff4fa3', onDone }) {
  const wrapRef = useRef(null);
  const guideRef = useRef(null);
  const drawRef = useRef(null);
  const fxRef = useRef(null);
  const particles = useRef([]);
  const drawing = useRef(false);
  const last = useRef(null);
  const doneRef = useRef(false);
  const [coverage, setCoverage] = useState(0);

  // (re)draw the guide whenever the letter changes
  useEffect(() => {
    const wrap = wrapRef.current;
    const size = Math.round(wrap.clientWidth * (window.devicePixelRatio || 1));
    for (const c of [guideRef.current, drawRef.current, fxRef.current]) {
      c.width = size;
      c.height = size;
    }
    const g = guideRef.current.getContext('2d');
    g.clearRect(0, 0, size, size);
    g.fillStyle = 'rgba(120,120,160,0.18)';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const fontPx = char.length > 1 ? size * 0.42 : size * 0.7;
    g.font = `800 ${fontPx}px ${getComputedStyle(document.body).fontFamily}`;
    g.fillText(char, size / 2, size / 2 + size * 0.04);
    g.setLineDash([size * 0.02, size * 0.02]);
    g.lineWidth = size * 0.006;
    g.strokeStyle = 'rgba(120,120,160,0.55)';
    g.strokeText(char, size / 2, size / 2 + size * 0.04);
    drawRef.current.getContext('2d').clearRect(0, 0, size, size);
    doneRef.current = false;
    setCoverage(0);
  }, [char]);

  // particle loop
  useEffect(() => {
    let raf;
    const tick = () => {
      const c = fxRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        particles.current = particles.current.filter((p) => p.life > 0);
        for (const p of particles.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.15;
          p.life -= 1;
          ctx.globalAlpha = Math.max(0, p.life / 40);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pos = (e) => {
    const r = drawRef.current.getBoundingClientRect();
    const k = drawRef.current.width / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };

  const spark = (p) => {
    const colors = [color, '#FFD23F', '#3DD6FF', '#FF5D73', '#7CFF6B'];
    for (let i = 0; i < 4; i++)
      particles.current.push({
        x: p.x,
        y: p.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 1) * 5,
        r: 3 + Math.random() * 5,
        life: 30 + Math.random() * 15,
        color: colors[(Math.random() * colors.length) | 0],
      });
  };

  const line = (a, b) => {
    const ctx = drawRef.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = drawRef.current.width * 0.06;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  const measure = () => {
    const w = guideRef.current.width;
    const step = Math.max(2, Math.round(w / 90));
    const gd = guideRef.current.getContext('2d').getImageData(0, 0, w, w).data;
    const dd = drawRef.current.getContext('2d').getImageData(0, 0, w, w).data;
    let inside = 0;
    let hit = 0;
    let outside = 0;
    for (let y = 0; y < w; y += step)
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4 + 3;
        const isGuide = gd[i] > 30;
        const isDrawn = dd[i] > 30;
        if (isGuide) {
          inside++;
          if (isDrawn) hit++;
        } else if (isDrawn) outside++;
      }
    const cov = inside ? hit / inside : 0;
    // scribbling everywhere should not count as tracing
    const precise = outside < inside * 1.6;
    setCoverage(Math.round(cov * 100));
    if (cov > 0.55 && precise && !doneRef.current) {
      doneRef.current = true;
      onDone?.();
    }
  };

  const clear = () => {
    const c = drawRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    doneRef.current = false;
    setCoverage(0);
  };

  return (
    <div style={{ width: '100%', display: 'grid', justifyItems: 'center', gap: 10 }}>
      <div
        ref={wrapRef}
        className="trace-wrap"
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = pos(e);
          line(last.current, last.current);
          spark(last.current);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = pos(e);
          line(last.current, p);
          spark(p);
          last.current = p;
        }}
        onPointerUp={() => {
          drawing.current = false;
          measure();
        }}
        onPointerCancel={() => (drawing.current = false)}
      >
        <canvas ref={guideRef} />
        <canvas ref={drawRef} />
        <canvas ref={fxRef} />
      </div>
      <div className="row">
        <span className="chip">✏️ {coverage}% traced</span>
        <button className="btn ghost small" onClick={clear}>
          🧽 Clear
        </button>
      </div>
    </div>
  );
}
