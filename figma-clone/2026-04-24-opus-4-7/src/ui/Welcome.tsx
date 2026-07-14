import { useStore } from '../state/store';
import {
  createFrame,
  createRectangle,
  createText,
  createEllipse,
  solidPaint,
} from '../core/scene';
import { addNodes } from '../state/actions';

export const Welcome = ({ onClose }: { onClose: () => void }): JSX.Element => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-40 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-panel-bg border border-panel-divider rounded-lg p-8 w-[520px] max-w-[90vw] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <svg viewBox="0 0 32 32" width={32} height={32}>
            <rect x="4" y="4" width="11" height="11" rx="2" fill="#0d99ff" />
            <rect x="17" y="4" width="11" height="11" rx="2" fill="#ff3b30" />
            <rect x="4" y="17" width="11" height="11" rx="2" fill="#34c759" />
            <circle cx="22.5" cy="22.5" r="5.5" fill="#ffcc00" />
          </svg>
          <div>
            <div className="text-lg font-semibold">Welcome to Vector</div>
            <div className="text-xs text-text-secondary">A minimal Figma-like design tool</div>
          </div>
        </div>
        <div className="text-sm text-text-secondary space-y-2 mb-6">
          <div>
            Draw shapes with the toolbar, or press <Kbd>R</Kbd> rectangle, <Kbd>O</Kbd> ellipse,{' '}
            <Kbd>F</Kbd> frame, <Kbd>T</Kbd> text, <Kbd>L</Kbd> line.
          </div>
          <div>
            <Kbd>V</Kbd> select · <Kbd>Space</Kbd> drag to pan · <Kbd>⌘/Ctrl</Kbd>+scroll to zoom ·{' '}
            <Kbd>⌘Z</Kbd> undo
          </div>
          <div>Drop or paste images to add them to the canvas.</div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 bg-panel-bgRaised hover:bg-[#3a3a3a] text-text-primary text-sm rounded py-2"
            onClick={() => onClose()}
          >
            Start from blank
          </button>
          <button
            className="flex-1 bg-accent hover:bg-accent-hover text-white text-sm rounded py-2"
            onClick={() => {
              seedDemo();
              onClose();
            }}
          >
            Try the demo
          </button>
        </div>
      </div>
    </div>
  );
};

const Kbd = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 bg-panel-bgRaised rounded text-xxs font-mono mx-0.5">
    {children}
  </kbd>
);

const seedDemo = (): void => {
  const frame = createFrame({
    parentId: null,
    x: 80,
    y: 60,
    width: 560,
    height: 360,
    name: 'Hero',
    fills: [solidPaint('#111111', 1)],
    cornerRadius: 12,
  });
  const title = createText({
    parentId: frame.id,
    x: 32,
    y: 32,
    text: 'Design, faster.',
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 42,
    color: '#ffffff',
    width: 496,
    height: 52,
    autoWidth: false,
  });
  const sub = createText({
    parentId: frame.id,
    x: 32,
    y: 92,
    text: 'A canvas, a few tools, and a lot of keyboard shortcuts.',
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 16,
    color: '#b3b3b3',
    width: 496,
    height: 24,
    autoWidth: false,
  });
  const cta = createRectangle({
    parentId: frame.id,
    x: 32,
    y: 140,
    width: 140,
    height: 40,
    fills: [solidPaint('#0d99ff', 1)],
    cornerRadius: 20,
  });
  const ctaLabel = createText({
    parentId: frame.id,
    x: 32,
    y: 152,
    text: 'Get started →',
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 14,
    color: '#ffffff',
    width: 140,
    height: 16,
    textAlign: 'center',
    autoWidth: false,
  });

  const circle = createEllipse({
    parentId: frame.id,
    x: 400,
    y: 220,
    width: 120,
    height: 120,
    fills: [
      {
        type: 'radial',
        cx: 0.35,
        cy: 0.35,
        radius: 0.75,
        stops: [
          { offset: 0, color: '#ff6aa0', opacity: 1 },
          { offset: 1, color: '#0d99ff', opacity: 1 },
        ],
        opacity: 1,
      },
    ],
    effects: [
      {
        type: 'dropShadow',
        offsetX: 0,
        offsetY: 12,
        blur: 40,
        spread: 0,
        color: '#0d99ff',
        opacity: 0.4,
        visible: true,
      },
    ],
  });

  const card = createFrame({
    parentId: null,
    x: 700,
    y: 80,
    width: 220,
    height: 300,
    name: 'Card',
    fills: [solidPaint('#1a1a1a', 1)],
    strokes: [
      {
        paint: solidPaint('#333333', 1),
        width: 1,
        align: 'inside',
        dash: [],
      },
    ],
    cornerRadius: 16,
  });
  const cardTitle = createText({
    parentId: card.id,
    x: 16,
    y: 20,
    text: 'Selection · Ideal',
    fontFamily: 'Inter',
    fontWeight: 600,
    fontSize: 14,
    color: '#ffffff',
    width: 188,
    height: 16,
    autoWidth: false,
  });
  useStore.getState().mutate('Seed', (doc) => {
    // Parent ids are already set
    doc.nodes[frame.id] = { ...frame, children: [title.id, sub.id, cta.id, ctaLabel.id, circle.id] };
    doc.nodes[title.id] = title;
    doc.nodes[sub.id] = sub;
    doc.nodes[cta.id] = cta;
    doc.nodes[ctaLabel.id] = ctaLabel;
    doc.nodes[circle.id] = circle;
    doc.nodes[card.id] = { ...card, children: [cardTitle.id] };
    doc.nodes[cardTitle.id] = cardTitle;
    const page = doc.pages[doc.currentPageId];
    if (page) {
      page.children.push(frame.id, card.id);
      page.background = '#0f0f10';
    }
  });
};

// silence unused
void addNodes;
