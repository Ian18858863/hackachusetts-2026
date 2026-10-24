import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Reads a duration token such as "480ms" or "0.4s" from :root. */
function readDuration(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return fallback;
  return raw.endsWith('ms') ? value : value * 1000;
}

function readToken(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * FLIP re-order: children marked `data-flip-id` slide from their previous
 * place to their new one when `trigger` changes (one easing, --dur-proof).
 * Items new to the list fade in where they land. Positions are measured
 * after every commit, so unrelated height changes never cause a jump.
 * Under prefers-reduced-motion the final order appears at once.
 */
export function useFlip(container: RefObject<HTMLElement | null>, trigger: unknown): void {
  const positions = useRef<Map<string, number> | null>(null);
  const lastTrigger = useRef<unknown>(trigger);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-flip-id]'));
    const next = new Map<string, number>();
    for (const item of items) next.set(item.dataset.flipId ?? '', item.offsetTop);

    const previous = positions.current;
    const changed = lastTrigger.current !== trigger;
    positions.current = next;
    lastTrigger.current = trigger;
    if (!changed || !previous || prefersReducedMotion()) return;

    const duration = readDuration('--dur-proof', 480);
    const easing = readToken('--ease-standard', 'ease-out');
    for (const item of items) {
      const before = previous.get(item.dataset.flipId ?? '');
      const after = next.get(item.dataset.flipId ?? '') ?? 0;
      if (before === undefined) {
        item.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing, fill: 'backwards' });
        continue;
      }
      const dy = before - after;
      if (Math.abs(dy) < 1) continue;
      item.animate(
        [
          { transform: `translateY(${dy}px)`, opacity: 0.6 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration, easing },
      );
    }
  });
}
