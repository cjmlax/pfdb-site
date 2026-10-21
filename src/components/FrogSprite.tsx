import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTable } from '../api/teable';
import { imageProxyUrlByName } from '../utils/attachments';
import {
  createFrogRenderer, startAnimating, stopAnimating, VIEW_W, VIEW_H, type FrogLook, type Rgb,
} from '../utils/frogRenderer';

// Breeds keep their sprite layers in one attachment field, told apart by the
// game's own file names: frog_<id>_256.png (pattern), frog_<id>_top_256.png
// (untinted third layer; Splashdex's _extra_ spelling also accepted) and
// frog_<id>_anim.png (scrolling texture).
const SPRITE_FIELD = 'sprites';
const PATTERN_RE = /^frog_\d+_256\.png$/i;
const EXTRA_RE   = /^frog_\d+_(top|extra)_256\.png$/i;
const ANIM_RE    = /^frog_\d+_anim\.png$/i;

// Game ids for the two mutation traits.
const GLASS_BASE_ID  = 22;
const CHROMA_SEC_ID  = 15;

interface BreedFields extends Record<string, unknown> { Breed_ID?: string; sprites?: unknown }
interface BaseFields  extends Record<string, unknown> { Base_Color_ID?: string; RGB?: string }
interface SecFields   extends Record<string, unknown> { Sec_Color_ID?: string; RGB?: string }

function parseRgb(val: unknown): Rgb | null {
  const parts = String(val ?? '').split(',').map(s => Number(s.trim()));
  return parts.length === 3 && parts.every(n => Number.isFinite(n)) ? parts as Rgb : null;
}

function attachmentNames(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map(e => (e && typeof e === 'object' ? String((e as { name?: unknown }).name ?? '') : ''));
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Renders a frog from its base color, secondary color and breed record ids.
// Renders nothing until the breed has sprites uploaded, so pages are unchanged
// for breeds without them.
export default function FrogSprite({
  baseId, secId, breedId, className, title,
}: { baseId: string | null; secId: string | null; breedId: string | null; className?: string; title?: string }) {
  const { data: breeds } = useQuery({ queryKey: ['table', 'breeds'], queryFn: () => fetchTable<BreedFields>('breeds') });
  const { data: bases  } = useQuery({ queryKey: ['table', 'bases'],  queryFn: () => fetchTable<BaseFields>('bases')  });
  const { data: secs   } = useQuery({ queryKey: ['table', 'secs'],   queryFn: () => fetchTable<SecFields>('secs')    });

  const look = useMemo<FrogLook | null>(() => {
    const breed = breeds?.find(r => r.id === breedId);
    const base  = bases?.find(r => r.id === baseId);
    const sec   = secs?.find(r => r.id === secId);
    if (!breed || !base || !sec) return null;
    const baseRgb = parseRgb(base.fields.RGB), secRgb = parseRgb(sec.fields.RGB);
    if (!baseRgb || !secRgb) return null;

    const names = attachmentNames(breed.fields[SPRITE_FIELD]);
    const url = (re: RegExp) => {
      const name = names.find(n => re.test(n));
      return name ? imageProxyUrlByName('breeds', breed.id, SPRITE_FIELD, name) : undefined;
    };
    const pattern = url(PATTERN_RE);
    if (!pattern) return null;
    return {
      base:    baseRgb,
      sec:     secRgb,
      glass:   Number(base.fields.Base_Color_ID) === GLASS_BASE_ID,
      chroma:  Number(sec.fields.Sec_Color_ID) === CHROMA_SEC_ID,
      breedId: Number(breed.fields.Breed_ID),
      pattern,
      extra:   url(EXTRA_RE),
      anim:    url(ANIM_RE),
    };
  }, [breeds, bases, secs, baseId, secId, breedId]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // A stable key so a refetched-but-identical table doesn't restart the render.
  const lookKey = look ? JSON.stringify(look) : '';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!look || !canvas) return;
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let renderer: Awaited<ReturnType<typeof createFrogRenderer>> | null = null;

    createFrogRenderer(canvas, look).then(r => {
      if (cancelled) return;
      renderer = r;
      r.draw(performance.now() / 1000);
      // Moving frogs only animate while on screen, and never under reduced motion.
      if (!r.animated || reducedMotion()) return;
      observer = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) startAnimating(r); else stopAnimating(r);
      });
      observer.observe(canvas);
    }).catch(() => {
      if (!cancelled) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (renderer) stopAnimating(renderer);
    };
    // lookKey stands in for look's contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey]);

  if (!look) return null;
  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={VIEW_W}
      height={VIEW_H}
      role="img"
      aria-label={title ?? 'Frog'}
    />
  );
}
