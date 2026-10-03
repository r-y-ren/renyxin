/**
 * src/scripts/sfx.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * 星穹档案 · WebAudio 合成音效引擎（零资源文件，振荡器实时合成）
 *   - click / hover / star / comet / bomb / start / over / record
 *   - 静音开关持久化（localStorage: sfx-muted）
 *   - AudioContext 惰性创建并在首次用户手势时解锁（浏览器自动播放策略）
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;

if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  muted = localStorage.getItem('sfx-muted') === '1';
}

const MASTER_VOL = 0.5;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOL;
    master.connect(ctx.destination);
    // 预生成噪声缓冲（炸弹 / 彗星呼啸复用）
    const len = Math.floor(ctx.sampleRate * 0.6);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 单音符包络（振荡器 + 指数衰减增益） */
function tone(opts: {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  delay?: number;
}) {
  const ac = ensure();
  if (!ac || !master) return;
  const { freq, dur = 0.12, type = 'triangle', gain = 0.2, slideTo, delay = 0 } =
    opts;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** 噪声包络（低通可选） */
function noise(opts: {
  dur?: number;
  gain?: number;
  freq?: number;
  delay?: number;
}) {
  const ac = ensure();
  if (!ac || !master || !noiseBuf) return;
  const { dur = 0.25, gain = 0.18, freq = 800, delay = 0 } = opts;
  const t0 = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.3), t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

function setMuted(v: boolean) {
  muted = v;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem('sfx-muted', v ? '1' : '0');
  }
  if (master) master.gain.value = v ? 0 : MASTER_VOL;
}

function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export const sfx = {
  get muted() {
    return muted;
  },
  setMuted,
  toggleMuted,
  /** 首次用户手势时调用，解锁 AudioContext */
  unlock() {
    ensure();
  },
  click() {
    tone({ freq: 640, dur: 0.06, type: 'triangle', gain: 0.16, slideTo: 460 });
  },
  hover() {
    tone({ freq: 920, dur: 0.035, type: 'sine', gain: 0.06 });
  },
  pop() {
    tone({ freq: 760, dur: 0.09, type: 'triangle', gain: 0.18, slideTo: 1120 });
  },
  /** 接住星星：音高随连击爬升 */
  star(combo: number) {
    const base = 520 * Math.pow(2, Math.min(combo, 14) / 16);
    tone({ freq: base, dur: 0.12, type: 'triangle', gain: 0.2, slideTo: base * 1.3 });
    tone({ freq: base * 2, dur: 0.08, type: 'sine', gain: 0.07, delay: 0.02 });
  },
  comet() {
    tone({ freq: 400, dur: 0.32, type: 'triangle', gain: 0.22, slideTo: 1040 });
    noise({ dur: 0.3, gain: 0.09, freq: 1600 });
  },
  bomb() {
    tone({ freq: 130, dur: 0.34, type: 'sawtooth', gain: 0.28, slideTo: 48 });
    noise({ dur: 0.26, gain: 0.2, freq: 420 });
  },
  start() {
    [440, 554, 659, 880].forEach((f, i) =>
      tone({ freq: f, dur: 0.11, type: 'triangle', gain: 0.17, delay: i * 0.09 }),
    );
  },
  over() {
    [660, 554, 440, 330].forEach((f, i) =>
      tone({ freq: f, dur: 0.17, type: 'triangle', gain: 0.17, delay: i * 0.13 }),
    );
  },
  /** 破纪录：星光上行琶音 */
  record() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
      tone({ freq: f, dur: 0.15, type: 'sine', gain: 0.15, delay: i * 0.08 }),
    );
  },
};
