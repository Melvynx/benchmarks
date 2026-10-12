import { useEffect, useRef, useState } from 'react';
import { bus } from '../game/bus';
import { bootInfo } from '../game/store';
import { stageName } from '../game/logic';
import { IconStar } from './icons';

interface Toast {
  id: number;
  kind: 'level' | 'info' | 'good';
  title?: string;
  text: string;
}

export function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const push = (t: Omit<Toast, 'id'>, ms = 4600) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { ...t, id }]);
      window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), ms);
    };
    const offs = [
      bus.on('levelup', ({ level, unlocked }) =>
        push(
          {
            kind: 'level',
            title: `Level ${level}!`,
            text: unlocked ? `${stageName(level)} · Unlocked: ${unlocked}` : stageName(level),
          },
          5600,
        ),
      ),
      bus.on('toast', ({ text, tone }) => push({ kind: tone === 'good' ? 'good' : 'info', text })),
    ];
    if (bootInfo.awayMinutes > 5) {
      const m = Math.round(bootInfo.awayMinutes);
      const away = m >= 90 ? `${Math.round(m / 60)} hours` : `${m} minutes`;
      push({ kind: 'info', title: 'Welcome back!', text: `Cowdie missed you. You were away for ${away}.` }, 6500);
    }
    return () => offs.forEach((off) => off());
  }, []);

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.kind === 'level' && (
            <span className="toast-icon">
              <IconStar size={26} />
            </span>
          )}
          <div>
            {t.title && <strong>{t.title}</strong>}
            <span>{t.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveRegion() {
  const [text, setText] = useState('');
  useEffect(() => {
    const onSay = (e: Event) => setText(String((e as CustomEvent).detail ?? ''));
    window.addEventListener('cowdie:say', onSay);
    return () => window.removeEventListener('cowdie:say', onSay);
  }, []);
  return (
    <div className="sr-only" role="status" aria-live="polite" data-testid="cowdie-says">
      {text ? `Cowdie says: ${text}` : ''}
    </div>
  );
}
