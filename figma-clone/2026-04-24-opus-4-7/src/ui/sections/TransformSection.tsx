import { useStore } from '../../state/store';
import { updateNodes } from '../../state/actions';
import { NumberField } from '../NumberField';
import type { SceneNode } from '../../core/scene';

const collapse = <T,>(values: T[]): T | 'mixed' => {
  if (values.length === 0) return 'mixed';
  const first = values[0]!;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== first) return 'mixed';
  }
  return first;
};

export const TransformSection = (): JSX.Element | null => {
  const selection = useStore((s) => s.selection);
  const doc = useStore((s) => s.doc);
  const nodes = selection
    .map((id) => doc.nodes[id])
    .filter((n): n is SceneNode => !!n);
  if (nodes.length === 0) return null;

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const ws = nodes.map((n) => n.width);
  const hs = nodes.map((n) => n.height);
  const rs = nodes.map((n) => (n.rotation * 180) / Math.PI);
  const o = nodes.map((n) => Math.round(n.opacity * 100));

  const update = (key: 'x' | 'y' | 'width' | 'height', value: number) => {
    updateNodes(
      selection,
      (n) => {
        if (key === 'width' || key === 'height') {
          n[key] = Math.max(1, value);
        } else {
          n[key] = value;
        }
      },
      `Set ${key}`,
    );
  };

  return (
    <div className="panel-section">
      <div className="panel-section-title">Transform</div>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField
          prefix="X"
          value={collapse(xs)}
          onChange={(v) => update('x', v)}
          precision={0}
        />
        <NumberField
          prefix="Y"
          value={collapse(ys)}
          onChange={(v) => update('y', v)}
          precision={0}
        />
        <NumberField
          prefix="W"
          value={collapse(ws)}
          onChange={(v) => update('width', v)}
          min={1}
          precision={0}
        />
        <NumberField
          prefix="H"
          value={collapse(hs)}
          onChange={(v) => update('height', v)}
          min={1}
          precision={0}
        />
        <NumberField
          prefix="∠"
          suffix="°"
          value={collapse(rs)}
          onChange={(v) => {
            updateNodes(
              selection,
              (n) => {
                n.rotation = (v * Math.PI) / 180;
              },
              'Rotation',
            );
          }}
          precision={1}
        />
        <NumberField
          prefix="○"
          suffix="%"
          value={collapse(o)}
          onChange={(v) => {
            updateNodes(
              selection,
              (n) => {
                n.opacity = Math.max(0, Math.min(1, v / 100));
              },
              'Opacity',
            );
          }}
          min={0}
          max={100}
          precision={0}
        />
      </div>
    </div>
  );
};
