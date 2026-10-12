import { useEffect, useRef } from 'react';

export function useDismiss(container, onDismiss) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    function onPointerDown(event) {
      if (container.current && !container.current.contains(event.target)) dismiss.current();
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        const trigger = container.current?.querySelector('[aria-expanded="true"]');
        if (trigger) {
          dismiss.current();
          trigger.focus();
        }
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [container]);
}
