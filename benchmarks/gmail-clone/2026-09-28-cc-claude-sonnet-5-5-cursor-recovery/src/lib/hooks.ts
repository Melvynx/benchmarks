import { useEffect, useState } from 'react';
import type { Settings } from './types';
import { tick } from './actions';
import { getUI, setUI, toast } from './ui';
import { navigate } from './router';
import { getState } from './store';

export type Viewport = 'mobile' | 'tablet' | 'desktop';

function viewportNow(): Viewport {
  const w = window.innerWidth;
  return w < 760 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop';
}

export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(viewportNow);
  useEffect(() => {
    const on = () => setVp(viewportNow());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

function systemDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function applyPrefs(s: Pick<Settings, 'theme' | 'accent' | 'density'>) {
  const root = document.documentElement;
  const dark = s.theme === 'dark' || (s.theme === 'system' && systemDark());
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.accent = s.accent;
  root.dataset.density = s.density;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111318' : '#f6f8fc');
}

export function usePrefs(settings: Settings) {
  useEffect(() => {
    applyPrefs(settings);
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyPrefs(settings);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [settings.theme, settings.accent, settings.density]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Drives snooze expiry, scheduled sends, simulated replies and the relative-time clock. */
export function useTicker() {
  useEffect(() => {
    const run = () => {
      const now = Date.now();
      setUI({ now });
      for (const ev of tick(now)) {
        const thread = getState().threads[ev.threadId];
        const subject = thread?.subject || '(no subject)';
        if (ev.kind === 'reply' || ev.kind === 'incoming') {
          toast(`New message${ev.from ? ` from ${ev.from}` : ''}: ${subject}`, {
            actions: [{ label: 'View', run: () => navigate(`#/inbox/${encodeURIComponent(ev.threadId)}`) }],
            duration: 6000,
          });
        } else if (ev.kind === 'snooze') {
          toast(`Snoozed conversation is back in your inbox: ${subject}`, {
            actions: [{ label: 'View', run: () => navigate(`#/inbox/${encodeURIComponent(ev.threadId)}`) }],
            duration: 6000,
          });
        } else if (ev.kind === 'scheduled') {
          toast(`Scheduled message sent: ${subject}`, { duration: 5000 });
        }
      }
    };
    run();
    const id = setInterval(run, 5000);
    const onVis = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

export const nowTs = () => getUI().now;
