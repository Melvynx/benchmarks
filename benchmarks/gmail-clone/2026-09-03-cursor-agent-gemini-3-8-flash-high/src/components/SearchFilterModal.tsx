import React, { useState, useRef, useEffect } from 'react';
import { useMail } from '../context/MailContext';
import { Search, X } from 'lucide-react';

export const SearchFilterModal: React.FC = () => {
  const { isSearchModalOpen, setIsSearchModalOpen, setSearchQuery, showToast } = useMail();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [hasWords, setHasWords] = useState('');
  const [doesntHave, setDoesntHave] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [folder, setFolder] = useState('all');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsSearchModalOpen(false);
      }
    };
    if (isSearchModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchModalOpen, setIsSearchModalOpen]);

  if (!isSearchModalOpen) return null;

  const handleApplySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parts: string[] = [];

    if (from.trim()) parts.push(`from:${from.trim()}`);
    if (to.trim()) parts.push(`to:${to.trim()}`);
    if (subject.trim()) parts.push(`subject:${subject.trim()}`);
    if (hasWords.trim()) parts.push(hasWords.trim());
    if (doesntHave.trim()) parts.push(`-${doesntHave.trim()}`);
    if (hasAttachment) parts.push('has:attachment');
    if (folder !== 'all') parts.push(`in:${folder}`);

    const builtQuery = parts.join(' ');
    setSearchQuery(builtQuery);
    setIsSearchModalOpen(false);
  };

  const handleReset = () => {
    setFrom('');
    setTo('');
    setSubject('');
    setHasWords('');
    setDoesntHave('');
    setHasAttachment(false);
    setFolder('all');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex justify-center items-start pt-20 px-4">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-[#282a2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="h-12 px-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between font-bold text-sm text-gray-800 dark:text-gray-100">
          <span>Search options</span>
          <button
            onClick={() => setIsSearchModalOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleApplySearch} className="p-6 space-y-4">
          {/* From */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-gray-500 font-medium">From</label>
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="e.g. sarah.lin@techcorp.io"
              className="col-span-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* To */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-gray-500 font-medium">To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="e.g. melvyn@example.com"
              className="col-span-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Subject */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-gray-500 font-medium">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Strategy Offsite"
              className="col-span-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Has the words */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-gray-500 font-medium">Has the words</label>
            <input
              type="text"
              value={hasWords}
              onChange={(e) => setHasWords(e.target.value)}
              placeholder="keywords, phrases"
              className="col-span-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Doesn't have */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-gray-500 font-medium">Doesn't have</label>
            <input
              type="text"
              value={doesntHave}
              onChange={(e) => setDoesntHave(e.target.value)}
              placeholder="excluded words"
              className="col-span-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Search Scope / Folder */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-gray-500 font-medium">Search in</label>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="col-span-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Mail</option>
              <option value="inbox">Inbox</option>
              <option value="starred">Starred</option>
              <option value="sent">Sent</option>
              <option value="drafts">Drafts</option>
              <option value="trash">Trash</option>
              <option value="spam">Spam</option>
            </select>
          </div>

          {/* Has attachment checkbox */}
          <div className="grid grid-cols-4 items-center gap-4 pt-1">
            <div />
            <label className="col-span-3 flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={hasAttachment}
                onChange={(e) => setHasAttachment(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Has attachment</span>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
            >
              Reset filters
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  showToast('Filter created successfully');
                  setIsSearchModalOpen(false);
                }}
                className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg font-medium transition-colors"
              >
                Create filter
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#1a73e8] hover:bg-blue-600 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                Search
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
