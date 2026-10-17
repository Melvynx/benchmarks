import React from 'react';
import { X, Sun, Moon, Columns2, Rows2, Maximize2, LayoutList } from 'lucide-react';
import { DensityMode, SplitPaneMode, ThemeMode } from '../types/mail';

interface QuickSettingsDrawerProps {
  theme: ThemeMode;
  density: DensityMode;
  splitPane: SplitPaneMode;
  showCategoryTabs: boolean;
  onChangeTheme: (theme: ThemeMode) => void;
  onChangeDensity: (density: DensityMode) => void;
  onChangeSplitPane: (mode: SplitPaneMode) => void;
  onToggleCategoryTabs: (show: boolean) => void;
  onClose: () => void;
}

export const QuickSettingsDrawer: React.FC<QuickSettingsDrawerProps> = ({
  theme,
  density,
  splitPane,
  showCategoryTabs,
  onChangeTheme,
  onChangeDensity,
  onChangeSplitPane,
  onToggleCategoryTabs,
  onClose,
}) => {
  const isDark = theme === 'dark';

  return (
    <aside
      className={`w-72 shrink-0 rounded-2xl ml-2 p-4 overflow-y-auto border select-none transition-all ${
        isDark
          ? 'bg-[#1e1f23] border-white/10 text-[#e3e3e3]'
          : 'bg-white border-gray-200/80 text-[#1f1f1f]'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-gray-200/70 dark:border-white/10">
        <h3 className="font-display text-base font-medium">Quick settings</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Density Section */}
      <div className="py-4 border-b border-gray-200/70 dark:border-white/10">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2.5">
          Density
        </div>
        <div className="space-y-1.5">
          {(
            [
              ['default', 'Default', 'Shows attachment chips in inbox rows'],
              ['comfortable', 'Comfortable', 'Clean spacing without chips'],
              ['compact', 'Compact', 'Maximum rows per viewport'],
            ] as const
          ).map(([val, label, desc]) => (
            <label
              key={val}
              onClick={() => onChangeDensity(val)}
              className={`flex items-start gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                density === val
                  ? isDark
                    ? 'bg-[#004a77]/50 text-[#c2e7ff]'
                    : 'bg-[#e8f0fe] text-[#041e49]'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="density"
                checked={density === val}
                onChange={() => onChangeDensity(val)}
                className="mt-1 accent-[#1a73e8]"
              />
              <div>
                <div className="text-xs font-medium">{label}</div>
                <div className="text-[11px] opacity-65">{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Theme Section */}
      <div className="py-4 border-b border-gray-200/70 dark:border-white/10">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2.5">
          Theme
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeTheme('light')}
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium cursor-pointer ${
              theme === 'light'
                ? 'border-[#1a73e8] bg-[#e8f0fe] text-[#041e49]'
                : 'border-white/15 hover:bg-white/5'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTheme('dark')}
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium cursor-pointer ${
              theme === 'dark'
                ? 'border-[#a8c7fa] bg-[#004a77] text-[#c2e7ff]'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Reading Pane Section */}
      <div className="py-4 border-b border-gray-200/70 dark:border-white/10">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2.5">
          Reading pane
        </div>
        <div className="space-y-1.5">
          {(
            [
              ['none', 'No split', Maximize2],
              ['right', 'Right of inbox', Columns2],
              ['bottom', 'Below inbox', Rows2],
            ] as const
          ).map(([val, label, Icon]) => (
            <label
              key={val}
              onClick={() => onChangeSplitPane(val)}
              className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                splitPane === val
                  ? isDark
                    ? 'bg-[#004a77]/50 text-[#c2e7ff]'
                    : 'bg-[#e8f0fe] text-[#041e49]'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="splitPane"
                  checked={splitPane === val}
                  onChange={() => onChangeSplitPane(val)}
                  className="accent-[#1a73e8]"
                />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <Icon className="w-4 h-4 opacity-70" />
            </label>
          ))}
        </div>
      </div>

      {/* Inbox Category Tabs Toggle */}
      <div className="py-4">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2.5">
          Inbox categories
        </div>
        <label className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
          <div className="flex items-center gap-2.5">
            <LayoutList className="w-4 h-4 opacity-75" />
            <div>
              <div className="text-xs font-medium">Category tabs</div>
              <div className="text-[11px] opacity-65">
                Primary, Promotions, Social, Updates
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={showCategoryTabs}
            onChange={(e) => onToggleCategoryTabs(e.target.checked)}
            className="rounded accent-[#1a73e8]"
          />
        </label>
      </div>
    </aside>
  );
};
