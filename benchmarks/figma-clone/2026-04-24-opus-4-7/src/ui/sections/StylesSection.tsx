import { Plus, Minus } from 'lucide-react';
import { useStore } from '../../state/store';
import { addColorStyle, applyColorStyleToSelection, removeColorStyle } from '../../state/actions';
import { useState } from 'react';

export const StylesSection = (): JSX.Element => {
  const styles = useStore((s) => s.doc.colorStyles);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const entries = Object.values(styles);

  return (
    <div className="panel-section">
      <div className="flex items-center justify-between mb-2">
        <div className="panel-section-title mb-0">Color styles</div>
        <button
          className="w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus size={12} />
        </button>
      </div>
      {adding && (
        <div className="flex items-center gap-1.5 mb-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-input flex-1"
            placeholder="Style name"
          />
          <button
            className="text-xs bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded"
            onClick={() => {
              if (name.trim()) {
                addColorStyle(name.trim(), '#0d99ff');
                setName('');
                setAdding(false);
              }
            }}
          >
            Add
          </button>
        </div>
      )}
      {entries.length === 0 && <div className="text-xxs text-text-tertiary italic">No color styles</div>}
      <div className="space-y-1">
        {entries.map((style) => (
          <div key={style.id} className="flex items-center gap-1.5 group">
            <button
              onClick={() => applyColorStyleToSelection(style.id)}
              className="w-5 h-5 rounded border border-panel-divider"
              style={{ background: style.color }}
              title={`Apply ${style.name}`}
            />
            <div className="text-xs text-text-primary flex-1">{style.name}</div>
            <button
              className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-opacity"
              onClick={() => removeColorStyle(style.id)}
            >
              <Minus size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
