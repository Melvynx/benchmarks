import { MousePointer2 } from 'lucide-react';

export const EmptyInspector = (): JSX.Element => (
  <div className="p-6 text-xs text-text-tertiary flex flex-col items-center text-center gap-3 border-t border-panel-divider">
    <MousePointer2 size={16} className="opacity-50" />
    <div>Select a layer to inspect it.</div>
    <div className="text-[10px] opacity-70 leading-relaxed">
      Shortcuts: V move · R rect · O ellipse · T text · F frame · L line
    </div>
  </div>
);
