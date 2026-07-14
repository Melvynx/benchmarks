import { useState, type JSX } from 'react';
import { exportSelectionAsPng } from '../../persistence/exportPng';
import { exportSelectionAsSvg } from '../../persistence/exportSvg';
import { patchBase, patchNode } from '../../scene/draft';
import { defaultAutoLayout } from '../../scene/factories';
import type {
  BlendMode,
  CrossAxisAlign,
  FrameNode,
  MainAxisAlign,
  SceneNode,
  SizingMode,
} from '../../scene/types';
import { alignSelection, distributeSelection, type AlignKind } from '../../store/actions';
import { editDoc } from '../../store/docEdit';
import { useEditor } from '../../store/store';
import { NumberInput } from '../controls/NumberInput';
import {
  IAlignBottom,
  IAlignCenterH,
  IAlignCenterV,
  IAlignLeft,
  IAlignRight,
  IAlignTop,
  ICorner,
  IDistributeH,
  IDistributeV,
  ILayoutH,
  ILayoutV,
  IMinus,
  IPlus,
} from '../icons';
import { EffectsSection } from './EffectsSection';
import { PaintsSection } from './PaintsSection';
import { TextSection } from './TextSection';
import { applyToSelection, numericField, sharedValue, useSelectedNodes } from './panelUtils';

const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
];

export function PropertiesPanel(): JSX.Element {
  const nodes = useSelectedNodes();
  if (nodes.length === 0) return <EmptyProperties />;

  const anyText = nodes.some((n) => n.type === 'text');
  const showFills = nodes.every((n) => n.type !== 'line');

  return (
    <aside className="panel props-panel">
      <AlignmentRow count={nodes.length} />
      <TransformSection nodes={nodes} />
      <LayoutSection nodes={nodes} />
      <AppearanceSection nodes={nodes} />
      {anyText && <TextSection nodes={nodes} />}
      {showFills && <PaintsSection nodes={nodes} paintKey="fills" />}
      <PaintsSection nodes={nodes} paintKey="strokes" />
      <EffectsSection nodes={nodes} />
      <ExportSection />
    </aside>
  );
}

function EmptyProperties(): JSX.Element {
  const docName = useEditor((s) => s.docName);
  const count = useEditor((s) => Object.keys(s.doc.nodes).length);
  return (
    <aside className="panel props-panel">
      <div className="props-empty">
        <h3>{docName}</h3>
        <p>{count} layer{count === 1 ? '' : 's'}</p>
        <ul>
          <li><kbd>R</kbd> rectangle &nbsp; <kbd>O</kbd> ellipse</li>
          <li><kbd>T</kbd> text &nbsp; <kbd>F</kbd> frame &nbsp; <kbd>L</kbd> line</li>
          <li><kbd>⌘/</kbd> every command</li>
          <li><kbd>Space</kbd> + drag to pan</li>
        </ul>
      </div>
    </aside>
  );
}

function AlignmentRow({ count }: { count: number }): JSX.Element {
  const buttons: Array<[AlignKind, JSX.Element, string]> = [
    ['left', <IAlignLeft key="l" size={14} />, 'Align left'],
    ['center-h', <IAlignCenterH key="ch" size={14} />, 'Align horizontal centers'],
    ['right', <IAlignRight key="r" size={14} />, 'Align right'],
    ['top', <IAlignTop key="t" size={14} />, 'Align top'],
    ['center-v', <IAlignCenterV key="cv" size={14} />, 'Align vertical centers'],
    ['bottom', <IAlignBottom key="b" size={14} />, 'Align bottom'],
  ];
  return (
    <div className="align-row">
      {buttons.map(([kind, icon, title]) => (
        <button key={kind} className="icon-btn" title={title} onClick={() => alignSelection(kind)}>
          {icon}
        </button>
      ))}
      <button className="icon-btn" title="Distribute horizontally" disabled={count < 3} onClick={() => distributeSelection('horizontal')}>
        <IDistributeH size={14} />
      </button>
      <button className="icon-btn" title="Distribute vertically" disabled={count < 3} onClick={() => distributeSelection('vertical')}>
        <IDistributeV size={14} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

function TransformSection({ nodes }: { nodes: SceneNode[] }): JSX.Element {
  const [cornersExpanded, setCornersExpanded] = useState(false);
  const isLine = nodes.every((n) => n.type === 'line');
  const radiusNodes = nodes.filter((n) => n.type === 'rect' || n.type === 'frame');
  const polygons = nodes.filter((n) => n.type === 'polygon');
  const stars = nodes.filter((n) => n.type === 'star');

  const radius = sharedValue(radiusNodes, (n) =>
    n.type === 'rect' || n.type === 'frame'
      ? n.cornerRadius.tl === n.cornerRadius.tr && n.cornerRadius.tr === n.cornerRadius.br && n.cornerRadius.br === n.cornerRadius.bl
        ? n.cornerRadius.tl
        : undefined
      : undefined,
  );

  const setCorner = (corner: 'tl' | 'tr' | 'br' | 'bl' | 'all', v: number): ((d: Parameters<typeof applyToSelection>[0]) => void) => {
    return (d) =>
      applyToSelection(d, (dd, node) => {
        if (node.type !== 'rect' && node.type !== 'frame') return;
        const value = Math.max(0, v);
        const cornerRadius =
          corner === 'all' ? { tl: value, tr: value, br: value, bl: value } : { ...node.cornerRadius, [corner]: value };
        patchNode(dd, node, { cornerRadius });
      });
  };

  return (
    <section className="prop-section">
      <div className="prop-row">
        <NumberInput
          label="X"
          flex
          value={sharedValue(nodes, (n) => round2(n.x))}
          {...numericField('Move', 'pos:x', (d, v) => applyToSelection(d, (dd, n) => patchBase(dd, n.id, { x: v })))}
        />
        <NumberInput
          label="Y"
          flex
          value={sharedValue(nodes, (n) => round2(n.y))}
          {...numericField('Move', 'pos:y', (d, v) => applyToSelection(d, (dd, n) => patchBase(dd, n.id, { y: v })))}
        />
      </div>
      <div className="prop-row">
        <NumberInput
          label="W"
          flex
          min={0}
          value={sharedValue(nodes, (n) => round2(n.width))}
          {...numericField('Resize', 'size:w', (d, v) =>
            applyToSelection(d, (dd, n) => {
              patchBase(dd, n.id, { width: Math.max(0, v), sizingX: 'fixed' });
              const fresh = dd.nodes[n.id];
              if (fresh && fresh.type === 'text' && fresh.autoResize === 'width') {
                patchNode(dd, fresh, { autoResize: 'height' });
              }
            }),
          )}
        />
        <NumberInput
          label="H"
          flex
          min={0}
          disabled={isLine}
          value={sharedValue(nodes, (n) => round2(n.height))}
          {...numericField('Resize', 'size:h', (d, v) =>
            applyToSelection(d, (dd, n) => {
              if (n.type === 'line') return;
              patchBase(dd, n.id, { height: Math.max(0, v), sizingY: 'fixed' });
              const fresh = dd.nodes[n.id];
              if (fresh && fresh.type === 'text') patchNode(dd, fresh, { autoResize: 'none' });
            }),
          )}
        />
      </div>
      <div className="prop-row">
        <NumberInput
          label="∠"
          title="Rotation"
          flex
          suffix="°"
          min={-180}
          max={180}
          value={sharedValue(nodes, (n) => round2(n.rotation))}
          {...numericField('Rotate', 'rotation', (d, v) =>
            applyToSelection(d, (dd, n) => patchBase(dd, n.id, { rotation: v })),
          )}
        />
        {radiusNodes.length > 0 && !cornersExpanded && (
          <>
            <NumberInput
              label={<ICorner size={12} />}
              title="Corner radius"
              flex
              min={0}
              value={radius}
              {...numericField('Corner radius', 'radius', (d, v) => setCorner('all', v)(d))}
            />
            <button className="icon-btn" title="Independent corners" onClick={() => setCornersExpanded(true)}>
              <IPlus size={12} />
            </button>
          </>
        )}
      </div>
      {radiusNodes.length > 0 && cornersExpanded && (
        <div className="prop-row prop-row--corners">
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <NumberInput
              key={corner}
              label={corner.toUpperCase()}
              flex
              min={0}
              value={sharedValue(radiusNodes, (n) =>
                n.type === 'rect' || n.type === 'frame' ? round2(n.cornerRadius[corner]) : undefined,
              )}
              {...numericField('Corner radius', `radius:${corner}`, (d, v) => setCorner(corner, v)(d))}
            />
          ))}
          <button className="icon-btn" title="Uniform corners" onClick={() => setCornersExpanded(false)}>
            <IMinus size={12} />
          </button>
        </div>
      )}
      {polygons.length > 0 && (
        <div className="prop-row">
          <NumberInput
            label="Sides"
            flex
            min={3}
            max={60}
            value={sharedValue(polygons, (n) => (n.type === 'polygon' ? n.pointCount : undefined))}
            {...numericField('Polygon sides', 'pointCount', (d, v) =>
              applyToSelection(d, (dd, n) => {
                if (n.type === 'polygon') patchNode(dd, n, { pointCount: Math.round(v) });
              }),
            )}
          />
        </div>
      )}
      {stars.length > 0 && (
        <div className="prop-row">
          <NumberInput
            label="Points"
            flex
            min={3}
            max={60}
            value={sharedValue(stars, (n) => (n.type === 'star' ? n.pointCount : undefined))}
            {...numericField('Star points', 'pointCount', (d, v) =>
              applyToSelection(d, (dd, n) => {
                if (n.type === 'star') patchNode(dd, n, { pointCount: Math.round(v) });
              }),
            )}
          />
          <NumberInput
            label="Ratio"
            flex
            min={1}
            max={100}
            suffix="%"
            value={sharedValue(stars, (n) => (n.type === 'star' ? Math.round(n.innerRatio * 100) : undefined))}
            {...numericField('Star ratio', 'innerRatio', (d, v) =>
              applyToSelection(d, (dd, n) => {
                if (n.type === 'star') patchNode(dd, n, { innerRatio: v / 100 });
              }),
            )}
          />
        </div>
      )}
    </section>
  );
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------------------
// Auto layout
// ---------------------------------------------------------------------------

function LayoutSection({ nodes }: { nodes: SceneNode[] }): JSX.Element | null {
  const doc = useEditor((s) => s.doc);
  const frame = nodes.length === 1 && nodes[0]?.type === 'frame' ? (nodes[0] as FrameNode) : null;
  const first = nodes[0];
  const parent = first?.parentId ? doc.nodes[first.parentId] : undefined;
  const inAutoLayout = parent?.type === 'frame' && parent.layout !== null;
  if (!frame && !inAutoLayout) return null;

  return (
    <section className="prop-section">
      <header className="prop-section__header">
        <span>Auto layout</span>
        {frame && (
          <button
            className="icon-btn"
            title={frame.layout ? 'Remove auto layout' : 'Add auto layout'}
            onClick={() =>
              editDoc(frame.layout ? 'Remove auto layout' : 'Add auto layout', (d) => {
                const node = d.nodes[frame.id];
                if (node && node.type === 'frame') {
                  patchNode(d, node, { layout: node.layout ? null : defaultAutoLayout('vertical') });
                }
              })
            }
          >
            {frame.layout ? <IMinus size={12} /> : <IPlus size={12} />}
          </button>
        )}
      </header>

      {frame?.layout && <FrameLayoutControls frame={frame} />}
      {inAutoLayout && first && <ChildSizingControls nodes={nodes} />}
    </section>
  );
}

function FrameLayoutControls({ frame }: { frame: FrameNode }): JSX.Element {
  const layout = frame.layout;
  if (!layout) return <></>;
  const patchLayout = (label: string, patch: Partial<NonNullable<FrameNode['layout']>>): void => {
    editDoc(
      label,
      (d) => {
        const node = d.nodes[frame.id];
        if (node && node.type === 'frame' && node.layout) {
          patchNode(d, node, { layout: { ...node.layout, ...patch } });
        }
      },
      { mergeKey: `layout:${Object.keys(patch).join(',')}` },
    );
  };

  return (
    <>
      <div className="prop-row">
        <div className="segmented">
          <button
            className={`seg-btn${layout.direction === 'vertical' ? ' is-active' : ''}`}
            title="Vertical"
            onClick={() => patchLayout('Layout direction', { direction: 'vertical' })}
          >
            <ILayoutV size={13} />
          </button>
          <button
            className={`seg-btn${layout.direction === 'horizontal' ? ' is-active' : ''}`}
            title="Horizontal"
            onClick={() => patchLayout('Layout direction', { direction: 'horizontal' })}
          >
            <ILayoutH size={13} />
          </button>
        </div>
        <NumberInput
          label="Gap"
          flex
          min={0}
          value={layout.gap}
          onChange={(v, commit) => {
            if (commit) patchLayout('Layout gap', { gap: v });
          }}
        />
      </div>
      <div className="prop-row">
        <NumberInput
          label="PX"
          title="Horizontal padding"
          flex
          min={0}
          value={layout.paddingLeft === layout.paddingRight ? layout.paddingLeft : null}
          onChange={(v, commit) => {
            if (commit) patchLayout('Layout padding', { paddingLeft: v, paddingRight: v });
          }}
        />
        <NumberInput
          label="PY"
          title="Vertical padding"
          flex
          min={0}
          value={layout.paddingTop === layout.paddingBottom ? layout.paddingTop : null}
          onChange={(v, commit) => {
            if (commit) patchLayout('Layout padding', { paddingTop: v, paddingBottom: v });
          }}
        />
      </div>
      <div className="prop-row">
        <select
          className="select"
          value={layout.alignMain}
          title="Main-axis alignment"
          onChange={(e) => patchLayout('Layout align', { alignMain: e.target.value as MainAxisAlign })}
        >
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
          <option value="space-between">Space between</option>
        </select>
        <select
          className="select"
          value={layout.alignCross}
          title="Cross-axis alignment"
          onChange={(e) => patchLayout('Layout align', { alignCross: e.target.value as CrossAxisAlign })}
        >
          <option value="start">Start</option>
          <option value="center">Center</option>
          <option value="end">End</option>
        </select>
      </div>
    </>
  );
}

function ChildSizingControls({ nodes }: { nodes: SceneNode[] }): JSX.Element {
  const sizingX = sharedValue(nodes, (n) => n.sizingX);
  const sizingY = sharedValue(nodes, (n) => n.sizingY);
  const canHug = (n: SceneNode): boolean => n.type === 'text' || (n.type === 'frame' && n.layout !== null);
  const hugAllowed = nodes.every(canHug);

  const apply = (axis: 'sizingX' | 'sizingY', value: SizingMode): void => {
    editDoc('Child sizing', (d) => applyToSelection(d, (dd, n) => patchBase(dd, n.id, { [axis]: value })));
  };

  const options = (current: SizingMode | null, axis: 'sizingX' | 'sizingY'): JSX.Element => (
    <select className="select" value={current ?? 'mixed'} onChange={(e) => apply(axis, e.target.value as SizingMode)}>
      {current === null && <option value="mixed">Mixed</option>}
      <option value="fixed">Fixed</option>
      <option value="fill">Fill container</option>
      {hugAllowed && <option value="hug">Hug contents</option>}
    </select>
  );

  return (
    <div className="prop-row">
      <label className="mini-label">W</label>
      {options(sizingX, 'sizingX')}
      <label className="mini-label">H</label>
      {options(sizingY, 'sizingY')}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

function AppearanceSection({ nodes }: { nodes: SceneNode[] }): JSX.Element {
  const opacity = sharedValue(nodes, (n) => Math.round(n.opacity * 100));
  const blend = sharedValue(nodes, (n) => n.blendMode);
  const frames = nodes.filter((n): n is FrameNode => n.type === 'frame');
  const clips = sharedValue(frames, (n) => (n.type === 'frame' ? n.clipsContent : undefined));

  return (
    <section className="prop-section">
      <header className="prop-section__header">
        <span>Appearance</span>
      </header>
      <div className="prop-row">
        <NumberInput
          label="◐"
          title="Opacity"
          flex
          min={0}
          max={100}
          suffix="%"
          value={opacity}
          {...numericField('Opacity', 'opacity', (d, v) =>
            applyToSelection(d, (dd, n) => patchBase(dd, n.id, { opacity: Math.min(1, Math.max(0, v / 100)) })),
          )}
        />
        <select
          className="select"
          value={blend ?? 'mixed'}
          title="Blend mode"
          onChange={(e) =>
            editDoc('Blend mode', (d) =>
              applyToSelection(d, (dd, n) => patchBase(dd, n.id, { blendMode: e.target.value as BlendMode })),
            )
          }
        >
          {blend === null && <option value="mixed">Mixed</option>}
          {BLEND_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode.replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>
      {frames.length > 0 && (
        <label className="check-row">
          <input
            type="checkbox"
            checked={clips ?? false}
            onChange={(e) =>
              editDoc('Clip content', (d) =>
                applyToSelection(d, (dd, n) => {
                  if (n.type === 'frame') patchNode(dd, n, { clipsContent: e.target.checked });
                }),
              )
            }
          />
          Clip content
        </label>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function ExportSection(): JSX.Element {
  const [scale, setScale] = useState(2);
  return (
    <section className="prop-section">
      <header className="prop-section__header">
        <span>Export</span>
      </header>
      <div className="prop-row">
        <select className="select" value={scale} onChange={(e) => setScale(Number(e.target.value))}>
          {[1, 2, 3, 4].map((k) => (
            <option key={k} value={k}>
              {k}x
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => void exportSelectionAsPng(scale)}>
          PNG
        </button>
        <button className="btn" onClick={() => exportSelectionAsSvg()}>
          SVG
        </button>
      </div>
    </section>
  );
}
