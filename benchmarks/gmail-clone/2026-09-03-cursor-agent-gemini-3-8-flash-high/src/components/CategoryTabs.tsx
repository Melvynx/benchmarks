import React from 'react';
import { Inbox, Tag, Users, Bell } from 'lucide-react';
import { useMail } from '../context/MailContext';
import { CategoryId } from '../types/mail';

export const CategoryTabs: React.FC = () => {
  const { currentCategory, setCurrentCategory, folderCounts, currentFolder, selectedCustomLabel } =
    useMail();

  // Only render tabs in inbox without custom label selected
  if (currentFolder !== 'inbox' || selectedCustomLabel) {
    return null;
  }

  const tabs: {
    id: CategoryId;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    countKey: string;
    color: string;
    description: string;
  }[] = [
    {
      id: 'primary',
      name: 'Primary',
      icon: Inbox,
      countKey: 'primary',
      color: 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400',
      description: 'Person-to-person conversations and urgent messages',
    },
    {
      id: 'promotions',
      name: 'Promotions',
      icon: Tag,
      countKey: 'promotions',
      color: 'text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400',
      description: 'Marketing, offers, discounts, and commerce',
    },
    {
      id: 'social',
      name: 'Social',
      icon: Users,
      countKey: 'social',
      color: 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400',
      description: 'Social networks, developer forums, communities',
    },
    {
      id: 'updates',
      name: 'Updates',
      icon: Bell,
      countKey: 'updates',
      color: 'text-amber-600 dark:text-amber-400 border-amber-600 dark:border-amber-400',
      description: 'Bills, receipts, invoices, automated alerts',
    },
  ];

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] shrink-0 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentCategory === tab.id;
        const count = folderCounts[tab.countKey] || 0;

        return (
          <button
            key={tab.id}
            onClick={() => setCurrentCategory(tab.id)}
            className={`flex items-center gap-3 px-6 py-3 border-b-2 text-sm font-medium transition-all min-w-[140px] hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
              isActive
                ? `${tab.color} font-bold`
                : 'border-transparent text-gray-600 dark:text-gray-400'
            }`}
            title={tab.description}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? '' : 'text-gray-500'}`} />
            <span className="truncate">{tab.name}</span>
            {count > 0 && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {count} new
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
