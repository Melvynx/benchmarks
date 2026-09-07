import React, { useState, useRef, useEffect } from 'react';
import { useMail } from '../context/MailContext';
import { Clock, Calendar, X } from 'lucide-react';

export const SnoozeModal: React.FC = () => {
  const { snoozeTargetThreadId, setSnoozeTargetThreadId, snoozeThread, bulkSnooze, selectedThreadIds } =
    useMail();

  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('08:00');
  const [isCustom, setIsCustom] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setSnoozeTargetThreadId(null);
        setIsCustom(false);
      }
    };
    if (snoozeTargetThreadId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [snoozeTargetThreadId, setSnoozeTargetThreadId]);

  if (!snoozeTargetThreadId) return null;

  const handleApplySnooze = (timestamp: number) => {
    if (selectedThreadIds.length > 0 && selectedThreadIds.includes(snoozeTargetThreadId)) {
      bulkSnooze(timestamp);
    } else {
      snoozeThread(snoozeTargetThreadId, timestamp);
    }
    setSnoozeTargetThreadId(null);
    setIsCustom(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate) return;
    const target = new Date(`${customDate}T${customTime || '08:00'}`);
    handleApplySnooze(target.getTime());
  };

  const now = new Date();

  // Helper date generators
  const laterToday = new Date();
  laterToday.setHours(18, 0, 0, 0);

  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const thisWeekend = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  thisWeekend.setDate(now.getDate() + daysUntilSaturday);
  thisWeekend.setHours(8, 0, 0, 0);

  const nextWeek = new Date();
  const daysUntilMonday = (8 - dayOfWeek + 7) % 7 || 7;
  nextWeek.setDate(now.getDate() + daysUntilMonday);
  nextWeek.setHours(8, 0, 0, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="w-full max-w-sm bg-white dark:bg-[#282a2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden text-xs text-gray-800 dark:text-gray-100 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="h-12 px-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between font-bold text-sm">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Snooze until...
          </span>
          <button
            onClick={() => {
              setSnoozeTargetThreadId(null);
              setIsCustom(false);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isCustom ? (
          <div className="py-2">
            <button
              onClick={() => handleApplySnooze(laterToday.getTime())}
              className="w-full px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-left transition-colors"
            >
              <div>
                <div className="font-semibold">Later today</div>
                <div className="text-[11px] text-gray-400">6:00 PM</div>
              </div>
              <span className="text-gray-400 text-[11px]">Today</span>
            </button>

            <button
              onClick={() => handleApplySnooze(tomorrow.getTime())}
              className="w-full px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-left transition-colors"
            >
              <div>
                <div className="font-semibold">Tomorrow morning</div>
                <div className="text-[11px] text-gray-400">8:00 AM</div>
              </div>
              <span className="text-gray-400 text-[11px]">
                {tomorrow.toLocaleDateString([], { weekday: 'short' })}
              </span>
            </button>

            <button
              onClick={() => handleApplySnooze(thisWeekend.getTime())}
              className="w-full px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-left transition-colors"
            >
              <div>
                <div className="font-semibold">This weekend</div>
                <div className="text-[11px] text-gray-400">Saturday, 8:00 AM</div>
              </div>
              <span className="text-gray-400 text-[11px]">Sat</span>
            </button>

            <button
              onClick={() => handleApplySnooze(nextWeek.getTime())}
              className="w-full px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-left transition-colors"
            >
              <div>
                <div className="font-semibold">Next week</div>
                <div className="text-[11px] text-gray-400">Monday, 8:00 AM</div>
              </div>
              <span className="text-gray-400 text-[11px]">Mon</span>
            </button>

            <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
              <button
                onClick={() => setIsCustom(true)}
                className="w-full px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-left font-semibold text-blue-600 dark:text-blue-400 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Pick date & time
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-gray-500 mb-1 font-medium">Select Date</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1 font-medium">Select Time</label>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsCustom(false)}
                className="px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#1a73e8] hover:bg-blue-600 text-white rounded-lg font-medium shadow transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
