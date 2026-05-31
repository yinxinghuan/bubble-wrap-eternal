// Bubble pop sound — short pitched chirp + soft thump.
// Per CLAUDE.md memory rules:
//   - AudioContext init gated on first user gesture
//   - no continuous drone; this whole module is one-shots only

let actx: AudioContext | null = null;
let master: GainNode | null = null;
let liveVoices = 0;
const MAX_VOICES = 24;
let muted = false;
const MASTER_VOL = 0.45;

export function initAudio(): void {
  if (actx) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    actx = new Ctx();
    master = actx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOL;
    master.connect(actx.destination);
  } catch (_) {
    actx = null;
  }
}

export function audioReady(): boolean {
  return !!actx && actx.state === 'running' && liveVoices < MAX_VOICES;
}

export function isMuted(): boolean { return muted; }
export function setMuted(next: boolean): void {
  muted = next;
  if (!master || !actx) return;
  try { master.gain.setValueAtTime(muted ? 0 : MASTER_VOL, actx.currentTime); } catch (_) {}
}

function trackVoice(durMs: number) {
  liveVoices++;
  setTimeout(() => { liveVoices--; }, durMs + 30);
}

/** Plastic bubble pop — short pitched chirp + a quiet noise thwip. */
export function playPop() {
  if (!audioReady() || !actx || !master) return;
  const t = actx.currentTime;
  // Pitch jitter so a row of pops sounds melodic, not robotic.
  const base = 480 + Math.random() * 320;

  // Tone — descending blip
  const o = actx.createOscillator();
  const og = actx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(base * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(base * 0.55, t + 0.08);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(og).connect(master);
  o.start(t);
  o.stop(t + 0.14);

  // Click — single-cycle of noise filtered
  const sr = actx.sampleRate;
  const buf = actx.createBuffer(1, Math.floor(sr * 0.05), sr);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const src = actx.createBufferSource();
  src.buffer = buf;
  const bp = actx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = base * 1.2;
  bp.Q.value = 1.4;
  const ng = actx.createGain();
  ng.gain.value = 0.10;
  src.connect(bp).connect(ng).connect(master);
  src.start(t);
  src.stop(t + 0.06);

  trackVoice(160);
}

/** Soft chime when a fortune slip drops. */
export function playFortuneChime() {
  if (!audioReady() || !actx || !master) return;
  const t = actx.currentTime;
  const make = (f: number, delay: number) => {
    const o = actx!.createOscillator();
    const g = actx!.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + delay);
    g.gain.exponentialRampToValueAtTime(0.16, t + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 1.0);
    o.connect(g).connect(master!);
    o.start(t + delay);
    o.stop(t + delay + 1.05);
  };
  make(660, 0);
  make(990, 0.06);
  make(1320, 0.12);
  trackVoice(1200);
}

export function hapticTap(): void {
  try {
    if ('vibrate' in navigator) (navigator as Navigator & { vibrate: (n: number) => void }).vibrate(6);
  } catch (_) {}
}

// Global delegated tap feedback for non-bubble buttons.
let globalInstalled = false;
export function installGlobalTapFeedback(): void {
  if (globalInstalled || typeof window === 'undefined') return;
  globalInstalled = true;
  window.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const interactive = target.closest('button, [role="button"], a[href]') as HTMLElement | null;
    if (!interactive) return;
    if ((interactive as HTMLButtonElement).disabled) return;
    if (interactive.closest('[data-no-feedback]')) return;
    playUiPop();
    hapticTap();
  }, true);
}
function playUiPop() {
  if (!audioReady() || !actx || !master) return;
  const t = actx.currentTime;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = 'sine';
  o.frequency.value = 380 + Math.random() * 60;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.12);
}
