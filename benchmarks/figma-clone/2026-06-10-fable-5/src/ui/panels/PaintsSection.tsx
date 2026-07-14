import { useRef, useState, type JSX } from 'react';
import { paintToCss } from '../../render/paints';
import type { DraftDoc } from '../../scene/draft';
import { patchBase } from '../../scene/draft';
import { solidPaint } from '../../scene/factories';
import type { Paint, SceneNode, StrokeAlign } from '../../scene/types';
import { editDoc, updateGesture } from '../../store/docEdit';
import { rgba, rgbaToHex } from '../../utils/color';
import { ColorPicker } from '../controls/ColorPicker';
import { NumberInput } from '../controls/NumberInput';
import { Popover } from '../controls/Popover';
import { IEye, IEyeOff, IMinus, IPlus } from '../icons';
import { applyToSelection, numericField, sharedValue } from './panelUtils';

type PaintKey = 'fills' | 'strokes';

const TITLES: Record<PaintKey, string> = { fills: 'Fill', strokes: 'Stroke' };

function paintLabel(paint: Paint): string {
  switch (paint.type) {
    case 'solid':
      return rgbaToHex(paint.color);
    case 'gradient-linear':
      return 'Linear';
    case 'gradient-radial':
      return 'Radial';
    case 'image':
      return 'Image';
  }
}

function setPaints(d: DraftDoc, node: SceneNode, key: PaintKey, paints: Paint[]): void {
  patchBase(d, node.id, { [key]: paints });
}

export function PaintsSection({ nodes, paintKey }: { nodes: SceneNode[]; paintKey: PaintKey }): JSX.Element {
  const reference = nodes[0];
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const anchorRef = useRef<DOMRect | null>(null);

  if (!reference) return <></>;
  const allSame = sharedValue(nodes, (n) => n[paintKey]) !== null;
  const paints = reference[paintKey];

  const mutate = (label: string, next: (current: Paint[]) => Paint[], commit = true): void => {
    const fn = (d: DraftDoc): void => applyToSelection(d, (dd, node) => setPaints(dd, node, paintKey, next(node[paintKey])));
    if (commit) editDoc(label, fn, { mergeKey: `${paintKey}:edit` });
    else updateGesture(fn);
  };

  const addPaint = (): void => {
    const paint = solidPaint(paintKey === 'fills' ? rgba(217, 217, 217) : rgba(255, 255, 255), 1);
    // When lists are mixed, adding replaces everything with one shared paint.
    mutate(`Add ${TITLES[paintKey].toLowerCase()}`, (current) => (allSame ? [...current, paint] : [paint]));
    setPickerIndex(allSame ? paints.length : 0);
  };

  return (
    <section className="prop-section">
      <header className="prop-section__header">
        <span>{TITLES[paintKey]}</span>
        <button className="icon-btn" onClick={addPaint} title={`Add ${TITLES[paintKey].toLowerCase()}`}>
          <IPlus size={12} />
        </button>
      </header>

      {!allSame && <div className="prop-mixed-note">Click + to replace mixed {TITLES[paintKey].toLowerCase()}s</div>}

      {allSame &&
        paints.map((paint, index) => (
          <div className={`paint-row${paint.enabled ? '' : ' is-disabled'}`} key={index}>
            <button
              className="paint-swatch"
              style={{ background: paintToCss(paint) }}
              onClick={(e) => {
                anchorRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setPickerIndex(index);
              }}
              title="Edit paint"
            />
            <span className="paint-label">{paintLabel(paint)}</span>
            <NumberInput
              value={Math.round(paint.opacity * 100)}
              min={0}
              max={100}
              suffix="%"
              {...numericField('Paint opacity', `${paintKey}:opacity:${index}`, (d, v) =>
                applyToSelection(d, (dd, node) =>
                  setPaints(dd, node, paintKey, node[paintKey].map((p, i) => (i === index ? { ...p, opacity: v / 100 } : p))),
                ),
              )}
            />
            <button
              className="icon-btn"
              title={paint.enabled ? 'Disable' : 'Enable'}
              onClick={() => mutate('Toggle paint', (c) => c.map((p, i) => (i === index ? { ...p, enabled: !paint.enabled } : p)))}
            >
              {paint.enabled ? <IEye size={12} /> : <IEyeOff size={12} />}
            </button>
            <button
              className="icon-btn"
              title="Remove"
              onClick={() => {
                setPickerIndex(null);
                mutate('Remove paint', (c) => c.filter((_, i) => i !== index));
              }}
            >
              <IMinus size={12} />
            </button>
          </div>
        ))}

      {pickerIndex !== null && allSame && paints[pickerIndex] && (
        <Popover anchor={anchorRef.current ?? new DOMRect(window.innerWidth - 280, 200, 0, 0)} onClose={() => setPickerIndex(null)}>
          <ColorPicker
            paint={paints[pickerIndex]}
            allowGradients={paints[pickerIndex].type !== 'image'}
            onChange={(next, commit) =>
              mutate('Edit paint', (c) => c.map((p, i) => (i === pickerIndex ? next : p)), commit)
            }
          />
        </Popover>
      )}

      {paintKey === 'strokes' && allSame && paints.length > 0 && <StrokeOptions nodes={nodes} />}
    </section>
  );
}

function StrokeOptions({ nodes }: { nodes: SceneNode[] }): JSX.Element {
  const weight = sharedValue(nodes, (n) => n.strokeWeight);
  const align = sharedValue(nodes, (n) => n.strokeAlign);
  const dash = sharedValue(nodes, (n) => n.strokeDash);
  const gap = sharedValue(nodes, (n) => n.strokeGap);
  const isLine = nodes.every((n) => n.type === 'line');

  return (
    <>
      <div className="prop-row">
        <NumberInput
          label="W"
          title="Stroke weight"
          value={weight}
          min={0}
          max={400}
          flex
          {...numericField('Stroke weight', 'strokeWeight', (d, v) =>
            applyToSelection(d, (dd, node) => patchBase(dd, node.id, { strokeWeight: v })),
          )}
        />
        <select
          className="select"
          value={align ?? 'mixed'}
          disabled={isLine}
          onChange={(e) =>
            editDoc('Stroke align', (d) =>
              applyToSelection(d, (dd, node) => patchBase(dd, node.id, { strokeAlign: e.target.value as StrokeAlign })),
            )
          }
        >
          {align === null && <option value="mixed">Mixed</option>}
          <option value="inside">Inside</option>
          <option value="center">Center</option>
          <option value="outside">Outside</option>
        </select>
      </div>
      <div className="prop-row">
        <NumberInput
          label="Dash"
          value={dash}
          min={0}
          max={500}
          flex
          {...numericField('Stroke dash', 'strokeDash', (d, v) =>
            applyToSelection(d, (dd, node) => patchBase(dd, node.id, { strokeDash: v })),
          )}
        />
        <NumberInput
          label="Gap"
          value={gap}
          min={0}
          max={500}
          flex
          {...numericField('Stroke gap', 'strokeGap', (d, v) =>
            applyToSelection(d, (dd, node) => patchBase(dd, node.id, { strokeGap: v })),
          )}
        />
      </div>
    </>
  );
}
