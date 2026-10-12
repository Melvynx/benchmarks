import {useLayoutEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';

export type TextSpec = {text: string; weight: number; size: number; family: string; tracking?: number};

// Measures text widths once fonts are ready, holding the render until it is done
export const useTextWidths = (specs: TextSpec[]) => {
  const [handle] = useState(() => delayRender('measure text'));
  const [widths, setWidths] = useState<number[] | null>(null);
  useLayoutEffect(() => {
    let alive = true;
    Promise.all(specs.map((s) => document.fonts.load(`${s.weight} ${s.size}px "${s.family}"`)))
      .then(() => document.fonts.ready)
      .then(() => {
        const ctx = document.createElement('canvas').getContext('2d')!;
        const out = specs.map((s) => {
          ctx.font = `${s.weight} ${s.size}px "${s.family}"`;
          (ctx as unknown as {letterSpacing: string}).letterSpacing = `${(s.tracking ?? 0) * s.size}px`;
          return ctx.measureText(s.text).width;
        });
        if (alive) setWidths(out);
        continueRender(handle);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return widths;
};
