import type { JSX } from 'react';
import { patchNode, type DraftDoc } from '../../scene/draft';
import type { SceneNode, TextAlignH, TextAlignV, TextAutoResize, TextNode } from '../../scene/types';
import { editDoc } from '../../store/docEdit';
import { FONT_FAMILIES, familyDef, nearestWeight } from '../../text/fonts';
import { NumberInput } from '../controls/NumberInput';
import { applyToSelection, numericField, sharedValue } from './panelUtils';

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
};

function applyToTexts(d: DraftDoc, fn: (d: DraftDoc, node: TextNode) => void): void {
  applyToSelection(d, (dd, node) => {
    if (node.type === 'text') fn(dd, node);
  });
}

export function TextSection({ nodes }: { nodes: SceneNode[] }): JSX.Element {
  const texts = nodes.filter((n): n is TextNode => n.type === 'text');
  const family = sharedValue(texts, (n) => n.fontFamily);
  const weight = sharedValue(texts, (n) => n.fontWeight);
  const size = sharedValue(texts, (n) => n.fontSize);
  const lineHeight = sharedValue(texts, (n) => n.lineHeightPx);
  const spacing = sharedValue(texts, (n) => n.letterSpacing);
  const align = sharedValue(texts, (n) => n.textAlign);
  const alignV = sharedValue(texts, (n) => n.textAlignVertical);
  const resize = sharedValue(texts, (n) => n.autoResize);

  const weights = family ? familyDef(family).weights : [100, 200, 300, 400, 500, 600, 700, 800, 900];

  return (
    <section className="prop-section">
      <header className="prop-section__header">
        <span>Text</span>
      </header>

      <select
        className="select select--full"
        value={family ?? 'mixed'}
        onChange={(e) =>
          editDoc('Font family', (d) =>
            applyToTexts(d, (dd, node) =>
              patchNode(dd, node, {
                fontFamily: e.target.value,
                fontWeight: nearestWeight(e.target.value, node.fontWeight),
              }),
            ),
          )
        }
      >
        {family === null && <option value="mixed">Mixed</option>}
        {FONT_FAMILIES.map((f) => (
          <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
            {f.family}
          </option>
        ))}
      </select>

      <div className="prop-row">
        <select
          className="select"
          value={weight ?? 'mixed'}
          onChange={(e) =>
            editDoc('Font weight', (d) =>
              applyToTexts(d, (dd, node) => patchNode(dd, node, { fontWeight: Number(e.target.value) })),
            )
          }
        >
          {weight === null && <option value="mixed">Mixed</option>}
          {weights.map((w) => (
            <option key={w} value={w}>
              {WEIGHT_NAMES[w] ?? w} ({w})
            </option>
          ))}
        </select>
        <NumberInput
          value={size}
          min={1}
          max={800}
          title="Font size"
          {...numericField('Font size', 'fontSize', (d, v) =>
            applyToTexts(d, (dd, node) => patchNode(dd, node, { fontSize: v })),
          )}
        />
      </div>

      <div className="prop-row">
        <NumberInput
          label="↕"
          title="Line height (empty = auto)"
          value={lineHeight}
          placeholder={lineHeight === null && texts.every((t) => t.lineHeightPx === null) ? 'Auto' : 'Mixed'}
          min={1}
          max={999}
          flex
          {...numericField('Line height', 'lineHeight', (d, v) =>
            applyToTexts(d, (dd, node) => patchNode(dd, node, { lineHeightPx: v })),
          )}
        />
        <NumberInput
          label="↔"
          title="Letter spacing"
          value={spacing}
          min={-50}
          max={200}
          step={0.1}
          flex
          {...numericField('Letter spacing', 'letterSpacing', (d, v) =>
            applyToTexts(d, (dd, node) => patchNode(dd, node, { letterSpacing: v })),
          )}
        />
        {lineHeight !== null && (
          <button
            className="icon-btn"
            title="Reset line height to auto"
            onClick={() =>
              editDoc('Line height auto', (d) => applyToTexts(d, (dd, node) => patchNode(dd, node, { lineHeightPx: null })))
            }
          >
            ⟲
          </button>
        )}
      </div>

      <div className="prop-row">
        <Segmented<TextAlignH>
          value={align}
          options={[
            ['left', '⇤'],
            ['center', '↔'],
            ['right', '⇥'],
          ]}
          titles={['Align left', 'Align center', 'Align right']}
          onChange={(v) =>
            editDoc('Text align', (d) => applyToTexts(d, (dd, node) => patchNode(dd, node, { textAlign: v })))
          }
        />
        <Segmented<TextAlignV>
          value={alignV}
          options={[
            ['top', '⤒'],
            ['middle', '↕'],
            ['bottom', '⤓'],
          ]}
          titles={['Align top', 'Align middle', 'Align bottom']}
          onChange={(v) =>
            editDoc('Vertical align', (d) => applyToTexts(d, (dd, node) => patchNode(dd, node, { textAlignVertical: v })))
          }
        />
      </div>

      <Segmented<TextAutoResize>
        value={resize}
        options={[
          ['width', 'Auto W'],
          ['height', 'Auto H'],
          ['none', 'Fixed'],
        ]}
        titles={['Grow horizontally', 'Fixed width, grow down', 'Fixed size']}
        onChange={(v) =>
          editDoc('Text resizing', (d) => applyToTexts(d, (dd, node) => patchNode(dd, node, { autoResize: v })))
        }
      />
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  titles,
  onChange,
}: {
  value: T | null;
  options: ReadonlyArray<readonly [T, string]>;
  titles: readonly string[];
  onChange: (v: T) => void;
}): JSX.Element {
  return (
    <div className="segmented">
      {options.map(([v, label], i) => (
        <button
          key={v}
          className={`seg-btn${value === v ? ' is-active' : ''}`}
          title={titles[i]}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
