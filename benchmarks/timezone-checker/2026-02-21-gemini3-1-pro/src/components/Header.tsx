import { Moon } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../utils/classnames';

export function Header() {
  const { mode, setMode } = useStore();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 font-bold text-lg tracking-tight">
          <Moon className="w-5 h-5 text-primary-500" />
          <span>Gemini 3.1 Pro</span>
        </div>
        
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
          <button
            onClick={() => setMode('meeting')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              mode === 'meeting' 
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            Meeting Mode
          </button>
          <button
            onClick={() => setMode('base')}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              mode === 'base' 
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            Base Mode
          </button>
        </div>
      </div>
    </header>
  );
}
