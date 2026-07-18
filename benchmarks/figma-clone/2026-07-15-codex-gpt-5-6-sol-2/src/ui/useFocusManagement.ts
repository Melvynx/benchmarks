import { useEffect } from 'react';

import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.hasAttribute('hidden') && element.getClientRects().length > 0,
  );
}

interface FocusTrapOptions {
  readonly enabled: boolean;
  readonly containerRef: RefObject<HTMLElement | null>;
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
}

/** Keeps keyboard focus within a transient dialog and returns it to its trigger. */
export function useFocusTrap({ enabled, containerRef, initialFocusRef }: FocusTrapOptions) {
  useEffect(() => {
    if (!enabled) return;

    const returnFocusTo =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusInitialElement = () => {
      const container = containerRef.current;
      if (!container) return;
      const target = initialFocusRef?.current ?? getFocusableElements(container)[0] ?? container;
      target.focus({ preventScroll: true });
    };
    const frame = window.requestAnimationFrame(focusInitialElement);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (currentIndex < 0 || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      if (returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true });
    };
  }, [containerRef, enabled, initialFocusRef]);
}

export function moveMenuFocus(menu: HTMLElement, key: string) {
  const items = [
    ...menu.querySelectorAll<HTMLButtonElement>('button[role^="menuitem"]:not(:disabled)'),
  ];
  if (items.length === 0) return false;

  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
  let targetIndex: number;
  if (key === 'Home') targetIndex = 0;
  else if (key === 'End') targetIndex = items.length - 1;
  else if (key === 'ArrowDown')
    targetIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
  else if (key === 'ArrowUp')
    targetIndex =
      currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
  else return false;

  items[targetIndex]?.focus({ preventScroll: true });
  return true;
}
