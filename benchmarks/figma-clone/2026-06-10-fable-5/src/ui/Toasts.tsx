import type { JSX } from 'react';
import { useEditor } from '../store/store';

export function Toasts(): JSX.Element | null {
  const toasts = useEditor((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.kind}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
