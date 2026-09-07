import React, { useState, useRef, useEffect } from 'react';
import { useMail } from '../context/MailContext';
import { Tag, X, Check } from 'lucide-react';

export const LabelManagerModal: React.FC = () => {
  const { isCreateLabelModalOpen, setIsCreateLabelModalOpen, createCustomLabel } = useMail();

  const [labelName, setLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#1a73e8');

  const modalRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#1a73e8', // blue
    '#188038', // green
    '#d93025', // red
    '#e37400', // orange
    '#f9ab00', // yellow
    '#9334e6', // purple
    '#12b5cb', // teal
    '#e91e63', // pink
    '#607d8b', // blue-grey
    '#795548', // brown
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsCreateLabelModalOpen(false);
      }
    };
    if (isCreateLabelModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCreateLabelModalOpen, setIsCreateLabelModalOpen]);

  if (!isCreateLabelModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelName.trim()) return;
    createCustomLabel(labelName.trim(), selectedColor);
    setLabelName('');
    setIsCreateLabelModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="w-full max-w-sm bg-white dark:bg-[#282a2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden text-xs text-gray-800 dark:text-gray-100 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="h-12 px-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between font-bold text-sm">
          <span className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            New label
          </span>
          <button
            onClick={() => setIsCreateLabelModalOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-gray-500 mb-1.5 font-medium">Please enter a new label name:</label>
            <input
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              placeholder="e.g. Invoices, Family, Clients"
              required
              autoFocus
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-gray-500 mb-2 font-medium">Choose a color:</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsCreateLabelModalOpen(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1a73e8] hover:bg-blue-600 text-white rounded-lg font-medium shadow transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
