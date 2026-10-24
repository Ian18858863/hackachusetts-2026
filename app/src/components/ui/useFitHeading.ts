import { useLayoutEffect, useRef } from 'react';

/**
 * Keeps a heading on one line (T35, Ian's heading rule): the CSS size is the
 * maximum; when the text is wider than its box the font size shrinks until it
 * fits, down to `min` px (22 by default). Only at the minimum may the heading
 * wrap, and then it wraps balanced. On phones (`phoneMin`, default 0.78 of the
 * CSS size) wrapping is allowed earlier, as the design steering permits.
 *
 * Re-fits when the box width changes, when the text changes (pass it as `key`)
 * and when web fonts finish loading. Purely presentational: no content changes.
 */
export function useFitHeading<T extends HTMLElement>(key: unknown, { min = 22, phoneRatio = 0.78 } = {}) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastWidth = -1;
    let frame = 0;

    const fit = () => {
      const width = el.clientWidth;
      if (width === 0) return;
      lastWidth = width;
      el.style.fontSize = '';
      el.style.whiteSpace = 'nowrap';
      const base = parseFloat(getComputedStyle(el).fontSize);
      const phone = window.matchMedia('(max-width: 600px)').matches;
      const floor = phone ? Math.max(min, base * phoneRatio) : Math.min(min, base);
      let size = base;
      // Two passes: text width is close to linear in font size, the second pass corrects rounding.
      for (let i = 0; i < 2 && el.scrollWidth > el.clientWidth + 1; i++) {
        size = Math.max(floor, Math.floor(size * (el.clientWidth / el.scrollWidth) * 10) / 10);
        el.style.fontSize = `${size}px`;
      }
      if (el.scrollWidth > el.clientWidth + 1) el.style.whiteSpace = 'normal';
    };

    fit();
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    ro.observe(el);
    let alive = true;
    document.fonts?.ready.then(() => alive && fit());
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [key, min, phoneRatio]);

  return ref;
}

/** Headings carry no trailing punctuation (Ian's rule); copy is untouched, only the rendered end. */
export function headingText(text: string): string {
  return text.replace(/[\s.。．!！:：;；,，、]+$/u, '');
}
