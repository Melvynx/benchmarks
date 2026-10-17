import React from 'react';
import {
  X,
  Sun,
  Moon,
  Columns,
  Rows,
  Maximize2,
  RotateCcw,
  Check,
  LayoutGrid,
} from 'lucide-react';
import { DensityMode, MailSettings, ReadingPaneMode } from '../types/mail';

interface QuickSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MailSettings;
  onUpdateSettings: (next: MailSettings) => void;
  onResetDemoData: () => void;
}

export const QuickSettingsDrawer: React.FC<QuickSettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDemoData,
}) => {
  if (!isOpen) return null;
  const isDark = settings.theme === 'dark';

  return (
    <aside
      aria-label="Quick settings"
      className={`w-[300px] shrink-0 border-l h-full overflow-y-auto p-4 select-none transition-all ${
        isDark
          ? 'bg-[#1E1F20] border-[#282A2C] text-[#E3E3E3]'
          : 'bg-white border-[#E8EAED] text-[#1F1F1F]'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-current/10">
        <h2 className="text-base font-medium">Quick settings</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick settings"
          className="p-1.5 rounded-full hover:bg-current/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Theme */}
      <div className="py-4 border-b border-current/10">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-65 mb-2.5">
          Appearance Theme
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              settings.theme === 'light'
                ? 'bg-[#D3E3FD] border-[#0B57D0] text-[#041E49]'
                : isDark
                ? 'border-[#444746] hover:bg-[#282A2C]'
                : 'border-[#E0E2E0] hover:bg-[#F8FAFD]'
            }`}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              settings.theme === 'dark'
                ? 'bg-[#004A77] border-[#A8C7FA] text-[#C2E7FF]'
                : isDark
                ? 'border-[#444746] hover:bg-[#282A2C]'
                : 'border-[#E0E2E0] hover:bg-[#F8FAFD]'
            }`}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
        </div>
      </div>

      {/* Density */}
      <div className="py-4 border-b border-current/10">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-65 mb-2.5">
          Density
        </div>
        <div className="space-y-1.5">
          {(
            [
              {
                id: 'default',
                label: 'Default',
                desc: 'Shows inline attachment chips in inbox rows',
              },
              {
                id: 'comfortable',
                label: 'Comfortable',
                desc: 'Clean 40px rows with paperclip indicator',
              },
              {
                id: 'compact',
                label: 'Compact',
                desc: 'High-density 32px rows for maximum scan speed',
              },
            ] as { id: DensityMode; label: string; desc: string }[]
          ).map((d) => {
            const active = settings.density === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, density: d.id })}
                className={`w-full p-2.5 rounded-xl border text-left transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                  active
                    ? isDark
                      ? 'bg-[#004A77]/50 border-[#A8C7FA]'
                      : 'bg-[#EAF1FB] border-[#0B57D0]'
                    : isDark
                    ? 'border-[#3C4043] hover:bg-[#282A2C]'
                    : 'border-[#E0E2E0] hover:bg-[#F8FAFD]'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">{d.label}</div>
                  <div className="text-[11px] opacity-65 mt-0.5">{d.desc}</div>
                </div>
                {active && <Check className="w-4 h-4 text-[#0B57D0] dark:text-[#A8C7FA] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reading Pane / Split Mode */}
      <div className="py-4 border-b border-current/10">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-65 mb-2.5">
          Reading pane
        </div>
        <div className="space-y-1.5">
          {(
            [
              { id: 'none', label: 'No split', icon: Maximize2 },
              { id: 'right', label: 'Right of inbox', icon: Columns },
              { id: 'bottom', label: 'Below inbox', icon: Rows },
            ] as { id: ReadingPaneMode; label: string; icon: React.FC<{ className?: string }> }[]
          ).map((pane) => {
            const Icon = pane.icon;
            const active = settings.readingPane === pane.id;
            return (
              <button
                key={pane.id}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, readingPane: pane.id })}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  active
                    ? isDark
                      ? 'bg-[#004A77]/50 border-[#A8C7FA]'
                      : 'bg-[#EAF1FB] border-[#0B57D0]'
                    : isDark
                    ? 'border-[#3C4043] hover:bg-[#282A2C]'
                    : 'border-[#E0E2E0] hover:bg-[#F8FAFD]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 opacity-75" />
                  {pane.label}
                </span>
                {active && <Check className="w-4 h-4 text-[#0B57D0] dark:text-[#A8C7FA]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inbox Category Tabs Toggle */}
      <div className="py-4 border-b border-current/10">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-65 mb-2.5">
          Inbox Type
        </div>
        <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
          <span className="flex items-center gap-2 font-medium">
            <LayoutGrid className="w-4 h-4 opacity-75" />
            Show Category Tabs (Primary, Promotions, Social, Updates)
          </span>
          <input
            type="checkbox"
            checked={settings.showCategoryTabs}
            onChange={(e) =>
              onUpdateSettings({ ...settings, showCategoryTabs: e.target.checked })
            }
            className="rounded accent-[#0B57D0]"
          />
        </label>
      </div>

      {/* Reset Demo Mailbox */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onResetDemoData}
          className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            isDark
              ? 'border-[#444746] hover:bg-[#282A2C]'
              : 'border-[#DADCE0] hover:bg-[#F2F6FC]'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restore Default Seeded Mailbox
        </button>
      </div>
    </aside>
  );
};
