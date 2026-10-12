import {RefObject, useLayoutEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';

export type TextSpec = {text: string; weight: number; size: number; family: string; tracking?: number};

// document.fonts.load() does not wait for the Remotion-injected faces, so first layout can still use
// fallback metrics. Poll until the measurement holds steady across several checks.
const stableMeasure = (read: () => number[], interval = 100, needed = 4, maxTries = 60) =>
  new Promise<number[]>((resolve) => {
    let last = '';
    let same = 0;
    let tries = 0;
    const tick = () => {
      const v = read();
      const key = v.map((n) => n.toFixed(2)).join(',');
      same = key === last ? same + 1 : 0;
      last = key;
      tries++;
      if (same >= needed || tries >= maxTries) resolve(v);
      else setTimeout(tick, interval);
    };
    document.fonts.ready.then(tick);
  });

// Widths of free-standing text specs, laid out in hidden DOM spans
export const useTextWidths = (specs: TextSpec[]) => {
  const [handle] = useState(() => delayRender('measure text'));
  const [widths, setWidths] = useState<number[] | null>(null);
  useLayoutEffect(() => {
    let alive = true;
    const els = specs.map((s) => {
      const el = document.createElement('span');
      el.textContent = s.text;
      Object.assign(el.style, {
        position: 'absolute',
        left: '-100000px',
        top: '0',
        visibility: 'hidden',
        whiteSpace: 'pre',
        fontFamily: `"${s.family}"`,
        fontWeight: String(s.weight),
        fontSize: `${s.size}px`,
        letterSpacing: `${s.tracking ?? 0}em`,
      });
      document.body.appendChild(el);
      return el;
    });
    stableMeasure(() => els.map((el) => el.getBoundingClientRect().width)).then((out) => {
      els.forEach((el) => el.remove());
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

// Widths of the children of a hidden element rendered in the real styling context
export const useChildWidths = (ref: RefObject<HTMLElement | null>) => {
  const [handle] = useState(() => delayRender('measure children'));
  const [widths, setWidths] = useState<number[] | null>(null);
  useLayoutEffect(() => {
    let alive = true;
    stableMeasure(() => Array.from(ref.current?.children ?? []).map((c) => (c as HTMLElement).offsetWidth)).then(
      (out) => {
        if (alive) setWidths(out);
        continueRender(handle);
      },
    );
    return () => {
      alive = false;
    };
  }, [handle, ref]);
  return widths;
};
