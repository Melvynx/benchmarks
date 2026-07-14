import {
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from 'lucide-react';
import { alignSelection, distributeSelection } from '../../state/actions';
import { useStore } from '../../state/store';

export const AlignSection = (): JSX.Element | null => {
  const selectionCount = useStore((s) => s.selection.length);
  if (selectionCount < 2) return null;

  return (
    <div className="panel-section">
      <div className="panel-section-title">Align</div>
      <div className="grid grid-cols-6 gap-1">
        <Btn icon={<AlignStartVertical size={12} />} onClick={() => alignSelection('left')} title="Align left" />
        <Btn
          icon={<AlignCenterVertical size={12} />}
          onClick={() => alignSelection('center-h')}
          title="Align center horizontal"
        />
        <Btn icon={<AlignEndVertical size={12} />} onClick={() => alignSelection('right')} title="Align right" />
        <Btn icon={<AlignStartHorizontal size={12} />} onClick={() => alignSelection('top')} title="Align top" />
        <Btn
          icon={<AlignCenterHorizontal size={12} />}
          onClick={() => alignSelection('middle-v')}
          title="Align center vertical"
        />
        <Btn
          icon={<AlignEndHorizontal size={12} />}
          onClick={() => alignSelection('bottom')}
          title="Align bottom"
        />
      </div>
      {selectionCount >= 3 && (
        <div className="grid grid-cols-2 gap-1 mt-1">
          <Btn
            icon={<AlignHorizontalDistributeCenter size={12} />}
            onClick={() => distributeSelection('horizontal')}
            title="Distribute horizontal"
            label="H"
          />
          <Btn
            icon={<AlignVerticalDistributeCenter size={12} />}
            onClick={() => distributeSelection('vertical')}
            title="Distribute vertical"
            label="V"
          />
        </div>
      )}
    </div>
  );
};

const Btn = ({
  icon,
  onClick,
  title,
  label,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  label?: string;
}): JSX.Element => (
  <button
    className="h-7 rounded text-text-secondary bg-panel-bgRaised hover:bg-[#3a3a3a] flex items-center justify-center gap-1"
    onClick={onClick}
    title={title}
  >
    {icon}
    {label && <span className="text-xxs">{label}</span>}
  </button>
);
