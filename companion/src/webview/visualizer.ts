import type { CaptureStatus, HostMessage, Levels } from '../protocol.js';
import { BeatDetector } from './beat.js';

declare function acquireVsCodeApi(): {
  postMessage(message: { type: string }): void;
};
const vscode = acquireVsCodeApi();
function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing control: ${id}`);
  return value as T;
}
const canvas = element<HTMLCanvasElement>('universe');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas is unavailable.');
const ctx: CanvasRenderingContext2D = context;
const capture = element<HTMLButtonElement>('capture');
const message = element<HTMLParagraphElement>('message');
const RESPONSE = 2.5;
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionPreference.matches;
motionPreference.addEventListener('change', (event) => {
  reducedMotion = event.matches;
  resetBeats();
  requestFrame();
});
const blank = (): Levels => ({ bass: 0, mid: 0, treble: 0, level: 0 });
let target = blank();
const smooth = blank();
let mode: CaptureStatus = 'stopped';
let supported = false;
let width = 0;
let height = 0;
let animation = 0;
let lastFrame = 0;
let lastPacket = 0;
function updateControls(): void {
  const active = mode === 'listening' || mode === 'starting';
  capture.setAttribute('aria-checked', String(active));
  capture.disabled = !supported && !active;
  capture.title = message.textContent ?? '';
}
capture.addEventListener('click', () => {
  const active = mode === 'listening' || mode === 'starting';
  target = blank();
  mode = active ? 'stopped' : 'starting';
  updateControls();
  vscode.postMessage({ type: active ? 'stop' : 'start' });
});
window.addEventListener('message', (event: MessageEvent<HostMessage>) => {
  const incoming = event.data;
  if (incoming.type === 'status') {
    mode = incoming.status;
    supported = incoming.supported;
    message.textContent = incoming.message;
    if (!supported) {
      message.textContent = 'System audio is available on macOS 14.2+.';
    }
    target = blank();
    resetBeats();
    lastPacket = 0;
    updateControls();
  } else if (incoming.type === 'levels' && mode === 'listening') {
    target = incoming.levels;
    lastPacket = performance.now();
    detectBeat(target.bass, lastPacket);
  }
  requestFrame();
});

const VIOLET = '#b9a0f7';
const GOLD = '#edc182';
const PALE = '#f5d9ac';
const TEAL = '#95d2d5';
/** Vertical squash of the accretion disk plane. */
const TILT = 0.2;
const WAVE_SECONDS = 0.7;
const IDLE_FRAME_MS = 1000 / 30;

const beat = new BeatDetector();
let waves: { born: number; strength: number }[] = [];
function resetBeats(): void {
  beat.reset();
  waves = [];
}
function detectBeat(bass: number, now: number): void {
  if (!beat.sample(Math.min(1, bass * RESPONSE), now) || reducedMotion) return;
  waves.push({ born: now, strength: beat.strength });
  if (waves.length > 4) waves.shift();
}

// Deterministic stars keep redraws stable and avoid a noisy random flicker.
const stars = Array.from({ length: 80 }, (_, i) => ({
  x: ((i * 73 + 19) % 997) / 997,
  y: ((i * i * 37 + 71) % 991) / 991,
  size: i % 7 === 0 ? 1.2 : 0.6,
}));
// Photons orbit in the disk plane. `u` is the orbit radius in horizon radii; they drift
// inward, brighten near the horizon, and respawn at the outer edge once swallowed.
const photons = Array.from({ length: 150 }, (_, i) => ({
  u: 1.15 + 1.45 * ((i * 0.618034) % 1),
  angle: i * 2.39996,
  lane: 0.5 + (i % 4) * 0.25,
  hue: i % 3 === 0 ? TEAL : i % 5 === 0 ? VIOLET : PALE,
}));
// Staggered arrivals keep stars falling into the horizon even without audio.
// Positions use horizon radii so resizing preserves each star's trajectory.
const fallingStars = Array.from({ length: 14 }, (_, i) => ({
  progress: (i / 14) * 1.2,
  angle: i * 2.39996,
  reach: 3.4 + ((i * 0.618034) % 1) * 1.2,
  duration: 14 + (i % 5) * 2,
  size: 1.1 + (i % 3) * 0.35,
  hue: i % 4 === 0 ? VIOLET : i % 3 === 0 ? TEAL : PALE,
}));

function infallPosition(star: (typeof fallingStars)[number], progress: number, r: number) {
  const t = Math.max(0, Math.min(1, progress));
  // The inward plunge and angular speed both accelerate as gravity takes over.
  const distance = r * (0.65 + (star.reach - 0.65) * (1 - t ** 1.7));
  const angle = star.angle + t * 1.4 + t ** 3 * 2.8;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance * 0.82 };
}

function drawFallingStars(r: number, kick: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const star of fallingStars) {
    const t = star.progress;
    const arrival = Math.min(1, t / 0.1);
    const heat = Math.min(1, t ** 2);
    const brightness = arrival * (0.55 + heat * 0.35 + kick * 0.1);
    const head = infallPosition(star, t, r);
    // The tail follows earlier positions, then drains behind the horizon too.
    // Reduced motion leaves only stationary pinpoints of light.
    if (!reducedMotion) {
      let previous = head;
      const length = 0.018 + heat * 0.085;
      for (let segment = 1; segment <= 16; segment++) {
        const point = infallPosition(star, t - (segment / 16) * length, r);
        ctx.globalAlpha = brightness * (1 - segment / 17) ** 2 * 0.7;
        ctx.strokeStyle = star.hue;
        ctx.lineWidth = star.size * (1 - segment / 22);
        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        previous = point;
      }
    }
    const size = star.size * (1 - heat * 0.35);
    const aura = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, size * 5);
    aura.addColorStop(0, star.hue);
    aura.addColorStop(1, 'rgba(7,8,13,0)');
    ctx.globalAlpha = brightness * 0.35;
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(head.x, head.y, size * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = brightness;
    ctx.fillStyle = '#fff4df';
    ctx.beginPath();
    ctx.arc(head.x, head.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
const resize = new ResizeObserver(() => {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  requestFrame();
});
resize.observe(canvas);

let clock = 0;
let flow = 0;
let ringPhase = 0;

/** Keplerian falloff: inner orbits turn faster than outer ones. */
const orbitSpeed = (u: number) => Math.pow(1.6 / u, 1.5);

function drawWaves(near: boolean, r: number, now: number): void {
  ctx.strokeStyle = PALE;
  for (const wave of waves) {
    const t = (now - wave.born) / 1000 / WAVE_SECONDS;
    if (t < 0 || t >= 1) continue;
    const scale = 1.55 + t * 1.6;
    ctx.globalAlpha = (1 - t) ** 2 * (0.35 + 0.5 * wave.strength);
    ctx.lineWidth = 1 + (1 - t) * 2.5 * wave.strength;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      r * scale,
      r * scale * TILT,
      0,
      near ? 0 : Math.PI,
      near ? Math.PI : Math.PI * 2,
    );
    ctx.stroke();
  }
}

function drawPhotons(
  near: boolean,
  r: number,
  kick: number,
  glow: number,
  trail: number,
  glint: number,
): void {
  ctx.lineCap = 'round';
  for (const photon of photons) {
    if (near !== Math.sin(photon.angle) >= 0) continue;
    const push = 1 + kick * 0.12 * photon.lane;
    // Relativistic beaming: the side of the disk moving toward us is brighter.
    const beaming = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(photon.angle - glint));
    const heat = photon.u < 1.4 ? 1 + (1.4 - photon.u) * 3 : 1;
    ctx.globalAlpha = Math.min(1, glow * beaming * heat);
    ctx.strokeStyle = photon.hue;
    ctx.lineWidth = 0.8 + photon.lane * 0.5 + smooth.treble * 1.2;
    const span = 0.03 + trail * orbitSpeed(photon.u);
    const orbit = photon.u * push * r;
    ctx.beginPath();
    for (let k = 0; k <= 3; k++) {
      const a = photon.angle - (span * k) / 3;
      const px = Math.cos(a) * orbit;
      const py = Math.sin(a) * orbit * TILT;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

function drawDisk(
  near: boolean,
  r: number,
  pulse: number,
  kick: number,
  paint: CanvasGradient,
): void {
  ctx.strokeStyle = paint;
  const rings = near ? 7 : 9;
  for (let ring = 0; ring < rings; ring++) {
    ctx.globalAlpha = near
      ? Math.min(1, 0.15 + ring * 0.1 + kick * 0.3)
      : 0.05 + ring * 0.016 + smooth.mid * 0.045 + kick * 0.12;
    ctx.lineWidth = (near ? ring === 3 : ring === 6)
      ? (near ? 2.2 : 1.8) + kick * 1.5
      : near
        ? 0.8
        : 0.7;
    // Dashed rings carry visible texture around the disk as it turns.
    if (ring % 3 === 1) {
      ctx.setLineDash([r * 0.08, r * 0.22]);
      ctx.lineDashOffset = -flow * r * (0.6 + ring * 0.05);
    }
    const rx = near ? 1.75 + ring * 0.035 : 1.6 + ring * 0.052;
    const ry = near ? 0.37 + ring * 0.009 : 0.31 + ring * 0.012;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * rx * pulse, r * ry * pulse, 0, 0, near ? Math.PI : Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function draw(now: number): void {
  animation = 0;
  if (document.hidden || width === 0 || height === 0) return;
  const active = mode === 'listening';
  // Standby drifts at a reduced frame rate; Reduced motion keeps it still.
  const idle = !active && !reducedMotion;
  if (!active && lastFrame && now - lastFrame < IDLE_FRAME_MS - 2) {
    requestFrame();
    return;
  }
  const elapsed = Math.min((now - (lastFrame || now)) / 1000, 0.1);
  lastFrame = now;
  if (mode === 'listening' && now - lastPacket > 500) target = blank();
  const gain = RESPONSE;
  for (const key of ['bass', 'mid', 'treble', 'level'] as const) {
    const destination = active ? Math.min(1, target[key] * gain) : 0;
    const speed = destination > smooth[key] ? 12 : 4;
    smooth[key] += (destination - smooth[key]) * (1 - Math.exp(-elapsed * speed));
  }
  const kick = active ? beat.kick(now) : 0;
  waves = waves.filter((wave) => now - wave.born < WAVE_SECONDS * 1000);

  // How fast the disk turns: slow in standby, driven by loudness and kicks when active.
  const drive = reducedMotion ? 0 : active ? 0.6 + smooth.level * 1.4 + kick * 0.9 : 0.3;
  if (!reducedMotion) clock += elapsed;
  flow += elapsed * drive;
  ringPhase += elapsed * drive * 1.6;
  if (!reducedMotion) {
    for (const star of fallingStars) {
      star.progress += (elapsed * (0.7 + drive * 0.65)) / star.duration;
      // Leave time for the entire trail to be swallowed before a new arrival.
      if (star.progress >= 1.2) {
        star.progress %= 1.2;
        star.angle += 2.39996;
      }
    }
  }
  for (const photon of photons) {
    photon.angle += elapsed * drive * 0.9 * orbitSpeed(photon.u);
    photon.u -= elapsed * drive * (0.015 + 0.04 / (photon.u * photon.u));
    if (photon.u < 1.08) {
      photon.u = 2.3 + Math.random() * 0.35;
      photon.angle = Math.random() * Math.PI * 2;
    }
  }
  const glint = 0.6 * Math.sin(clock * 0.07);
  const glow = active ? 0.3 + smooth.level * 0.6 + smooth.treble * 0.3 + kick * 0.3 : 0.22;
  const trail = reducedMotion ? 0 : 0.12 + drive * 0.12;

  ctx.clearRect(0, 0, width, height);
  for (const star of stars) {
    ctx.fillStyle = '#dce1ef';
    ctx.globalAlpha = 0.12 + star.size * 0.08;
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const radius = Math.min(width * 0.2, height * 0.24, 150);
  const expansion = reducedMotion ? 1 : 1 + smooth.bass * 0.12;
  const pulse = reducedMotion ? 1 : 1 + kick * 0.08;
  const r = radius * expansion;
  const x = width * 0.5;
  const y = height * 0.55;
  const halo = ctx.createRadialGradient(x, y, r * 0.85, x, y, r * 2.5);
  halo.addColorStop(0, `rgba(185,160,247,${0.08 + smooth.mid * 0.13 + kick * 0.12})`);
  halo.addColorStop(0.4, `rgba(237,193,130,${0.03 + smooth.level * 0.04 + kick * 0.05})`);
  halo.addColorStop(1, 'rgba(7,8,13,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.3);
  const gold = ctx.createLinearGradient(-r, r, r, -r);
  gold.addColorStop(0, VIOLET);
  gold.addColorStop(0.4, GOLD);
  gold.addColorStop(1, PALE);
  const gx = Math.cos(glint) * r * 2;
  const gy = Math.sin(glint) * r * 2 * TILT;
  const beamed = ctx.createLinearGradient(-gx, -gy, gx, gy);
  beamed.addColorStop(0, VIOLET);
  beamed.addColorStop(0.55, GOLD);
  beamed.addColorStop(1, PALE);

  // Far side of the disk, then the dark sphere, then everything passing in front of it.
  drawDisk(false, r, pulse, kick, beamed);
  ctx.globalCompositeOperation = 'lighter';
  drawWaves(false, r, now);
  drawPhotons(false, r, kick, glow, trail, glint);
  // Paint infalling stars behind the opaque sphere so no light escapes its interior.
  drawFallingStars(r, kick);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#07080d';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5 + smooth.level + kick * 2.5;
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 7 + smooth.bass * 15 + kick * 28;
  ctx.stroke();
  ctx.shadowBlur = 0;
  drawDisk(true, r, pulse, kick, beamed);
  ctx.globalCompositeOperation = 'lighter';
  drawWaves(true, r, now);
  drawPhotons(true, r, kick, glow, trail, glint);
  // Photon ring: light caught in orbit just outside the horizon.
  for (let i = 0; i < 28; i++) {
    const a = i * 2.39996 + ringPhase * (i % 2 ? 1 : 1.3);
    ctx.globalAlpha =
      (active ? 0.1 + smooth.level * 0.35 + kick * 0.45 : 0.1) * (i % 4 === 0 ? 1 : 0.6);
    ctx.lineWidth = 0.8 + kick * 1.2;
    ctx.strokeStyle = i % 3 ? PALE : TEAL;
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.035 + (i % 4) * 0.02), a, a + 0.16 + smooth.level * 0.25 + kick * 0.25);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  ctx.globalAlpha = 1;
  if (active || idle || smooth.level > 0.002 || smooth.bass > 0.002 || waves.length) requestFrame();
}
function requestFrame(): void {
  if (!animation && !document.hidden) animation = requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(animation);
    animation = 0;
    target = blank();
    mode = 'stopped';
    updateControls();
    vscode.postMessage({ type: 'stop' });
  } else {
    lastFrame = 0;
    vscode.postMessage({ type: 'ready' });
    requestFrame();
  }
});
requestFrame();
updateControls();
vscode.postMessage({ type: 'ready' });
