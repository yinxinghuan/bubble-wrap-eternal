// Build a responsive grid of bubbles that fills the play area, pops cells
// on demand, and quietly refills cells that have been popped long enough.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Bubble } from '../types';

const BASE_SIZE_PX = 60;     // ideal cell width
const REFILL_AFTER_MS = 14_000;
const REFILL_RATIO = 0.70;   // when at least this much is popped, start refilling
const REFILL_RATE_MS = 220;  // gap between refill animations

function makeId(row: number, col: number, gen: number): string {
  return `r${row}c${col}g${gen}`;
}

function jitter(): number {
  return (Math.random() - 0.5) * 0.6;   // -0.3..0.3
}

export function useBubbles(containerRef: React.RefObject<HTMLElement>) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [cols, setCols] = useState(0);
  const [rows, setRows] = useState(0);
  const genRef = useRef(0);

  // Build/rebuild grid on resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let resizeObs: ResizeObserver | null = null;
    let raf = 0;

    const rebuild = () => {
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;
      const c = Math.max(3, Math.floor(w / BASE_SIZE_PX));
      const r = Math.max(4, Math.floor(h / BASE_SIZE_PX));
      setCols(c);
      setRows(r);
      genRef.current = (genRef.current + 1) | 0;
      const gen = genRef.current;
      const next: Bubble[] = [];
      for (let row = 0; row < r; row++) {
        for (let col = 0; col < c; col++) {
          next.push({
            id: makeId(row, col, gen),
            row,
            col,
            jitterX: jitter(),
            jitterY: jitter(),
            size: 0.92 + Math.random() * 0.14,
            hue: 195 + Math.random() * 28,   // narrow blue-cyan band
            popped: false,
            poppedAt: 0,
          });
        }
      }
      setBubbles(next);
    };

    rebuild();
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(rebuild);
    };
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(onResize);
      resizeObs.observe(el);
    } else {
      window.addEventListener('resize', onResize);
    }

    return () => {
      resizeObs?.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [containerRef]);

  const pop = useCallback((id: string) => {
    setBubbles(prev => {
      const i = prev.findIndex(b => b.id === id);
      if (i < 0 || prev[i].popped) return prev;
      const next = prev.slice();
      next[i] = { ...next[i], popped: true, poppedAt: Date.now() };
      return next;
    });
  }, []);

  // Refill loop — when ≥REFILL_RATIO popped, gently restore one bubble at a time.
  useEffect(() => {
    if (bubbles.length === 0) return;
    const popped = bubbles.filter(b => b.popped);
    if (popped.length / bubbles.length < REFILL_RATIO) return;
    const now = Date.now();
    const eligible = popped.filter(b => now - b.poppedAt >= REFILL_AFTER_MS);
    if (eligible.length === 0) {
      // schedule a check when the oldest pop ripens
      const oldest = popped.reduce((min, b) => Math.min(min, b.poppedAt), now);
      const wait = Math.max(500, REFILL_AFTER_MS - (now - oldest));
      const t = setTimeout(() => { /* trigger via state nudge */
        setBubbles(b => b.slice());
      }, wait + 50);
      return () => clearTimeout(t);
    }
    const target = eligible[Math.floor(Math.random() * eligible.length)];
    const t = setTimeout(() => {
      setBubbles(prev => {
        const i = prev.findIndex(b => b.id === target.id);
        if (i < 0 || !prev[i].popped) return prev;
        const next = prev.slice();
        // Fresh identity so React re-keys and the spawn-in CSS plays.
        genRef.current = (genRef.current + 1) | 0;
        next[i] = {
          ...next[i],
          id: makeId(next[i].row, next[i].col, genRef.current),
          jitterX: jitter(),
          jitterY: jitter(),
          size: 0.92 + Math.random() * 0.14,
          hue: 195 + Math.random() * 28,
          popped: false,
          poppedAt: 0,
        };
        return next;
      });
    }, REFILL_RATE_MS);
    return () => clearTimeout(t);
  }, [bubbles]);

  return { bubbles, cols, rows, pop };
}
