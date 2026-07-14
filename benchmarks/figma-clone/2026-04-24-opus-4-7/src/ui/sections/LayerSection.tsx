import { useStore } from '../../state/store';
import { updateNodes } from '../../state/actions';
import { NumberField } from '../NumberField';
import { isStyledShape } from '../../core/scene';

export const LayerSection = (): JSX.Element | null => {
  const selection = useStore((s) => s.selection);
  const doc = useStore((s) => s.doc);
  const first = selection.length > 0 ? doc.nodes[selection[0]!] : undefined;
  if (!first) return null;
  if (!isStyledShape(first)) return null;

  const radiusValue: number | 'mixed' =
    typeof first.cornerRadius === 'number' ? first.cornerRadius : 'mixed';

  return (
    <div className="panel-section">
      <div className="panel-section-title">Layer</div>
      {first.type !== 'ellipse' && first.type !== 'polygon' && (
        <div className="flex items-center gap-1.5">
          <NumberField
            value={radiusValue}
            prefix={<CornerRadiusIcon />}
            min={0}
            onChange={(v) => {
              updateNodes(
                selection,
                (n) => {
                  if (n.type === 'rectangle' || n.type === 'frame' || n.type === 'image') {
                    n.cornerRadius = Math.max(0, v);
                  }
                },
                'Corner radius',
              );
            }}
          />
        </div>
      )}
    </div>
  );
};

const CornerRadiusIcon = (): JSX.Element => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 10 V3 Q0 0 3 0 H10" stroke="currentColor" strokeWidth="1" />
  </svg>
);
