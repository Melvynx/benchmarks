import { useRef, useState, type JSX } from 'react';
import { getHistory, redo, undo } from '../store/docEdit';
import {
  deleteDocument,
  duplicateActiveDocument,
  exportActiveDocumentJson,
  importDocumentFromFile,
  newDocument,
  renameActiveDocument,
  switchDocument,
} from '../store/documents';
import { insertImageFiles } from '../store/images';
import { setTool, useEditor, type ToolId } from '../store/store';
import { zoom100, zoomStep, zoomToFit, zoomToSelection } from '../store/viewport';
import { pickFile } from '../utils/download';
import { Popover } from './controls/Popover';
import {
  IChevronDown,
  IEllipse,
  IFrame,
  IHand,
  IImage,
  ILine,
  ILogo,
  IMove,
  IPolygon,
  IRect,
  IRedo,
  IStar,
  IText,
  IUndo,
} from './icons';

const SHAPE_TOOLS: Array<{ id: ToolId; label: string; shortcut: string; icon: JSX.Element }> = [
  { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: <IRect /> },
  { id: 'line', label: 'Line', shortcut: 'L', icon: <ILine /> },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: <IEllipse /> },
  { id: 'polygon', label: 'Polygon', shortcut: 'P', icon: <IPolygon /> },
  { id: 'star', label: 'Star', shortcut: 'S', icon: <IStar /> },
];

export function TopBar(): JSX.Element {
  const tool = useEditor((s) => s.tool);
  const historyVersion = useEditor((s) => s.historyVersion);
  void historyVersion; // re-render when history changes
  const history = getHistory();

  return (
    <header className="topbar">
      <div className="topbar__left">
        <FileMenu />
        <div className="topbar__tools">
          <ToolButton id="select" current={tool} title="Move — V" icon={<IMove />} />
          <ToolButton id="frame" current={tool} title="Frame — F" icon={<IFrame />} />
          <ShapeDropdown current={tool} />
          <ToolButton id="text" current={tool} title="Text — T" icon={<IText />} />
          <ToolButton id="hand" current={tool} title="Hand — H" icon={<IHand />} />
        </div>
      </div>

      <DocName />

      <div className="topbar__right">
        <button
          className="icon-btn topbar-icon"
          title={history.undoLabel ? `Undo ${history.undoLabel} — ⌘Z` : 'Undo — ⌘Z'}
          disabled={!history.canUndo}
          onClick={undo}
        >
          <IUndo />
        </button>
        <button
          className="icon-btn topbar-icon"
          title={history.redoLabel ? `Redo ${history.redoLabel} — ⇧⌘Z` : 'Redo — ⇧⌘Z'}
          disabled={!history.canRedo}
          onClick={redo}
        >
          <IRedo />
        </button>
        <ZoomMenu />
      </div>
    </header>
  );
}

function ToolButton({
  id,
  current,
  title,
  icon,
}: {
  id: ToolId;
  current: ToolId;
  title: string;
  icon: JSX.Element;
}): JSX.Element {
  return (
    <button className={`tool-btn${current === id ? ' is-active' : ''}`} title={title} onClick={() => setTool(id)}>
      {icon}
    </button>
  );
}

function ShapeDropdown({ current }: { current: ToolId }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = SHAPE_TOOLS.find((s) => s.id === current);

  return (
    <div className="shape-dropdown" ref={ref}>
      <button
        className={`tool-btn${active ? ' is-active' : ''}`}
        title="Shape tools"
        onClick={() => setTool(active ? active.id : 'rect')}
      >
        {active ? active.icon : <IRect />}
      </button>
      <button className="tool-btn tool-btn--chevron" onClick={() => setOpen(true)} title="More shapes">
        <IChevronDown size={9} />
      </button>
      {open && ref.current && (
        <Popover anchor={ref.current.getBoundingClientRect()} onClose={() => setOpen(false)} side="bottom" width={196}>
          <div className="menu">
            {SHAPE_TOOLS.map((shape) => (
              <button
                key={shape.id}
                className="menu-item"
                onClick={() => {
                  setTool(shape.id);
                  setOpen(false);
                }}
              >
                <span className="menu-item__icon">{shape.icon}</span>
                {shape.label}
                <kbd>{shape.shortcut}</kbd>
              </button>
            ))}
            <button
              className="menu-item"
              onClick={async () => {
                setOpen(false);
                const file = await pickFile('image/*');
                if (file) await insertImageFiles([file]);
              }}
            >
              <span className="menu-item__icon">
                <IImage />
              </span>
              Place image…
              <kbd>⇧⌘K</kbd>
            </button>
          </div>
        </Popover>
      )}
    </div>
  );
}

function FileMenu(): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const docList = useEditor((s) => s.docList);
  const docId = useEditor((s) => s.docId);

  const close = (): void => setOpen(false);

  return (
    <>
      <button ref={ref} className="logo-btn" onClick={() => setOpen(true)} title="File menu">
        <ILogo size={18} />
        <IChevronDown size={9} />
      </button>
      {open && ref.current && (
        <Popover anchor={ref.current.getBoundingClientRect()} onClose={close} side="bottom" width={240}>
          <div className="menu">
            <button
              className="menu-item"
              onClick={() => {
                newDocument();
                close();
              }}
            >
              New file
            </button>
            <button
              className="menu-item"
              onClick={() => {
                duplicateActiveDocument();
                close();
              }}
            >
              Duplicate file
            </button>
            <div className="menu-sep" />
            {docList.length > 0 && <div className="menu-label">Open file</div>}
            {docList.slice(0, 8).map((meta) => (
              <button
                key={meta.id}
                className={`menu-item${meta.id === docId ? ' is-active' : ''}`}
                onClick={() => {
                  switchDocument(meta.id);
                  close();
                }}
              >
                {meta.name}
                {meta.id === docId && <span className="menu-item__check">✓</span>}
              </button>
            ))}
            <div className="menu-sep" />
            <button
              className="menu-item"
              onClick={async () => {
                close();
                const file = await pickFile('.json,application/json');
                if (file) await importDocumentFromFile(file);
              }}
            >
              Import .json…
            </button>
            <button
              className="menu-item"
              onClick={() => {
                exportActiveDocumentJson();
                close();
              }}
            >
              Export .json
            </button>
            <div className="menu-sep" />
            <button
              className="menu-item is-danger"
              disabled={docList.length === 0}
              onClick={() => {
                deleteDocument(docId);
                close();
              }}
            >
              Delete file
            </button>
          </div>
        </Popover>
      )}
    </>
  );
}

function DocName(): JSX.Element {
  const docName = useEditor((s) => s.docName);
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        className="docname-input"
        autoFocus
        defaultValue={docName}
        spellCheck={false}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            (e.target as HTMLInputElement).value = docName;
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value.trim() !== '' && e.target.value !== docName) renameActiveDocument(e.target.value);
        }}
      />
    );
  }
  return (
    <button className="docname" onDoubleClick={() => setEditing(true)} title="Double-click to rename">
      {docName}
    </button>
  );
}

function ZoomMenu(): JSX.Element {
  const zoom = useEditor((s) => s.viewport.zoom);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const run = (fn: () => void): void => {
    fn();
    setOpen(false);
  };
  return (
    <>
      <button ref={ref} className="zoom-btn" onClick={() => setOpen(true)} title="Zoom options">
        {Math.round(zoom * 100)}% <IChevronDown size={9} />
      </button>
      {open && ref.current && (
        <Popover anchor={ref.current.getBoundingClientRect()} onClose={() => setOpen(false)} side="bottom" width={220}>
          <div className="menu">
            <button className="menu-item" onClick={() => run(() => zoomStep(1))}>
              Zoom in <kbd>⌘+</kbd>
            </button>
            <button className="menu-item" onClick={() => run(() => zoomStep(-1))}>
              Zoom out <kbd>⌘−</kbd>
            </button>
            <button className="menu-item" onClick={() => run(zoom100)}>
              Zoom to 100% <kbd>⌘0</kbd>
            </button>
            <button className="menu-item" onClick={() => run(zoomToFit)}>
              Zoom to fit <kbd>⌘1</kbd>
            </button>
            <button className="menu-item" onClick={() => run(zoomToSelection)}>
              Zoom to selection <kbd>⌘2</kbd>
            </button>
          </div>
        </Popover>
      )}
    </>
  );
}
