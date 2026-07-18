import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalJustifyCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  BoxSelect,
  Eye,
  EyeOff,
  FileJson,
  Image as ImageIcon,
  Link2,
  Plus,
  Trash2,
  Unlink2,
  VectorSquare,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import {
  PRELOADED_FONT_FAMILIES,
  createDefaultAutoLayout,
  createDropShadowEffect,
  createLayerBlurEffect,
  createLinearGradientPaint,
  createRadialGradientPaint,
  createResourceId,
  createSolidPaint,
  createStroke,
  flattenScene,
  type AutoLayoutSettings,
  type CommonNodeChanges,
  type Effect,
  type FrameNode,
  type GradientStop,
  type NodeId,
  type Paint,
  type RgbaColor as ModelColor,
  type SceneDocument,
  type SceneNode,
  type Stroke,
  type TextNode,
} from '@/core/model';
import {
  ColorInput,
  IconButton,
  Menu,
  NumberField,
  PanelSection,
  SegmentedControl,
  Toggle,
  parseHexColor,
  rgbaToHex,
  type MenuEntry,
} from '@/ui/primitives';

export type AlignmentAction =
  | 'align-left'
  | 'align-horizontal-center'
  | 'align-right'
  | 'align-top'
  | 'align-vertical-center'
  | 'align-bottom';

export interface DocumentPropertyChanges {
  readonly name?: string;
  readonly background?: ModelColor;
}

export type PropertyExportRequest =
  | { readonly format: 'json'; readonly scope: 'document' }
  | {
      readonly format: 'png' | 'svg';
      readonly scope: 'selection';
      readonly nodeIds: readonly NodeId[];
    };

export interface PropertiesPanelProps {
  readonly scene: SceneDocument;
  readonly selectedIds: ReadonlySet<NodeId>;
  readonly onCommitNodes: (nodes: readonly SceneNode[], label: string) => void;
  readonly onAlign: (action: AlignmentAction, nodeIds: readonly NodeId[]) => void;
  readonly onChangeDocument: (changes: DocumentPropertyChanges, label: string) => void;
  readonly onExport: (request: PropertyExportRequest) => void;
  readonly className?: string;
}

interface CommitTextFieldProps {
  readonly value: string;
  readonly onCommit: (value: string) => void;
  readonly ariaLabel: string;
  readonly placeholder?: string;
  readonly multiline?: boolean;
  readonly allowEmpty?: boolean;
  readonly trim?: boolean;
}

function CommitTextField({
  value,
  onCommit,
  ariaLabel,
  placeholder,
  multiline = false,
  allowEmpty = false,
  trim = true,
}: CommitTextFieldProps) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const cancelCommitRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  const commit = () => {
    const nextValue = trim ? draft.trim() : draft;
    if ((allowEmpty || nextValue) && nextValue !== value) onCommit(nextValue);
    else setDraft(value);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement> | KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelCommitRef.current = true;
      setDraft(value);
      event.currentTarget.blur();
      return;
    }
    if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      cancelCommitRef.current = true;
      commit();
      event.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    setEditing(false);
    if (cancelCommitRef.current) {
      cancelCommitRef.current = false;
      return;
    }
    commit();
  };

  const sharedProps = {
    value: draft,
    placeholder,
    'aria-label': ariaLabel,
    onFocus: () => setEditing(true),
    onChange: (event: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) =>
      setDraft(event.currentTarget.value),
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
  };

  return multiline ? (
    <textarea className="property-textarea" rows={3} {...sharedProps} />
  ) : (
    <input className="property-text-input" type="text" {...sharedProps} />
  );
}

function modelColorToHex(color: ModelColor): string {
  return rgbaToHex({ r: color.r * 255, g: color.g * 255, b: color.b * 255, a: color.a }, true);
}

function hexToModelColor(value: string, fallback: ModelColor): ModelColor {
  const color = parseHexColor(value);
  if (!color) return fallback;
  return { r: color.r / 255, g: color.g / 255, b: color.b / 255, a: color.a };
}

function commonValue<T>(values: readonly T[], equal: (left: T, right: T) => boolean = Object.is) {
  const firstValue = values[0];
  if (firstValue === undefined) return null;
  return values.every((value) => equal(value, firstValue)) ? firstValue : null;
}

function commonNumber(values: readonly number[]): number | null {
  return commonValue(values, (left, right) => Math.abs(left - right) < 0.0001);
}

function applyCommonChanges(node: SceneNode, changes: CommonNodeChanges): SceneNode {
  return { ...node, ...changes };
}

function replaceAt<T>(items: readonly T[], index: number, replacement: T): readonly T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? replacement : item));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function gradientStopsWithPosition(
  stops: readonly GradientStop[],
  index: number,
  position: number,
): readonly GradientStop[] {
  const previous = stops[index - 1];
  const next = stops[index + 1];
  const minimum = previous?.position ?? 0;
  const maximum = next?.position ?? 1;
  const existing = stops[index];
  if (!existing) return stops;
  return replaceAt(stops, index, { ...existing, position: clamp(position, minimum, maximum) });
}

function addGradientStop(stops: readonly GradientStop[]): readonly GradientStop[] {
  const widestGap = stops.slice(0, -1).reduce(
    (best, stop, index) => {
      const next = stops[index + 1];
      const gap = (next?.position ?? stop.position) - stop.position;
      return gap > best.gap ? { index, gap } : best;
    },
    { index: 0, gap: -Infinity },
  );
  const before = stops[widestGap.index] ?? stops[0];
  const after = stops[widestGap.index + 1] ?? stops[stops.length - 1];
  if (!before || !after) return stops;
  const position = (before.position + after.position) / 2;
  const color = {
    r: (before.color.r + after.color.r) / 2,
    g: (before.color.g + after.color.g) / 2,
    b: (before.color.b + after.color.b) / 2,
    a: (before.color.a + after.color.a) / 2,
  };
  return [...stops, { position, color }].sort((left, right) => left.position - right.position);
}

function paintOfType(paint: Paint, type: Paint['type']): Paint {
  if (paint.type === type) return paint;
  if (type === 'solid') {
    const sourceColor =
      paint.type === 'solid' ? paint.color : (paint.stops[0]?.color ?? { r: 0, g: 0, b: 0, a: 1 });
    return {
      ...createSolidPaint(sourceColor, paint.opacity),
      id: paint.id,
      visible: paint.visible,
    };
  }
  const gradient =
    type === 'linear-gradient' ? createLinearGradientPaint() : createRadialGradientPaint();
  const stops =
    paint.type === 'solid'
      ? [
          { position: 0, color: paint.color },
          { position: 1, color: { ...paint.color, a: 0 } },
        ]
      : paint.stops;
  return {
    ...gradient,
    id: paint.id,
    visible: paint.visible,
    opacity: paint.opacity,
    blendMode: paint.blendMode,
    stops,
  };
}

function collectionsShareTypes<Item>(
  collections: readonly (readonly Item[])[],
  getType: (item: Item) => string,
): boolean {
  const firstCollection = collections[0];
  if (!firstCollection) return false;
  return collections.every(
    (collection) =>
      collection.length === firstCollection.length &&
      collection.every((item, index) => {
        const firstItem = firstCollection[index];
        return firstItem !== undefined && getType(item) === getType(firstItem);
      }),
  );
}

function joinClasses(...classes: readonly (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const ALIGNMENT_ACTIONS: readonly {
  readonly action: AlignmentAction;
  readonly label: string;
  readonly icon: ReactNode;
}[] = [
  { action: 'align-left', label: 'Align left', icon: <AlignStartVertical size={15} /> },
  {
    action: 'align-horizontal-center',
    label: 'Align horizontal centers',
    icon: <AlignCenterVertical size={15} />,
  },
  { action: 'align-right', label: 'Align right', icon: <AlignEndVertical size={15} /> },
  { action: 'align-top', label: 'Align top', icon: <AlignStartHorizontal size={15} /> },
  {
    action: 'align-vertical-center',
    label: 'Align vertical centers',
    icon: <AlignCenterHorizontal size={15} />,
  },
  { action: 'align-bottom', label: 'Align bottom', icon: <AlignEndHorizontal size={15} /> },
];

const EFFECT_MENU_ENTRIES: readonly MenuEntry[] = [
  { type: 'item', id: 'drop-shadow', label: 'Drop shadow' },
  { type: 'item', id: 'inner-shadow', label: 'Inner shadow' },
  { type: 'separator', id: 'effect-separator' },
  { type: 'item', id: 'layer-blur', label: 'Layer blur' },
  { type: 'item', id: 'background-blur', label: 'Background blur' },
];

function PropertyLabel({ children }: { readonly children: ReactNode }) {
  return <span className="property-label">{children}</span>;
}

function EmptyProperties({
  scene,
  onChangeDocument,
  onExport,
}: Pick<PropertiesPanelProps, 'scene' | 'onChangeDocument' | 'onExport'>) {
  return (
    <div className="properties-scroll">
      <PanelSection title="Document">
        <div className="property-stack">
          <label className="property-control">
            <PropertyLabel>Name</PropertyLabel>
            <CommitTextField
              value={scene.name}
              ariaLabel="Document name"
              onCommit={(name) => onChangeDocument({ name }, 'Rename document')}
            />
          </label>
          <div className="property-control">
            <PropertyLabel>Background</PropertyLabel>
            <ColorInput
              value={modelColorToHex(scene.background)}
              ariaLabel="Document background"
              onValueChange={(value) =>
                onChangeDocument(
                  { background: hexToModelColor(value, scene.background) },
                  'Change document background',
                )
              }
            />
          </div>
          <dl className="document-meta">
            <div>
              <dt>Layers</dt>
              <dd>{Object.keys(scene.nodes).length}</dd>
            </div>
            <div>
              <dt>Revision</dt>
              <dd>{scene.revision}</dd>
            </div>
          </dl>
        </div>
      </PanelSection>

      <PanelSection title="Export">
        <button
          type="button"
          className="property-export-button"
          onClick={() => onExport({ format: 'json', scope: 'document' })}
        >
          <FileJson size={15} aria-hidden="true" />
          Export document JSON
        </button>
      </PanelSection>

      <div className="properties-empty-hint">
        <BoxSelect size={22} aria-hidden="true" />
        <p>Select a layer to inspect and edit its properties.</p>
      </div>
    </div>
  );
}

export function PropertiesPanel({
  scene,
  selectedIds,
  onCommitNodes,
  onAlign,
  onChangeDocument,
  onExport,
  className,
}: PropertiesPanelProps) {
  const selectedNodes = flattenScene(scene).filter((node) => selectedIds.has(node.id));
  const selectedNodeIds = selectedNodes.map((node) => node.id);
  const selectionKey = selectedNodeIds.join('|');
  const cornersAreLinked = selectedNodes.every((node) => {
    const { topLeft, topRight, bottomRight, bottomLeft } = node.cornerRadii;
    return topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft;
  });
  const [cornerRadiiLinked, setCornerRadiiLinked] = useState(cornersAreLinked);

  useEffect(() => {
    setCornerRadiiLinked(cornersAreLinked);
  }, [selectionKey]);

  if (selectedNodes.length === 0) {
    return (
      <aside className={joinClasses('properties-panel', className)} aria-label="Properties panel">
        <div className="panel-heading">
          <div>
            <h2>Properties</h2>
            <span>Document</span>
          </div>
        </div>
        <EmptyProperties scene={scene} onChangeDocument={onChangeDocument} onExport={onExport} />
      </aside>
    );
  }

  const commitCommon = (changes: CommonNodeChanges, label: string) => {
    onCommitNodes(
      selectedNodes.map((node) => applyCommonChanges(node, changes)),
      label,
    );
  };

  const commitMapped = (mapper: (node: SceneNode) => SceneNode, label: string) => {
    onCommitNodes(selectedNodes.map(mapper), label);
  };

  const commonBlendMode = commonValue(selectedNodes.map((node) => node.blendMode));
  const commonRadius = commonNumber(
    selectedNodes.map((node) => {
      const { topLeft, topRight, bottomRight, bottomLeft } = node.cornerRadii;
      const radii = [topLeft, topRight, bottomRight, bottomLeft] as const;
      return radii.every((radius) => radius === topLeft) ? topLeft : Number.NaN;
    }),
  );
  const comparableFills = collectionsShareTypes(
    selectedNodes.map((node) => node.fills),
    (paint) => paint.type,
  );
  const comparableStrokes = collectionsShareTypes(
    selectedNodes.map((node) => node.strokes),
    (stroke) => stroke.paint.type,
  );
  const comparableEffects = collectionsShareTypes(
    selectedNodes.map((node) => node.effects),
    (effect) => effect.type,
  );
  const representativeNode = selectedNodes[0];
  if (!representativeNode) return null;

  const updatePaintAt = (index: number, update: (paint: Paint) => Paint, label: string) => {
    commitMapped((node) => {
      const paint = node.fills[index];
      return paint ? { ...node, fills: replaceAt(node.fills, index, update(paint)) } : node;
    }, label);
  };

  const updateStrokeAt = (index: number, update: (stroke: Stroke) => Stroke, label: string) => {
    commitMapped((node) => {
      const stroke = node.strokes[index];
      return stroke ? { ...node, strokes: replaceAt(node.strokes, index, update(stroke)) } : node;
    }, label);
  };

  const updateEffectAt = (index: number, update: (effect: Effect) => Effect, label: string) => {
    commitMapped((node) => {
      const effect = node.effects[index];
      return effect ? { ...node, effects: replaceAt(node.effects, index, update(effect)) } : node;
    }, label);
  };

  const selectedFrame: FrameNode | null =
    selectedNodes.length === 1 && representativeNode.type === 'frame' ? representativeNode : null;
  const selectedTextNodes = selectedNodes.filter((node): node is TextNode => node.type === 'text');
  const allText = selectedTextNodes.length === selectedNodes.length;

  return (
    <aside className={joinClasses('properties-panel', className)} aria-label="Properties panel">
      <div className="panel-heading">
        <div>
          <h2>Properties</h2>
          <span>
            {selectedNodes.length === 1
              ? representativeNode.type
              : `${selectedNodes.length} layers`}
          </span>
        </div>
      </div>

      <div className="properties-scroll">
        <PanelSection title="Transform">
          <div className="alignment-grid" aria-label="Alignment controls">
            {ALIGNMENT_ACTIONS.map(({ action, label, icon }) => (
              <IconButton
                key={action}
                label={label}
                tooltipSide="top"
                icon={icon}
                onClick={() => onAlign(action, selectedNodeIds)}
              />
            ))}
          </div>
          <div className="property-grid property-grid--two">
            <NumberField
              value={commonNumber(selectedNodes.map((node) => node.x))}
              ariaLabel="X position"
              label="X"
              onValueChange={(x) => commitCommon({ x }, 'Change X position')}
            />
            <NumberField
              value={commonNumber(selectedNodes.map((node) => node.y))}
              ariaLabel="Y position"
              label="Y"
              onValueChange={(y) => commitCommon({ y }, 'Change Y position')}
            />
            <NumberField
              value={commonNumber(selectedNodes.map((node) => node.width))}
              ariaLabel="Width"
              label="W"
              min={0.01}
              onValueChange={(width) => commitCommon({ width }, 'Change width')}
            />
            <NumberField
              value={commonNumber(selectedNodes.map((node) => node.height))}
              ariaLabel="Height"
              label="H"
              min={0.01}
              onValueChange={(height) => commitCommon({ height }, 'Change height')}
            />
            <NumberField
              value={commonNumber(selectedNodes.map((node) => node.rotation))}
              ariaLabel="Rotation"
              label="°"
              suffix="°"
              onValueChange={(rotation) => commitCommon({ rotation }, 'Change rotation')}
            />
            <div className="corner-radius-control">
              <NumberField
                value={Number.isFinite(commonRadius ?? Number.NaN) ? commonRadius : null}
                ariaLabel="Corner radius"
                label="R"
                min={0}
                onValueChange={(radius) =>
                  commitCommon(
                    {
                      cornerRadii: {
                        topLeft: radius,
                        topRight: radius,
                        bottomRight: radius,
                        bottomLeft: radius,
                      },
                    },
                    'Change corner radius',
                  )
                }
              />
              <IconButton
                label={cornerRadiiLinked ? 'Unlink corner radii' : 'Link corner radii'}
                tooltipSide="top"
                icon={cornerRadiiLinked ? <Link2 size={14} /> : <Unlink2 size={14} />}
                active={cornerRadiiLinked}
                onClick={() => {
                  if (cornerRadiiLinked) {
                    setCornerRadiiLinked(false);
                    return;
                  }
                  commitMapped(
                    (node) => ({
                      ...node,
                      cornerRadii: {
                        topLeft: node.cornerRadii.topLeft,
                        topRight: node.cornerRadii.topLeft,
                        bottomRight: node.cornerRadii.topLeft,
                        bottomLeft: node.cornerRadii.topLeft,
                      },
                    }),
                    'Link corner radii',
                  );
                  setCornerRadiiLinked(true);
                }}
              />
            </div>
          </div>
          {!cornerRadiiLinked ? (
            <div className="corner-radius-grid" aria-label="Individual corner radii">
              {(
                [
                  ['topLeft', 'TL'],
                  ['topRight', 'TR'],
                  ['bottomRight', 'BR'],
                  ['bottomLeft', 'BL'],
                ] as const
              ).map(([corner, label]) => (
                <NumberField
                  key={corner}
                  value={commonNumber(selectedNodes.map((node) => node.cornerRadii[corner]))}
                  ariaLabel={`${label} corner radius`}
                  label={label}
                  min={0}
                  onValueChange={(radius) => {
                    setCornerRadiiLinked(false);
                    commitMapped(
                      (node) => ({
                        ...node,
                        cornerRadii: { ...node.cornerRadii, [corner]: radius },
                      }),
                      `Change ${label} corner radius`,
                    );
                  }}
                />
              ))}
            </div>
          ) : null}
        </PanelSection>

        <PanelSection title="Appearance">
          <div className="property-stack">
            <div className="property-control property-control--row">
              <PropertyLabel>Opacity</PropertyLabel>
              <NumberField
                value={
                  commonNumber(selectedNodes.map((node) => node.opacity)) === null
                    ? null
                    : (commonNumber(selectedNodes.map((node) => node.opacity)) ?? 0) * 100
                }
                ariaLabel="Layer opacity"
                suffix="%"
                min={0}
                max={100}
                onValueChange={(opacity) =>
                  commitCommon({ opacity: opacity / 100 }, 'Change layer opacity')
                }
              />
            </div>
            <label className="property-control property-control--row">
              <PropertyLabel>Blend</PropertyLabel>
              <select
                className="property-select"
                value={commonBlendMode ?? ''}
                aria-label="Blend mode"
                onChange={(event) => {
                  if (event.currentTarget.value) {
                    commitCommon(
                      { blendMode: event.currentTarget.value as SceneNode['blendMode'] },
                      'Change blend mode',
                    );
                  }
                }}
              >
                {commonBlendMode === null ? <option value="">Mixed</option> : null}
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
                <option value="color-dodge">Color dodge</option>
                <option value="color-burn">Color burn</option>
                <option value="hard-light">Hard light</option>
                <option value="soft-light">Soft light</option>
                <option value="difference">Difference</option>
                <option value="exclusion">Exclusion</option>
                <option value="hue">Hue</option>
                <option value="saturation">Saturation</option>
                <option value="color">Color</option>
                <option value="luminosity">Luminosity</option>
              </select>
            </label>
          </div>
        </PanelSection>

        <PanelSection
          title="Fills"
          actions={
            <IconButton
              label="Add fill"
              tooltipSide="left"
              icon={<Plus size={14} />}
              onClick={() =>
                commitMapped(
                  (node) => ({
                    ...node,
                    fills: [...node.fills, createSolidPaint({ r: 0.45, g: 0.55, b: 0.95, a: 1 })],
                  }),
                  'Add fill',
                )
              }
            />
          }
        >
          {!comparableFills ? (
            <div className="mixed-property-note">Mixed fill stacks</div>
          ) : representativeNode.fills.length === 0 ? (
            <div className="inline-empty">No fills</div>
          ) : (
            <div className="resource-list">
              {representativeNode.fills.map((paint, index) => {
                const relatedPaints = selectedNodes.flatMap((node) =>
                  node.fills[index] ? [node.fills[index]] : [],
                );
                const paintOpacity = commonNumber(relatedPaints.map((item) => item.opacity));
                return (
                  <div className="resource-card" key={paint.id}>
                    <div className="resource-card__heading">
                      <IconButton
                        label={paint.visible ? 'Hide fill' : 'Show fill'}
                        tooltipSide="left"
                        icon={paint.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                        active={!paint.visible}
                        onClick={() =>
                          updatePaintAt(
                            index,
                            (item) => ({ ...item, visible: !paint.visible }),
                            'Toggle fill visibility',
                          )
                        }
                      />
                      <span>
                        {paint.type === 'solid'
                          ? 'Solid'
                          : paint.type === 'linear-gradient'
                            ? 'Linear gradient'
                            : 'Radial gradient'}
                      </span>
                      <IconButton
                        label="Remove fill"
                        tooltipSide="left"
                        icon={<Trash2 size={13} />}
                        onClick={() =>
                          commitMapped(
                            (node) => ({
                              ...node,
                              fills: node.fills.filter((_item, itemIndex) => itemIndex !== index),
                            }),
                            'Remove fill',
                          )
                        }
                      />
                    </div>
                    <label className="property-control property-control--row paint-type-control">
                      <PropertyLabel>Type</PropertyLabel>
                      <select
                        className="property-select"
                        value={paint.type}
                        aria-label={`Fill ${index + 1} type`}
                        onChange={(event) =>
                          updatePaintAt(
                            index,
                            (item) => paintOfType(item, event.currentTarget.value as Paint['type']),
                            'Change fill type',
                          )
                        }
                      >
                        <option value="solid">Solid</option>
                        <option value="linear-gradient">Linear gradient</option>
                        <option value="radial-gradient">Radial gradient</option>
                      </select>
                    </label>
                    {paint.type === 'solid' ? (
                      <ColorInput
                        value={modelColorToHex(paint.color)}
                        ariaLabel={`Fill ${index + 1} color`}
                        onValueChange={(value) =>
                          updatePaintAt(
                            index,
                            (item) =>
                              item.type === 'solid'
                                ? { ...item, color: hexToModelColor(value, item.color) }
                                : item,
                            'Change fill color',
                          )
                        }
                      />
                    ) : (
                      <div className="gradient-editor">
                        <div
                          className="gradient-editor__preview"
                          aria-hidden="true"
                          style={{
                            background: `linear-gradient(90deg, ${paint.stops
                              .map(
                                (stop) =>
                                  `${modelColorToHex(stop.color)} ${Math.round(stop.position * 1000) / 10}%`,
                              )
                              .join(', ')})`,
                          }}
                        >
                          {paint.stops.map((stop) => (
                            <span
                              key={`${paint.id}-${stop.position}-${modelColorToHex(stop.color)}`}
                              className="gradient-editor__preview-stop"
                              style={{
                                left: `${stop.position * 100}%`,
                                background: modelColorToHex(stop.color),
                              }}
                            />
                          ))}
                        </div>
                        <div className="gradient-stop-list">
                          {paint.stops.map((stop, stopIndex) => (
                            <div className="gradient-stop-row" key={`${paint.id}-${stopIndex}`}>
                              <ColorInput
                                value={modelColorToHex(stop.color)}
                                ariaLabel={`Gradient stop ${stopIndex + 1} color`}
                                onValueChange={(value) =>
                                  updatePaintAt(
                                    index,
                                    (item) => {
                                      if (item.type === 'solid') return item;
                                      const currentStop = item.stops[stopIndex];
                                      if (!currentStop) return item;
                                      return {
                                        ...item,
                                        stops: replaceAt(item.stops, stopIndex, {
                                          ...currentStop,
                                          color: hexToModelColor(value, currentStop.color),
                                        }),
                                      };
                                    },
                                    'Change gradient stop color',
                                  )
                                }
                              />
                              <NumberField
                                value={stop.position * 100}
                                ariaLabel={`Gradient stop ${stopIndex + 1} position`}
                                label="Pos"
                                suffix="%"
                                min={0}
                                max={100}
                                precision={1}
                                onValueChange={(position) =>
                                  updatePaintAt(
                                    index,
                                    (item) =>
                                      item.type === 'solid'
                                        ? item
                                        : {
                                            ...item,
                                            stops: gradientStopsWithPosition(
                                              item.stops,
                                              stopIndex,
                                              position / 100,
                                            ),
                                          },
                                    'Change gradient stop position',
                                  )
                                }
                              />
                              <IconButton
                                label={`Remove gradient stop ${stopIndex + 1}`}
                                tooltipSide="left"
                                icon={<Trash2 size={13} />}
                                disabled={paint.stops.length <= 2}
                                onClick={() =>
                                  updatePaintAt(
                                    index,
                                    (item) =>
                                      item.type === 'solid'
                                        ? item
                                        : {
                                            ...item,
                                            stops: item.stops.filter(
                                              (_stop, itemIndex) => itemIndex !== stopIndex,
                                            ),
                                          },
                                    'Remove gradient stop',
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="gradient-editor__add-stop"
                          onClick={() =>
                            updatePaintAt(
                              index,
                              (item) =>
                                item.type === 'solid'
                                  ? item
                                  : { ...item, stops: addGradientStop(item.stops) },
                              'Add gradient stop',
                            )
                          }
                        >
                          <Plus size={13} aria-hidden="true" />
                          Add stop
                        </button>
                        <div className="gradient-geometry">
                          <span className="gradient-geometry__label">Geometry</span>
                          {paint.type === 'linear-gradient' ? (
                            <div className="gradient-geometry__grid">
                              <NumberField
                                value={paint.start.x * 100}
                                ariaLabel="Linear gradient start X"
                                label="Start X"
                                suffix="%"
                                precision={1}
                                onValueChange={(value) =>
                                  updatePaintAt(
                                    index,
                                    (item) =>
                                      item.type === 'linear-gradient'
                                        ? { ...item, start: { ...item.start, x: value / 100 } }
                                        : item,
                                    'Change linear gradient start',
                                  )
                                }
                              />
                              <NumberField
                                value={paint.start.y * 100}
                                ariaLabel="Linear gradient start Y"
                                label="Start Y"
                                suffix="%"
                                precision={1}
                                onValueChange={(value) =>
                                  updatePaintAt(
                                    index,
                                    (item) =>
                                      item.type === 'linear-gradient'
                                        ? { ...item, start: { ...item.start, y: value / 100 } }
                                        : item,
                                    'Change linear gradient start',
                                  )
                                }
                              />
                              <NumberField
                                value={paint.end.x * 100}
                                ariaLabel="Linear gradient end X"
                                label="End X"
                                suffix="%"
                                precision={1}
                                onValueChange={(value) =>
                                  updatePaintAt(
                                    index,
                                    (item) =>
                                      item.type === 'linear-gradient'
                                        ? { ...item, end: { ...item.end, x: value / 100 } }
                                        : item,
                                    'Change linear gradient end',
                                  )
                                }
                              />
                              <NumberField
                                value={paint.end.y * 100}
                                ariaLabel="Linear gradient end Y"
                                label="End Y"
                                suffix="%"
                                precision={1}
                                onValueChange={(value) =>
                                  updatePaintAt(
                                    index,
                                    (item) =>
                                      item.type === 'linear-gradient'
                                        ? { ...item, end: { ...item.end, y: value / 100 } }
                                        : item,
                                    'Change linear gradient end',
                                  )
                                }
                              />
                            </div>
                          ) : (
                            <div className="gradient-geometry__grid">
                              {(
                                [
                                  ['center', 'x', 'Center X'],
                                  ['center', 'y', 'Center Y'],
                                  ['radius', 'x', 'Radius X'],
                                  ['radius', 'y', 'Radius Y'],
                                  ['focalPoint', 'x', 'Focal X'],
                                  ['focalPoint', 'y', 'Focal Y'],
                                ] as const
                              ).map(([point, axis, label]) => (
                                <NumberField
                                  key={`${point}-${axis}`}
                                  value={paint[point][axis] * 100}
                                  ariaLabel={`Radial gradient ${label}`}
                                  label={label}
                                  suffix="%"
                                  precision={1}
                                  onValueChange={(value) =>
                                    updatePaintAt(
                                      index,
                                      (item) =>
                                        item.type === 'radial-gradient'
                                          ? {
                                              ...item,
                                              [point]: { ...item[point], [axis]: value / 100 },
                                            }
                                          : item,
                                      `Change radial gradient ${label.toLowerCase()}`,
                                    )
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <NumberField
                      value={paintOpacity === null ? null : paintOpacity * 100}
                      ariaLabel={`Fill ${index + 1} opacity`}
                      label="O"
                      suffix="%"
                      min={0}
                      max={100}
                      onValueChange={(opacity) =>
                        updatePaintAt(
                          index,
                          (item) => ({ ...item, opacity: opacity / 100 }),
                          'Change fill opacity',
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </PanelSection>

        <PanelSection
          title="Strokes"
          actions={
            <IconButton
              label="Add stroke"
              tooltipSide="left"
              icon={<Plus size={14} />}
              onClick={() =>
                commitMapped(
                  (node) => ({ ...node, strokes: [...node.strokes, createStroke()] }),
                  'Add stroke',
                )
              }
            />
          }
        >
          {!comparableStrokes ? (
            <div className="mixed-property-note">Mixed stroke stacks</div>
          ) : representativeNode.strokes.length === 0 ? (
            <div className="inline-empty">No strokes</div>
          ) : (
            <div className="resource-list">
              {representativeNode.strokes.map((stroke, index) => {
                const relatedStrokes = selectedNodes.flatMap((node) =>
                  node.strokes[index] ? [node.strokes[index]] : [],
                );
                return (
                  <div className="resource-card" key={stroke.id}>
                    <div className="resource-card__heading">
                      <IconButton
                        label={stroke.visible ? 'Hide stroke' : 'Show stroke'}
                        tooltipSide="left"
                        icon={stroke.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                        active={!stroke.visible}
                        onClick={() =>
                          updateStrokeAt(
                            index,
                            (item) => ({ ...item, visible: !stroke.visible }),
                            'Toggle stroke visibility',
                          )
                        }
                      />
                      <span>Stroke {index + 1}</span>
                      <IconButton
                        label="Remove stroke"
                        tooltipSide="left"
                        icon={<Trash2 size={13} />}
                        onClick={() =>
                          commitMapped(
                            (node) => ({
                              ...node,
                              strokes: node.strokes.filter(
                                (_item, itemIndex) => itemIndex !== index,
                              ),
                            }),
                            'Remove stroke',
                          )
                        }
                      />
                    </div>
                    {stroke.paint.type === 'solid' ? (
                      <ColorInput
                        value={modelColorToHex(stroke.paint.color)}
                        ariaLabel={`Stroke ${index + 1} color`}
                        onValueChange={(value) =>
                          updateStrokeAt(
                            index,
                            (item) =>
                              item.paint.type === 'solid'
                                ? {
                                    ...item,
                                    paint: {
                                      ...item.paint,
                                      color: hexToModelColor(value, item.paint.color),
                                    },
                                  }
                                : item,
                            'Change stroke color',
                          )
                        }
                      />
                    ) : (
                      <div className="mixed-property-note">Gradient stroke</div>
                    )}
                    <div className="property-grid property-grid--two">
                      <NumberField
                        value={commonNumber(relatedStrokes.map((item) => item.width))}
                        ariaLabel={`Stroke ${index + 1} width`}
                        label="W"
                        min={0}
                        onValueChange={(width) =>
                          updateStrokeAt(
                            index,
                            (item) => ({ ...item, width }),
                            'Change stroke width',
                          )
                        }
                      />
                      <label className="compact-select-wrap">
                        <span className="ui-visually-hidden">Stroke alignment</span>
                        <select
                          className="property-select"
                          value={commonValue(relatedStrokes.map((item) => item.align)) ?? ''}
                          onChange={(event) => {
                            const align = event.currentTarget.value as Stroke['align'];
                            updateStrokeAt(
                              index,
                              (item) => ({ ...item, align }),
                              'Change stroke alignment',
                            );
                          }}
                        >
                          {commonValue(relatedStrokes.map((item) => item.align)) === null ? (
                            <option value="">Mixed</option>
                          ) : null}
                          <option value="inside">Inside</option>
                          <option value="center">Center</option>
                          <option value="outside">Outside</option>
                        </select>
                      </label>
                    </div>
                    <label className="property-control">
                      <PropertyLabel>Dash</PropertyLabel>
                      <CommitTextField
                        value={stroke.dash.join(', ')}
                        ariaLabel={`Stroke ${index + 1} dash pattern`}
                        placeholder="Solid"
                        allowEmpty
                        onCommit={(value) => {
                          const dash = value
                            ? value
                                .split(/[ ,]+/)
                                .map(Number)
                                .filter((item) => Number.isFinite(item) && item >= 0)
                            : [];
                          updateStrokeAt(
                            index,
                            (item) => ({ ...item, dash }),
                            'Change stroke dash',
                          );
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </PanelSection>

        <PanelSection
          title="Effects"
          actions={
            <Menu
              trigger={<Plus size={14} aria-hidden="true" />}
              triggerLabel="Add effect"
              placement="left-start"
              entries={EFFECT_MENU_ENTRIES}
              onAction={(effectType) => {
                const effect: Effect =
                  effectType === 'drop-shadow'
                    ? createDropShadowEffect()
                    : effectType === 'inner-shadow'
                      ? {
                          ...createDropShadowEffect(),
                          id: createResourceId('effect'),
                          type: 'inner-shadow',
                        }
                      : effectType === 'background-blur'
                        ? {
                            id: createResourceId('effect'),
                            type: 'background-blur',
                            visible: true,
                            radius: 4,
                          }
                        : createLayerBlurEffect();
                commitMapped(
                  (node) => ({ ...node, effects: [...node.effects, effect] }),
                  'Add effect',
                );
              }}
            />
          }
        >
          {!comparableEffects ? (
            <div className="mixed-property-note">Mixed effect stacks</div>
          ) : representativeNode.effects.length === 0 ? (
            <div className="inline-empty">No effects</div>
          ) : (
            <div className="resource-list">
              {representativeNode.effects.map((effect, index) => {
                const relatedEffects = selectedNodes.flatMap((node) =>
                  node.effects[index] ? [node.effects[index]] : [],
                );
                const shadow = effect.type === 'drop-shadow' || effect.type === 'inner-shadow';
                return (
                  <div className="resource-card" key={effect.id}>
                    <div className="resource-card__heading">
                      <IconButton
                        label={effect.visible ? 'Hide effect' : 'Show effect'}
                        tooltipSide="left"
                        icon={effect.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                        active={!effect.visible}
                        onClick={() =>
                          updateEffectAt(
                            index,
                            (item) => ({ ...item, visible: !effect.visible }),
                            'Toggle effect visibility',
                          )
                        }
                      />
                      <span>{effect.type.replaceAll('-', ' ')}</span>
                      <IconButton
                        label="Remove effect"
                        tooltipSide="left"
                        icon={<Trash2 size={13} />}
                        onClick={() =>
                          commitMapped(
                            (node) => ({
                              ...node,
                              effects: node.effects.filter(
                                (_item, itemIndex) => itemIndex !== index,
                              ),
                            }),
                            'Remove effect',
                          )
                        }
                      />
                    </div>
                    {shadow ? (
                      <>
                        <ColorInput
                          value={modelColorToHex(effect.color)}
                          ariaLabel={`${effect.type} color`}
                          onValueChange={(value) =>
                            updateEffectAt(
                              index,
                              (item) =>
                                item.type === 'drop-shadow' || item.type === 'inner-shadow'
                                  ? { ...item, color: hexToModelColor(value, item.color) }
                                  : item,
                              'Change shadow color',
                            )
                          }
                        />
                        <div className="property-grid property-grid--two">
                          <NumberField
                            value={commonNumber(
                              relatedEffects.flatMap((item) =>
                                item.type === 'drop-shadow' || item.type === 'inner-shadow'
                                  ? [item.offset.x]
                                  : [],
                              ),
                            )}
                            ariaLabel="Shadow X offset"
                            label="X"
                            onValueChange={(x) =>
                              updateEffectAt(
                                index,
                                (item) =>
                                  item.type === 'drop-shadow' || item.type === 'inner-shadow'
                                    ? { ...item, offset: { ...item.offset, x } }
                                    : item,
                                'Change shadow X offset',
                              )
                            }
                          />
                          <NumberField
                            value={commonNumber(
                              relatedEffects.flatMap((item) =>
                                item.type === 'drop-shadow' || item.type === 'inner-shadow'
                                  ? [item.offset.y]
                                  : [],
                              ),
                            )}
                            ariaLabel="Shadow Y offset"
                            label="Y"
                            onValueChange={(y) =>
                              updateEffectAt(
                                index,
                                (item) =>
                                  item.type === 'drop-shadow' || item.type === 'inner-shadow'
                                    ? { ...item, offset: { ...item.offset, y } }
                                    : item,
                                'Change shadow Y offset',
                              )
                            }
                          />
                          <NumberField
                            value={commonNumber(
                              relatedEffects.flatMap((item) =>
                                item.type === 'drop-shadow' || item.type === 'inner-shadow'
                                  ? [item.blur]
                                  : [],
                              ),
                            )}
                            ariaLabel="Shadow blur"
                            label="B"
                            min={0}
                            onValueChange={(blur) =>
                              updateEffectAt(
                                index,
                                (item) =>
                                  item.type === 'drop-shadow' || item.type === 'inner-shadow'
                                    ? { ...item, blur }
                                    : item,
                                'Change shadow blur',
                              )
                            }
                          />
                          <NumberField
                            value={commonNumber(
                              relatedEffects.flatMap((item) =>
                                item.type === 'drop-shadow' || item.type === 'inner-shadow'
                                  ? [item.spread]
                                  : [],
                              ),
                            )}
                            ariaLabel="Shadow spread"
                            label="S"
                            onValueChange={(spread) =>
                              updateEffectAt(
                                index,
                                (item) =>
                                  item.type === 'drop-shadow' || item.type === 'inner-shadow'
                                    ? { ...item, spread }
                                    : item,
                                'Change shadow spread',
                              )
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <NumberField
                        value={commonNumber(
                          relatedEffects.flatMap((item) =>
                            item.type === 'layer-blur' || item.type === 'background-blur'
                              ? [item.radius]
                              : [],
                          ),
                        )}
                        ariaLabel={`${effect.type} radius`}
                        label="R"
                        min={0}
                        onValueChange={(radius) =>
                          updateEffectAt(
                            index,
                            (item) =>
                              item.type === 'layer-blur' || item.type === 'background-blur'
                                ? { ...item, radius }
                                : item,
                            'Change blur radius',
                          )
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PanelSection>

        {selectedFrame ? (
          <FrameProperties
            frame={selectedFrame}
            onCommit={(frame, label) => onCommitNodes([frame], label)}
          />
        ) : null}

        {allText ? (
          <TextProperties
            nodes={selectedTextNodes}
            onCommit={(nodes, label) => onCommitNodes(nodes, label)}
          />
        ) : null}

        <PanelSection title="Export">
          <div className="property-export-grid">
            <button
              type="button"
              className="property-export-button"
              onClick={() =>
                onExport({ format: 'png', scope: 'selection', nodeIds: selectedNodeIds })
              }
            >
              <ImageIcon size={15} aria-hidden="true" />
              PNG
            </button>
            <button
              type="button"
              className="property-export-button"
              onClick={() =>
                onExport({ format: 'svg', scope: 'selection', nodeIds: selectedNodeIds })
              }
            >
              <VectorSquare size={15} aria-hidden="true" />
              SVG
            </button>
            <button
              type="button"
              className="property-export-button property-export-button--wide"
              onClick={() => onExport({ format: 'json', scope: 'document' })}
            >
              <FileJson size={15} aria-hidden="true" />
              Document JSON
            </button>
          </div>
        </PanelSection>
      </div>
    </aside>
  );
}

interface FramePropertiesProps {
  readonly frame: FrameNode;
  readonly onCommit: (frame: FrameNode, label: string) => void;
}

function FrameProperties({ frame, onCommit }: FramePropertiesProps) {
  const updateLayout = (changes: Partial<AutoLayoutSettings>, label: string) => {
    if (!frame.autoLayout) return;
    onCommit({ ...frame, autoLayout: { ...frame.autoLayout, ...changes } }, label);
  };

  const updatePadding = (changes: Partial<AutoLayoutSettings['padding']>, label: string) => {
    if (!frame.autoLayout) return;
    updateLayout({ padding: { ...frame.autoLayout.padding, ...changes } }, label);
  };

  return (
    <PanelSection title="Frame">
      <div className="property-stack">
        <Toggle
          checked={frame.clipContent}
          label="Clip content"
          onCheckedChange={(clipContent) =>
            onCommit({ ...frame, clipContent }, 'Toggle frame clipping')
          }
        />
        <Toggle
          checked={frame.autoLayout !== null}
          label="Auto layout"
          onCheckedChange={(enabled) =>
            onCommit(
              { ...frame, autoLayout: enabled ? createDefaultAutoLayout() : null },
              enabled ? 'Enable auto layout' : 'Disable auto layout',
            )
          }
        />
        {frame.autoLayout ? (
          <>
            <SegmentedControl
              value={frame.autoLayout.direction}
              ariaLabel="Auto layout direction"
              grow
              options={[
                { value: 'horizontal', label: 'Horizontal' },
                { value: 'vertical', label: 'Vertical' },
              ]}
              onValueChange={(direction) =>
                updateLayout({ direction }, 'Change auto layout direction')
              }
            />
            <div className="property-grid property-grid--two">
              <NumberField
                value={frame.autoLayout.gap}
                ariaLabel="Auto layout gap"
                label="Gap"
                onValueChange={(gap) => updateLayout({ gap }, 'Change auto layout gap')}
              />
              <NumberField
                value={frame.autoLayout.counterAxisGap}
                ariaLabel="Auto layout row gap"
                label="Row"
                onValueChange={(counterAxisGap) =>
                  updateLayout({ counterAxisGap }, 'Change auto layout row gap')
                }
              />
              <NumberField
                value={frame.autoLayout.padding.top}
                ariaLabel="Top padding"
                label="T"
                min={0}
                onValueChange={(top) => updatePadding({ top }, 'Change top padding')}
              />
              <NumberField
                value={frame.autoLayout.padding.right}
                ariaLabel="Right padding"
                label="R"
                min={0}
                onValueChange={(right) => updatePadding({ right }, 'Change right padding')}
              />
              <NumberField
                value={frame.autoLayout.padding.bottom}
                ariaLabel="Bottom padding"
                label="B"
                min={0}
                onValueChange={(bottom) => updatePadding({ bottom }, 'Change bottom padding')}
              />
              <NumberField
                value={frame.autoLayout.padding.left}
                ariaLabel="Left padding"
                label="L"
                min={0}
                onValueChange={(left) => updatePadding({ left }, 'Change left padding')}
              />
            </div>
            <label className="property-control property-control--row">
              <PropertyLabel>Primary</PropertyLabel>
              <select
                className="property-select"
                value={frame.autoLayout.primaryAlignment}
                onChange={(event) =>
                  updateLayout(
                    {
                      primaryAlignment: event.currentTarget
                        .value as AutoLayoutSettings['primaryAlignment'],
                    },
                    'Change primary alignment',
                  )
                }
              >
                <option value="start">Start</option>
                <option value="center">Center</option>
                <option value="end">End</option>
                <option value="space-between">Space between</option>
              </select>
            </label>
            <label className="property-control property-control--row">
              <PropertyLabel>Counter</PropertyLabel>
              <select
                className="property-select"
                value={frame.autoLayout.counterAlignment}
                onChange={(event) =>
                  updateLayout(
                    {
                      counterAlignment: event.currentTarget
                        .value as AutoLayoutSettings['counterAlignment'],
                    },
                    'Change counter alignment',
                  )
                }
              >
                <option value="start">Start</option>
                <option value="center">Center</option>
                <option value="end">End</option>
                <option value="baseline">Baseline</option>
                <option value="stretch">Stretch</option>
              </select>
            </label>
            <div className="property-grid property-grid--two">
              <label className="compact-select-wrap">
                <span className="property-label">Width</span>
                <select
                  className="property-select"
                  value={frame.autoLayout.horizontalSizing}
                  onChange={(event) =>
                    updateLayout(
                      {
                        horizontalSizing: event.currentTarget
                          .value as AutoLayoutSettings['horizontalSizing'],
                      },
                      'Change auto layout width sizing',
                    )
                  }
                >
                  <option value="fixed">Fixed</option>
                  <option value="hug">Hug</option>
                  <option value="fill">Fill</option>
                </select>
              </label>
              <label className="compact-select-wrap">
                <span className="property-label">Height</span>
                <select
                  className="property-select"
                  value={frame.autoLayout.verticalSizing}
                  onChange={(event) =>
                    updateLayout(
                      {
                        verticalSizing: event.currentTarget
                          .value as AutoLayoutSettings['verticalSizing'],
                      },
                      'Change auto layout height sizing',
                    )
                  }
                >
                  <option value="fixed">Fixed</option>
                  <option value="hug">Hug</option>
                  <option value="fill">Fill</option>
                </select>
              </label>
            </div>
            <Toggle
              checked={frame.autoLayout.wrap}
              label="Wrap children"
              onCheckedChange={(wrap) => updateLayout({ wrap }, 'Toggle auto layout wrap')}
            />
            <Toggle
              checked={frame.autoLayout.reverse}
              label="Reverse order"
              onCheckedChange={(reverse) =>
                updateLayout({ reverse }, 'Toggle auto layout reverse order')
              }
            />
          </>
        ) : null}
      </div>
    </PanelSection>
  );
}

interface TextPropertiesProps {
  readonly nodes: readonly TextNode[];
  readonly onCommit: (nodes: readonly TextNode[], label: string) => void;
}

function TextProperties({ nodes, onCommit }: TextPropertiesProps) {
  const representative = nodes[0];
  if (!representative) return null;

  const updateText = (changes: Partial<TextNode>, label: string) => {
    onCommit(
      nodes.map((node) => ({ ...node, ...changes, id: node.id, type: 'text' })),
      label,
    );
  };

  const fontFamily = commonValue(nodes.map((node) => node.fontFamily));
  const fontWeight = commonNumber(nodes.map((node) => node.fontWeight));
  const textAlign = commonValue(nodes.map((node) => node.textAlign));
  const fontStyle = commonValue(nodes.map((node) => node.fontStyle));

  return (
    <PanelSection title="Typography">
      <div className="property-stack">
        {nodes.length === 1 ? (
          <CommitTextField
            value={representative.content}
            ariaLabel="Text content"
            multiline
            allowEmpty
            trim={false}
            onCommit={(content) => updateText({ content }, 'Edit text')}
          />
        ) : null}
        <label className="property-control">
          <PropertyLabel>Font</PropertyLabel>
          <select
            className="property-select"
            value={fontFamily ?? ''}
            onChange={(event) => {
              if (event.currentTarget.value) {
                updateText({ fontFamily: event.currentTarget.value }, 'Change font family');
              }
            }}
          >
            {fontFamily === null ? <option value="">Mixed</option> : null}
            {fontFamily !== null &&
            !PRELOADED_FONT_FAMILIES.some((family) => family === fontFamily) ? (
              <option value={fontFamily}>{fontFamily}</option>
            ) : null}
            {PRELOADED_FONT_FAMILIES.map((family) => (
              <option value={family} key={family}>
                {family}
              </option>
            ))}
          </select>
        </label>
        <div className="property-grid property-grid--two">
          <label className="compact-select-wrap">
            <span className="property-label">Weight</span>
            <select
              className="property-select"
              value={fontWeight ?? ''}
              onChange={(event) =>
                updateText({ fontWeight: Number(event.currentTarget.value) }, 'Change font weight')
              }
            >
              {fontWeight === null ? <option value="">Mixed</option> : null}
              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => (
                <option value={weight} key={weight}>
                  {weight}
                </option>
              ))}
            </select>
          </label>
          <NumberField
            value={commonNumber(nodes.map((node) => node.fontSize))}
            ariaLabel="Font size"
            label="Size"
            min={1}
            onValueChange={(fontSize) => updateText({ fontSize }, 'Change font size')}
          />
          <NumberField
            value={commonNumber(nodes.map((node) => node.lineHeight))}
            ariaLabel="Line height"
            label="LH"
            min={1}
            onValueChange={(lineHeight) => updateText({ lineHeight }, 'Change line height')}
          />
          <NumberField
            value={commonNumber(nodes.map((node) => node.letterSpacing))}
            ariaLabel="Letter spacing"
            label="LS"
            onValueChange={(letterSpacing) =>
              updateText({ letterSpacing }, 'Change letter spacing')
            }
          />
        </div>
        <div className="text-align-row">
          {textAlign === null ? <span className="mixed-badge">Mixed</span> : null}
          <SegmentedControl
            value={textAlign ?? representative.textAlign}
            ariaLabel="Text alignment"
            grow
            options={[
              { value: 'left', label: 'Left', icon: <AlignLeft size={14} /> },
              {
                value: 'center',
                label: 'Center',
                icon: <AlignHorizontalJustifyCenter size={14} />,
              },
              { value: 'right', label: 'Right', icon: <AlignRight size={14} /> },
              { value: 'justify', label: 'Justify', icon: <AlignJustify size={14} /> },
            ]}
            onValueChange={(nextTextAlign) =>
              updateText({ textAlign: nextTextAlign }, 'Change text alignment')
            }
          />
        </div>
        <Toggle
          checked={fontStyle === 'italic'}
          label={fontStyle === null ? 'Italic (mixed)' : 'Italic'}
          onCheckedChange={(italic) =>
            updateText({ fontStyle: italic ? 'italic' : 'normal' }, 'Toggle italic')
          }
        />
        <label className="property-control property-control--row">
          <PropertyLabel>Decoration</PropertyLabel>
          <select
            className="property-select"
            value={commonValue(nodes.map((node) => node.textDecoration)) ?? ''}
            onChange={(event) =>
              updateText(
                { textDecoration: event.currentTarget.value as TextNode['textDecoration'] },
                'Change text decoration',
              )
            }
          >
            {commonValue(nodes.map((node) => node.textDecoration)) === null ? (
              <option value="">Mixed</option>
            ) : null}
            <option value="none">None</option>
            <option value="underline">Underline</option>
            <option value="line-through">Strikethrough</option>
          </select>
        </label>
        <label className="property-control property-control--row">
          <PropertyLabel>Resize</PropertyLabel>
          <select
            className="property-select"
            value={commonValue(nodes.map((node) => node.autoResize)) ?? ''}
            onChange={(event) =>
              updateText(
                { autoResize: event.currentTarget.value as TextNode['autoResize'] },
                'Change text auto resize',
              )
            }
          >
            {commonValue(nodes.map((node) => node.autoResize)) === null ? (
              <option value="">Mixed</option>
            ) : null}
            <option value="none">Fixed</option>
            <option value="width-and-height">Auto width</option>
            <option value="height">Auto height</option>
          </select>
        </label>
      </div>
    </PanelSection>
  );
}
