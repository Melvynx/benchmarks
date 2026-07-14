import { useStore } from '../../state/store';
import { updateNodes } from '../../state/actions';
import { NumberField } from '../NumberField';
import { isPolygon } from '../../core/scene';

export const PolygonSection = (): JSX.Element | null => {
  const selection = useStore((s) => s.selection);
  const first = useStore((s) => s.doc.nodes[selection[0] ?? '']);
  if (!first || !isPolygon(first)) return null;

  return (
    <div className="panel-section">
      <div className="panel-section-title">Polygon</div>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField
          prefix="Points"
          value={first.pointCount}
          min={3}
          max={32}
          precision={0}
          onChange={(v) => {
            updateNodes(
              selection,
              (n) => {
                if (n.type === 'polygon') {
                  n.pointCount = Math.max(3, Math.min(32, Math.round(v)));
                }
              },
              'Points',
            );
          }}
        />
        <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={first.starRatio !== null}
            onChange={(e) => {
              updateNodes(
                selection,
                (n) => {
                  if (n.type === 'polygon') {
                    n.starRatio = e.target.checked ? 0.5 : null;
                  }
                },
                'Star',
              );
            }}
          />
          Star
        </label>
      </div>
      {first.starRatio !== null && (
        <div className="mt-1.5">
          <NumberField
            prefix="Ratio"
            value={first.starRatio}
            min={0}
            max={1}
            step={0.05}
            precision={2}
            onChange={(v) => {
              updateNodes(
                selection,
                (n) => {
                  if (n.type === 'polygon') {
                    n.starRatio = Math.max(0, Math.min(1, v));
                  }
                },
                'Star ratio',
              );
            }}
          />
        </div>
      )}
    </div>
  );
};
