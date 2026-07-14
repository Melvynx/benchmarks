import { useMemo } from 'react';
import { useStore } from '../state/store';
import { AlignSection } from './sections/AlignSection';
import { EmptyInspector } from './sections/EmptyInspector';
import { PageProperties } from './sections/PageProperties';
import { TransformSection } from './sections/TransformSection';
import { LayerSection } from './sections/LayerSection';
import { FillsSection } from './sections/FillsSection';
import { StrokesSection } from './sections/StrokesSection';
import { EffectsSection } from './sections/EffectsSection';
import { TextSection } from './sections/TextSection';
import { FrameSection } from './sections/FrameSection';
import { PolygonSection } from './sections/PolygonSection';
import { StylesSection } from './sections/StylesSection';
import { isFrame, isPolygon, isText, isLine, isStyledShape } from '../core/scene';

export const RightPanel = (): JSX.Element => {
  const open = useStore((s) => s.rightPanelOpen);
  const doc = useStore((s) => s.doc);
  const selection = useStore((s) => s.selection);

  const selectedNodes = useMemo(
    () => selection.map((id) => doc.nodes[id]).filter((n): n is import('../core/scene').SceneNode => !!n),
    [selection, doc.nodes],
  );

  if (!open) return <div className="w-0" />;

  return (
    <div
      className="w-60 bg-panel-bg border-l border-panel-divider flex flex-col chrome-no-select"
      style={{ zIndex: 20 }}
    >
      <div className="flex-1 overflow-auto no-focus-ring" tabIndex={0}>
        {selection.length === 0 ? (
          <>
            <PageProperties />
            <StylesSection />
            <EmptyInspector />
          </>
        ) : (
          <>
            <TransformSection />
            <LayerSection />
            {(() => {
              const first = selectedNodes[0];
              if (!first) return null;
              return (
                <>
                  {isFrame(first) && <FrameSection />}
                  {isPolygon(first) && <PolygonSection />}
                  {isText(first) && <TextSection />}
                  {!isLine(first) && isStyledShape(first) && <FillsSection />}
                  {isText(first) && <TextFillsSection />}
                  <StrokesSection />
                  <EffectsSection />
                  <AlignSection />
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

// Text uses a single color field; hoist into its own (simple) section.
import { updateNodes } from '../state/actions';
import { ColorSwatch } from './ColorSwatch';

const TextFillsSection = (): JSX.Element => {
  const selection = useStore((s) => s.selection);
  const first = useStore((s) => s.doc.nodes[selection[0] ?? '']);
  if (!first || first.type !== 'text') return <></>;
  return (
    <div className="panel-section">
      <div className="panel-section-title">Color</div>
      <div className="flex items-center gap-1.5">
        <ColorSwatch
          color={first.color}
          opacity={1}
          onChange={(c) => {
            updateNodes(
              selection,
              (n) => {
                if (n.type === 'text') n.color = c;
              },
              'Text color',
            );
          }}
        />
        <div className="text-xs text-text-secondary tabular-nums">{first.color.toUpperCase()}</div>
      </div>
    </div>
  );
};
