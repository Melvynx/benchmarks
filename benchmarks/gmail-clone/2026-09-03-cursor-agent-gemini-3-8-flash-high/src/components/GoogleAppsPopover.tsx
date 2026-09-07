import React, { useRef, useEffect } from 'react';
import { useMail } from '../context/MailContext';

export const GoogleAppsPopover: React.FC = () => {
  const { googleAppsOpen, setGoogleAppsOpen } = useMail();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setGoogleAppsOpen(false);
      }
    };
    if (googleAppsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [googleAppsOpen, setGoogleAppsOpen]);

  if (!googleAppsOpen) return null;

  const apps = [
    { name: 'Google', icon: '🔍', color: 'bg-blue-100 text-blue-600' },
    { name: 'Gmail', icon: '✉️', color: 'bg-red-100 text-red-600' },
    { name: 'Drive', icon: '📁', color: 'bg-yellow-100 text-yellow-600' },
    { name: 'Docs', icon: '📄', color: 'bg-blue-100 text-blue-600' },
    { name: 'Sheets', icon: '📊', color: 'bg-green-100 text-green-600' },
    { name: 'Slides', icon: '📑', color: 'bg-amber-100 text-amber-600' },
    { name: 'Calendar', icon: '📅', color: 'bg-blue-100 text-blue-600' },
    { name: 'Meet', icon: '📹', color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Keep', icon: '💡', color: 'bg-yellow-100 text-yellow-600' },
    { name: 'Contacts', icon: '👥', color: 'bg-indigo-100 text-indigo-600' },
    { name: 'YouTube', icon: '▶️', color: 'bg-red-100 text-red-600' },
    { name: 'Maps', icon: '🗺️', color: 'bg-green-100 text-green-600' },
  ];

  return (
    <div
      ref={popoverRef}
      className="absolute top-16 right-16 w-80 bg-white dark:bg-[#282a2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="grid grid-cols-3 gap-3">
        {apps.map((app) => (
          <button
            key={app.name}
            onClick={() => setGoogleAppsOpen(false)}
            className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors group"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-xl mb-1.5 ${app.color} shadow-sm group-hover:scale-105 transition-transform`}
            >
              {app.icon}
            </div>
            <span className="text-gray-700 dark:text-gray-200 font-medium">{app.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
