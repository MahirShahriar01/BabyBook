// Tiny Web-Audio sound effects (no audio files needed).
let ctx;
let enabled = true;
export const setSoundEnabled = (v) => (enabled = v);

function tone(freq, start, dur, type = 'sine', vol = 0.15) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + start);
    o.stop(ctx.currentTime + start + dur);
  } catch {
    /* audio not available */
  }
}

export const sfx = {
  pop: () => enabled && tone(660, 0, 0.12, 'triangle'),
  tap: () => enabled && tone(520, 0, 0.08, 'square', 0.05),
  flip: () => enabled && (tone(400, 0, 0.08, 'triangle'), tone(600, 0.06, 0.08, 'triangle')),
  success: () => enabled && [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle')),
  wrong: () => enabled && (tone(300, 0, 0.15, 'sawtooth', 0.06), tone(220, 0.12, 0.2, 'sawtooth', 0.06)),
  star: () => enabled && [880, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.18, 'sine', 0.1)),
};
