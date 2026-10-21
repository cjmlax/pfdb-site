// Frog sprite renderer — a port of the renderer from rilinium's Splashdex
// (https://github.com/rilinium/splashdex), used with permission. Animated
// patterns follow the game's own Futile/AnimatedPattern shader.
//
// A frog is composited from grayscale game sprites, all 256×256 cells (the
// adult is the left half of each 512×256 sheet):
//   1. base    — shared body, multiplied by the base color (50% alpha for Glass)
//   2. pattern — the breed's mask, multiplied by the secondary color
//   3. extra   — a few breeds' untinted third layer
//   4. overlay — shared shading, hard-light blended over everything below
// Every layer is mixed in one pixel loop over plain arrays and written to the
// canvas with a single putImageData, so a frame costs no temporary canvases.
// Static frogs are drawn once; Chroma and animated-pattern frogs join one shared
// requestAnimationFrame loop while they're on screen.

export type Rgb = [number, number, number];

export interface FrogLook {
  base:    Rgb;
  sec:     Rgb;
  glass:   boolean;
  chroma:  boolean;
  breedId: number;
  pattern: string;   // sprite URLs
  extra?:  string;
  anim?:   string;
}

// ── Per-breed exceptions ──────────────────────────────────────────────────
// Most breeds take the default path; these mirror the game's own tables.

// Porto's pattern (its body) sits above the shading overlay, not below it.
const OVERLAY_UNDER_PATTERN = new Set([115]);

// Animated patterns (animatedPatternTable.csv). speed is cycles per second.
//   scroll  — the anim texture's red slides along dir (UV units per cycle),
//             tiled scaleX × scaleY times across the pose, and is drawn as a
//             glossy shine in the pattern color; the sprite gives only the outline.
//   sparkle — stars in the anim texture flash white once per cycle, each at
//             its own moment (blue ÷ red), over the normal tinted pattern.
type AnimCfg =
  | { type: 'scroll'; speed: number; dirX: number; dirY: number; scaleX: number; scaleY: number }
  | { type: 'sparkle'; speed: number };
const ANIMATED: Record<number, AnimCfg> = {
  122: { type: 'scroll', speed: 0.25, dirX: 0, dirY: 1, scaleX: 1.35, scaleY: 1.0 }, // Flagro (v-scroll)
  123: { type: 'sparkle', speed: 0.174 },                                            // Araneum
};

// The game's pattern clock: real seconds, wrapped every 1000s. Every current
// speed is a whole number of cycles per 1000s, so the wrap is seamless.
const CLOCK_WRAP = 1000;

// Chroma sweeps the secondary color around the hue wheel: one cycle every ~8.3s
// (Splashdex's 0.002/frame at 60fps), on a clock so refresh rate doesn't matter.
const CHROMA_HUE_PER_SEC = 0.12;

const SPRITE_BASE    = `${import.meta.env.BASE_URL}sprites/frog_base_256.png`;
const SPRITE_OVERLAY = `${import.meta.env.BASE_URL}sprites/overlay_256.png`;

// The part of the 256 cell any layer ever reaches; the canvas covers only this.
const VX = 16, VY = 16;
export const VIEW_W = 224, VIEW_H = 184;

// ── Sprite loading ────────────────────────────────────────────────────────

interface Pixels { data: Uint8ClampedArray; w: number; h: number }

const spriteCache = new Map<string, Promise<Pixels>>();

// Decodes a sprite to raw RGBA once per URL. cell crops to the left 256×256
// (the adult); textures keep their own size. No color-space conversion, so the
// masks' grays — and the sparkle timing stored in channel ratios — reach the
// math unchanged.
function loadPixels(url: string, cell: boolean): Promise<Pixels> {
  const key = `${cell ? 'c' : 't'}:${url}`;
  let p = spriteCache.get(key);
  if (!p) {
    p = (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`sprite ${res.status}: ${url}`);
      const bmp = await createImageBitmap(await res.blob(), {
        premultiplyAlpha: 'none', colorSpaceConversion: 'none',
      });
      const w = cell ? 256 : bmp.width, h = cell ? 256 : bmp.height;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(bmp, 0, 0, w, h, 0, 0, w, h);
      bmp.close();
      return { data: ctx.getImageData(0, 0, w, h).data, w, h };
    })();
    p.catch(() => spriteCache.delete(key)); // let a failed fetch retry next time
    spriteCache.set(key, p);
  }
  return p;
}

// ── Color helpers ─────────────────────────────────────────────────────────

function hsvToRgb(h: number): Rgb {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const q = 1 - f, t = f;
  const [r, g, b] = [[1, t, 0], [q, 1, 0], [0, 1, t], [0, q, 1], [t, 0, 1], [1, 0, q]][i % 6];
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Hard-light blend of overlay gray v (0–1) onto channel c (0–255) at opacity oa.
function hardLight(c: number, v: number, oa: number): number {
  const n = c / 255;
  const res = v < 0.5 ? 2 * v * n : 1 - 2 * (1 - v) * (1 - n);
  return (1 - oa) * c + oa * res * 255;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Bilinear sample of one channel (0–1) at UV (u, v), top-left origin, repeating.
function sampleRepeat(px: Pixels, u: number, v: number, ch: number): number {
  const { data, w, h } = px;
  const fx = u * w - 0.5, fy = v * h - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const dx = fx - x0, dy = fy - y0;
  const xa = ((x0 % w) + w) % w, xb = (xa + 1) % w;
  const ya = ((y0 % h) + h) % h, yb = (ya + 1) % h;
  const p = (x: number, y: number) => data[(y * w + x) * 4 + ch];
  return ((p(xa, ya) * (1 - dx) + p(xb, ya) * dx) * (1 - dy)
        + (p(xa, yb) * (1 - dx) + p(xb, yb) * dx) * dy) / 255;
}

// ── Renderer ──────────────────────────────────────────────────────────────

export interface FrogRenderer {
  animated: boolean;
  draw(tSec: number): void;
}

// Loads every layer the frog needs and returns a renderer bound to the canvas.
export async function createFrogRenderer(canvas: HTMLCanvasElement, look: FrogLook): Promise<FrogRenderer> {
  const cfg = look.anim ? ANIMATED[look.breedId] : undefined;
  const [base, pattern, overlay, extra, anim] = await Promise.all([
    loadPixels(SPRITE_BASE, true),
    loadPixels(look.pattern, true),
    loadPixels(SPRITE_OVERLAY, true),
    look.extra ? loadPixels(look.extra, true) : null,
    // Sparkle data lines up pixel-for-pixel with the sprite sheet; scroll
    // textures are tiled per pose, so they keep their own size.
    cfg && look.anim ? loadPixels(look.anim, cfg.type === 'sparkle') : null,
  ]);
  const scroll  = cfg?.type === 'scroll'  && anim ? cfg : null;
  const sparkle = cfg?.type === 'sparkle' && anim ? cfg : null;

  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(VIEW_W, VIEW_H);
  const o = out.data;

  const [cr, cg, cb] = look.base;
  const baseAlpha = look.glass ? 0.5 : 1;
  const overlayFirst = OVERLAY_UNDER_PATTERN.has(look.breedId);
  const B = base.data, P = pattern.data, OV = overlay.data, X = extra?.data;

  // Sparkle: each star's peak (red), steady glow (green) and flash moment
  // (blue ÷ red, as a fraction of the cycle), read once per view pixel.
  let spR: Float32Array | null = null, spG: Float32Array | null = null, spPhase: Float32Array | null = null;
  if (sparkle && anim) {
    const n = VIEW_W * VIEW_H, A = anim.data;
    spR = new Float32Array(n); spG = new Float32Array(n); spPhase = new Float32Array(n);
    for (let y = 0, j = 0; y < VIEW_H; y++) {
      for (let x = 0; x < VIEW_W; x++, j++) {
        const i = ((y + VY) * 256 + x + VX) * 4;
        spR[j] = A[i] / 255;
        spG[j] = A[i + 1] / 255;
        spPhase[j] = Math.min(1, A[i + 2] / Math.max(A[i], 1));
      }
    }
  }

  // Working pixel (straight alpha): color 0–255, alpha 0–1.
  let r = 0, g = 0, b = 0, a = 0;
  const over = (sr: number, sg: number, sb: number, sa: number) => {
    if (sa <= 0) return;
    const oa = sa + a * (1 - sa);
    const k = a * (1 - sa);
    r = (sr * sa + r * k) / oa;
    g = (sg * sa + g * k) / oa;
    b = (sb * sa + b * k) / oa;
    a = oa;
  };
  // Hard-light with the overlay's gray; keeps the frog's own alpha.
  const shade = (i: number) => {
    const oa = OV[i + 3] / 255;
    if (oa <= 0) return;
    const v = OV[i] / 255;
    r = hardLight(r, v, oa); g = hardLight(g, v, oa); b = hardLight(b, v, oa);
  };

  const draw = (tSec: number) => {
    const t = tSec % CLOCK_WRAP;
    const [pr, pg, pb] = look.chroma ? hsvToRgb((t * CHROMA_HUE_PER_SEC) % 1) : look.sec;
    const cycle = cfg ? t * cfg.speed : 0;
    // Scroll offset in UV units; the texture repeats, so only the fraction matters.
    const offU = scroll ? (scroll.dirX * cycle) % 1 : 0;
    const offV = scroll ? (scroll.dirY * cycle) % 1 : 0;

    let j = 0;
    for (let y = VY; y < VY + VIEW_H; y++) {
      // The shader works in Unity UVs (v up from the bottom); flip back to
      // image rows for the lookup. With dirY = 1 the texture slides downward.
      const vTex = scroll ? 1 - (((1 - y / 256) * scroll.scaleY + offV) % 1) : 0;
      for (let x = VX; x < VX + VIEW_W; x++, j += 4) {
        const i = (y * 256 + x) * 4;

        r = B[i] * cr / 255; g = B[i + 1] * cg / 255; b = B[i + 2] * cb / 255;
        a = (B[i + 3] / 255) * baseAlpha;

        if (overlayFirst) shade(i);

        const ma = P[i + 3] / 255;
        if (scroll && anim) {
          // Glossy shine from the scrolling texture; it also decides where the
          // pattern shows. The sprite contributes only its outline (alpha).
          if (ma > 0) {
            const s = sampleRepeat(anim, (x / 256) * scroll.scaleX + offU, vTex, 0);
            const pa = smoothstep(0.34, 0.72, s) * ma;
            if (pa > 0) {
              const lift = 0.6 + 0.75 * s, hi = 0.35 * smoothstep(0.78, 0.98, s) * 255;
              over(Math.min(255, pr * lift + hi), Math.min(255, pg * lift + hi), Math.min(255, pb * lift + hi), pa);
            }
          }
        } else if (ma > 0) {
          over(P[i] * pr / 255, P[i + 1] * pg / 255, P[i + 2] * pb / 255, ma);
        }

        if (sparkle && spR) {
          // White flash, a bell curve around the star's moment in the cycle,
          // laid over the pattern (it shows even where the pattern is clear).
          const k = j >> 2, peak = spR[k], glow = spG![k];
          if (peak > 0 || glow > 0) {
            const d = ((cycle - spPhase![k] + 0.5) % 1 + 1) % 1 - 0.5;
            const flash = d > -0.12 && d < 0.12 ? peak * Math.pow(2, -1636 * d * d) : 0;
            over(255, 255, 255, Math.min(1, Math.max(flash, glow)));
          }
        }

        if (X) over(X[i], X[i + 1], X[i + 2], X[i + 3] / 255);
        if (!overlayFirst) shade(i);

        o[j] = r; o[j + 1] = g; o[j + 2] = b; o[j + 3] = a * 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  };

  return { animated: look.chroma || !!(scroll || sparkle), draw };
}

// ── Shared animation loop ─────────────────────────────────────────────────
// One rAF loop drives every moving frog on screen, and stops when none are.

const active = new Set<FrogRenderer>();
let rafId = 0;

function tick(now: number) {
  const t = now / 1000;
  active.forEach(f => f.draw(t));
  rafId = active.size ? requestAnimationFrame(tick) : 0;
}

export function startAnimating(f: FrogRenderer) {
  active.add(f);
  if (!rafId) rafId = requestAnimationFrame(tick);
}

export function stopAnimating(f: FrogRenderer) {
  active.delete(f);
}
