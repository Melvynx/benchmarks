import { useEffect } from 'react';
import { realMessages } from '../lib/mailbox';
import { navigate } from '../lib/router';
import { firstName } from '../lib/utils';
import { MY_EMAIL, useMail } from '../store/mail';
import { useSettings } from '../store/settings';
import { showToast, ui } from '../store/ui';
import { useResolvedDark } from './index';

export function useTheme() {
  const dark = useResolvedDark();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111214' : '#f6f8fc');
  }, [dark]);
}

export function useTicker() {
  useEffect(() => {
    const run = () => {
      const arrivals = useMail.getState().tick(Date.now(), useSettings.getState().simulateActivity);
      const visible = arrivals.filter((t) => !t.muted && t.inInbox && !t.spam && !t.trashed);
      if (!visible.length) return;
      const current = ui.get().toast;
      if (current?.undo) return;
      const t = visible[visible.length - 1];
      const last = realMessages(t).at(-1);
      const fresh = !!last && Date.now() - last.date < 10_000;
      const from = last && last.from.email !== MY_EMAIL ? firstName(last.from.name || last.from.email) : 'you';
      const message =
        visible.length > 1
          ? `${visible.length} new conversations`
          : fresh
            ? `New message from ${from}: ${t.subject}`
            : `Snoozed conversation is back: ${t.subject}`;
      showToast(message, { action: { label: 'Open', run: () => navigate({ view: 'folder', folder: 'inbox', threadId: t.id }) }, duration: 6000 });
    };
    run();
    const id = setInterval(run, 2000);
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
