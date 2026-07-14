import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import {
  alignSelection,
  deleteSelection,
  distributeSelection,
  duplicateSelection,
  frameSelection,
  groupSelection,
  reorderSelection,
  selectAll,
  ungroupSelection,
} from '../store/actions';
import { copySelection, pastePayload } from '../store/clipboard';
import { redo, undo } from '../store/docEdit';
import { exportActiveDocumentJson, importDocumentFromFile, newDocument } from '../store/documents';
import { insertImageFiles } from '../store/images';
import { insertStressTest } from '../store/stress';
import {
  setPaletteOpen,
  setTool,
  toggleGrid,
  togglePanels,
  toggleRulers,
  useEditor,
  type ToolId,
} from '../store/store';
import { zoom100, zoomStep, zoomToFit, zoomToSelection } from '../store/viewport';
import { exportSelectionAsPng } from '../persistence/exportPng';
import { exportSelectionAsSvg } from '../persistence/exportSvg';
import { pickFile } from '../utils/download';

interface PaletteAction {
  title: string;
  section: string;
  shortcut?: string;
  keywords?: string;
  run: () => void;
}

function tool(title: string, id: ToolId, shortcut: string): PaletteAction {
  return { title, section: 'Tools', shortcut, run: () => setTool(id) };
}

function buildActions(): PaletteAction[] {
  return [
    tool('Move tool', 'select', 'V'),
    tool('Hand tool', 'hand', 'H'),
    tool('Frame tool', 'frame', 'F'),
    tool('Rectangle tool', 'rect', 'R'),
    tool('Ellipse tool', 'ellipse', 'O'),
    tool('Line tool', 'line', 'L'),
    tool('Polygon tool', 'polygon', 'P'),
    tool('Star tool', 'star', 'S'),
    tool('Text tool', 'text', 'T'),
    {
      title: 'Place image…',
      section: 'Tools',
      shortcut: '⇧⌘K',
      run: () => {
        void pickFile('image/*').then((f) => f && insertImageFiles([f]));
      },
    },
    { title: 'Undo', section: 'Edit', shortcut: '⌘Z', run: undo },
    { title: 'Redo', section: 'Edit', shortcut: '⇧⌘Z', run: redo },
    { title: 'Copy', section: 'Edit', shortcut: '⌘C', run: () => copySelection() },
    { title: 'Paste', section: 'Edit', shortcut: '⌘V', run: () => pastePayload() },
    { title: 'Duplicate', section: 'Edit', shortcut: '⌘D', run: () => duplicateSelection() },
    { title: 'Delete selection', section: 'Edit', shortcut: '⌫', run: deleteSelection },
    { title: 'Select all', section: 'Edit', shortcut: '⌘A', run: selectAll },
    { title: 'Group selection', section: 'Arrange', shortcut: '⌘G', run: groupSelection },
    { title: 'Ungroup', section: 'Arrange', shortcut: '⇧⌘G', run: ungroupSelection },
    { title: 'Frame selection', section: 'Arrange', shortcut: '⌥⌘G', run: frameSelection },
    { title: 'Bring to front', section: 'Arrange', shortcut: '⇧⌘]', run: () => reorderSelection('front') },
    { title: 'Bring forward', section: 'Arrange', shortcut: '⌘]', run: () => reorderSelection('forward') },
    { title: 'Send backward', section: 'Arrange', shortcut: '⌘[', run: () => reorderSelection('backward') },
    { title: 'Send to back', section: 'Arrange', shortcut: '⇧⌘[', run: () => reorderSelection('back') },
    { title: 'Align left', section: 'Arrange', run: () => alignSelection('left') },
    { title: 'Align horizontal centers', section: 'Arrange', run: () => alignSelection('center-h') },
    { title: 'Align right', section: 'Arrange', run: () => alignSelection('right') },
    { title: 'Align top', section: 'Arrange', run: () => alignSelection('top') },
    { title: 'Align vertical centers', section: 'Arrange', run: () => alignSelection('center-v') },
    { title: 'Align bottom', section: 'Arrange', run: () => alignSelection('bottom') },
    { title: 'Distribute horizontally', section: 'Arrange', run: () => distributeSelection('horizontal') },
    { title: 'Distribute vertically', section: 'Arrange', run: () => distributeSelection('vertical') },
    { title: 'Zoom in', section: 'View', shortcut: '⌘+', run: () => zoomStep(1) },
    { title: 'Zoom out', section: 'View', shortcut: '⌘−', run: () => zoomStep(-1) },
    { title: 'Zoom to 100%', section: 'View', shortcut: '⌘0', run: zoom100 },
    { title: 'Zoom to fit', section: 'View', shortcut: '⌘1', run: zoomToFit },
    { title: 'Zoom to selection', section: 'View', shortcut: '⌘2', run: zoomToSelection },
    { title: 'Toggle grid', section: 'View', shortcut: '⇧G', run: toggleGrid },
    { title: 'Toggle rulers', section: 'View', shortcut: '⇧R', run: toggleRulers },
    { title: 'Toggle panels', section: 'View', shortcut: '⌘\\', run: togglePanels },
    { title: 'New file', section: 'File', run: newDocument },
    { title: 'Export file as .json', section: 'File', run: exportActiveDocumentJson },
    {
      title: 'Import .json file…',
      section: 'File',
      run: () => {
        void pickFile('.json,application/json').then((f) => f && importDocumentFromFile(f));
      },
    },
    { title: 'Export selection as PNG (2x)', section: 'File', shortcut: '⇧⌘E', run: () => void exportSelectionAsPng(2) },
    { title: 'Export selection as SVG', section: 'File', run: () => exportSelectionAsSvg() },
    {
      title: 'Insert 1,120-node stress test',
      section: 'Developer',
      keywords: 'performance benchmark fps',
      run: insertStressTest,
    },
  ];
}

export function CommandPalette(): JSX.Element | null {
  const open = useEditor((s) => s.paletteOpen);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const actions = useMemo(buildActions, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return actions;
    return actions.filter((a) => {
      const haystack = `${a.title} ${a.section} ${a.keywords ?? ''}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }, [actions, query]);

  if (!open) return null;

  const run = (action: PaletteAction): void => {
    setPaletteOpen(false);
    action.run();
  };

  return (
    <div className="palette-backdrop" onPointerDown={() => setPaletteOpen(false)}>
      <div className="palette" onPointerDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette__input"
          placeholder="Search commands…"
          value={query}
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              const action = filtered[index];
              if (action) run(action);
            } else if (e.key === 'Escape') {
              setPaletteOpen(false);
            }
          }}
        />
        <div className="palette__list">
          {filtered.length === 0 && <div className="palette__empty">No matching commands</div>}
          {filtered.map((action, i) => (
            <button
              key={`${action.section}:${action.title}`}
              className={`palette__item${i === index ? ' is-active' : ''}`}
              onPointerEnter={() => setIndex(i)}
              onClick={() => run(action)}
            >
              <span className="palette__section">{action.section}</span>
              <span className="palette__title">{action.title}</span>
              {action.shortcut && <kbd>{action.shortcut}</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
