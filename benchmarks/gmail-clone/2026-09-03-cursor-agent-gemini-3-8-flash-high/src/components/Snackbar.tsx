import React, { useEffect, useState } from 'react';
import { useMail } from '../context/MailContext';
import { X } from 'lucide-react';

export const Snackbar: React.FC = () => {
  const { undoAction, triggerUndo, dismissUndo } = useMail();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!undoAction) return;

    setProgress(100);
    const duration = 7000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          dismissUndo();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [undoAction, dismissUndo]);

  if (!undoAction) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col bg-[#202124] text-white rounded-lg shadow-2xl border border-gray-700/80 overflow-hidden text-xs animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-4 px-4 py-3">
        <span className="font-medium tracking-wide">{undoAction.message}</span>

        <button
          onClick={triggerUndo}
          className="text-yellow-400 hover:text-yellow-300 font-bold uppercase tracking-wider text-[11px] px-1 py-0.5 rounded transition-colors"
        >
          Undo
        </button>

        <button
          onClick={dismissUndo}
          className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subtle progress countdown bar */}
      <div className="w-full bg-gray-700 h-0.5">
        <div
          className="bg-yellow-400 h-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
