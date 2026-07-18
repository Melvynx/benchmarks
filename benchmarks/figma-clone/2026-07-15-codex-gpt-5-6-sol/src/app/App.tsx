import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";

import { exportPng, exportSvg } from "../core/export";
import { nodeWorldBounds, unionBounds } from "../core/geometry";
import { editorStore, useEditorStore } from "../core/store";
import type { Tool } from "../core/types";
import { EditorCanvas } from "../features/editor/EditorCanvas";
import { LayersPanel } from "../features/editor/LayersPanel";
import { PropertiesPanel } from "../features/editor/PropertiesPanel";
import { StatusBar } from "../features/editor/StatusBar";
import { Toolbar } from "../features/editor/Toolbar";
import { TopBar } from "../features/editor/TopBar";
import { Icon } from "../ui/Icon";

const toolShortcuts: Readonly<Record<string, Tool>> = {
  v: "select", f: "frame", r: "rectangle", o: "ellipse", l: "line", s: "star", t: "text", h: "hand", c: "comment",
};

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
}

function canvasSize(): { width: number; height: number } {
  const canvas = document.querySelector<HTMLCanvasElement>(".editor-canvas");
  return { width: canvas?.clientWidth ?? window.innerWidth, height: canvas?.clientHeight ?? window.innerHeight };
}

function fitSelection(): void {
  const state = editorStore.getState();
  const bounds = unionBounds(state.selection.flatMap((id) => state.document.nodes[id] ? [nodeWorldBounds(state.document.nodes[id], state.document.nodes)] : []));
  if (bounds) editorStore.fitToBounds(bounds, canvasSize());
}

function useEditorShortcuts(openCommands: () => void, openShortcuts: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) return;
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (modifier && key === "z") { event.preventDefault(); event.shiftKey ? editorStore.redo() : editorStore.undo(); return; }
      if (modifier && key === "a") { event.preventDefault(); editorStore.selectAll(); return; }
      if (modifier && key === "c") { event.preventDefault(); editorStore.copySelection(); return; }
      if (modifier && key === "x") { event.preventDefault(); editorStore.cutSelection(); return; }
      if (modifier && key === "v") { event.preventDefault(); editorStore.paste(); return; }
      if (modifier && key === "d") { event.preventDefault(); editorStore.duplicateSelection(); return; }
      if (modifier && key === "g") { event.preventDefault(); event.shiftKey ? editorStore.ungroupSelection() : editorStore.groupSelection(); return; }
      if (modifier && key === "0") { event.preventDefault(); editorStore.fitAll(canvasSize()); return; }
      if (modifier && key === "1") { event.preventDefault(); fitSelection(); return; }
      if (modifier && key === "/") { event.preventDefault(); openCommands(); return; }
      if (modifier && (key === "]" || key === "[")) {
        event.preventDefault();
        editorStore.moveLayerOrder(key === "]" ? (event.shiftKey ? "front" : "forward") : (event.shiftKey ? "back" : "backward"));
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); editorStore.removeSelection(); return; }
      if (event.key === "Escape") { editorStore.cancelPreview(); editorStore.setEditingText(null); editorStore.setTool("select"); return; }
      if (event.key === "?") { event.preventDefault(); openShortcuts(); return; }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        const state = editorStore.getState();
        const delta = { x: event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0, y: event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0 };
        editorStore.updateNodes("Nudge layers", Object.fromEntries(state.selection.flatMap((id) => state.document.nodes[id] ? [[id, { x: state.document.nodes[id].x + delta.x, y: state.document.nodes[id].y + delta.y }]] : [])));
        return;
      }
      const tool = toolShortcuts[key];
      if (tool && !modifier) editorStore.setTool(tool);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openCommands, openShortcuts]);
}

export function App() {
  const leftOpen = useEditorStore((state) => state.ui.leftPanelOpen);
  const rightOpen = useEditorStore((state) => state.ui.rightPanelOpen);
  const toast = useEditorStore((state) => state.ui.toast);
  const document = useEditorStore((state) => state.document);
  const selection = useEditorStore((state) => state.selection);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useEditorShortcuts(() => setCommandsOpen(true), () => setShortcutsOpen(true));

  useEffect(() => {
    const fitAll = (): void => editorStore.fitAll(canvasSize());
    const shortcuts = (): void => setShortcutsOpen(true);
    const exportFile = (event: Event): void => {
      const format = event instanceof CustomEvent && event.detail === "svg" ? "svg" : "png";
      const ids = selection.length ? selection : undefined;
      if (format === "svg") exportSvg(document, ids);
      else void exportPng(document, ids).catch((error: unknown) => editorStore.toast(error instanceof Error ? error.message : "Export failed"));
    };
    window.addEventListener("editor-fit-all", fitAll); window.addEventListener("editor-shortcuts", shortcuts); window.addEventListener("editor-export", exportFile);
    return () => { window.removeEventListener("editor-fit-all", fitAll); window.removeEventListener("editor-shortcuts", shortcuts); window.removeEventListener("editor-export", exportFile); };
  }, [document, selection]);

  return (
    <div className={`app-shell ${leftOpen ? "has-left" : ""} ${rightOpen ? "has-right" : ""}`}>
      <TopBar />
      <div className="workspace">
        {leftOpen ? <LayersPanel /> : <button className="panel-reopen left-reopen" aria-label="Open layers panel" onClick={() => editorStore.setUi({ leftPanelOpen: true })}><Icon name="layers" /></button>}
        <main className="canvas-area">
          <Toolbar />
          <EditorCanvas />
          <StatusBar />
          <button className="panel-toggle left-toggle" aria-label="Toggle layers panel" onClick={() => editorStore.setUi({ leftPanelOpen: !leftOpen })}><Icon name="chevron" size={14} /></button>
          <button className="panel-toggle right-toggle" aria-label="Toggle properties panel" onClick={() => editorStore.setUi({ rightPanelOpen: !rightOpen })}><Icon name="chevron" size={14} /></button>
        </main>
        {rightOpen ? <PropertiesPanel /> : <button className="panel-reopen right-reopen" aria-label="Open properties panel" onClick={() => editorStore.setUi({ rightPanelOpen: true })}><Icon name="menu" /></button>}
      </div>
      {toast ? <div className="toast"><Icon name="check" size={15} />{toast}</div> : null}
      {commandsOpen ? <CommandPalette onClose={() => setCommandsOpen(false)} /> : null}
      {shortcutsOpen ? <ShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
    </div>
  );
}

const commandGroups = [
  { title: "Create", actions: [{ label: "Frame", shortcut: "F", run: () => editorStore.setTool("frame") }, { label: "Rectangle", shortcut: "R", run: () => editorStore.setTool("rectangle") }, { label: "Text", shortcut: "T", run: () => editorStore.setTool("text") }] },
  { title: "Arrange", actions: [{ label: "Group selection", shortcut: "⌘G", run: editorStore.groupSelection }, { label: "Bring to front", shortcut: "⇧⌘]", run: () => editorStore.moveLayerOrder("front") }, { label: "Duplicate", shortcut: "⌘D", run: editorStore.duplicateSelection }] },
  { title: "View", actions: [{ label: "Fit all", shortcut: "⌘0", run: () => editorStore.fitAll(canvasSize()) }, { label: "Fit selection", shortcut: "⌘1", run: fitSelection }, { label: "Toggle grid", shortcut: "", run: () => { const state = editorStore.getState(); editorStore.setUi({ showGrid: !state.ui.showGrid }); } }] },
] as const;

function CommandPalette({ onClose }: { readonly onClose: () => void }) {
  const [query, setQuery] = useState("");
  const visible = commandGroups.map((group) => ({ ...group, actions: group.actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase())) })).filter((group) => group.actions.length);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="command-palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-search"><Icon name="search" /><input autoFocus placeholder="Search commands…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} /></div>
        <div className="command-list">{visible.map((group) => <div key={group.title}><span className="command-group-title">{group.title}</span>{group.actions.map((action) => <button key={action.label} onClick={() => { action.run(); onClose(); }}><span>{action.label}</span><kbd>{action.shortcut}</kbd></button>)}</div>)}</div>
        <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Run</span><span><kbd>esc</kbd> Close</span></div>
      </div>
    </div>
  );
}

function ShortcutsDialog({ onClose }: { readonly onClose: () => void }) {
  const groups = [
    ["Tools", [["Move", "V"], ["Frame", "F"], ["Shape", "R / O / L"], ["Text", "T"], ["Hand", "H"]]],
    ["Edit", [["Undo / redo", "⌘Z / ⇧⌘Z"], ["Copy / paste", "⌘C / ⌘V"], ["Duplicate", "⌘D"], ["Group / ungroup", "⌘G / ⇧⌘G"], ["Delete", "⌫"]]],
    ["View", [["Fit all", "⌘0"], ["Fit selection", "⌘1"], ["Quick actions", "⌘/"], ["Nudge", "↑ ↓ ← →"], ["Big nudge", "⇧ + arrows"]]],
  ] as const;
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="shortcuts-dialog" onMouseDown={(event) => event.stopPropagation()}><div className="dialog-heading"><div><span className="dialog-icon"><Icon name="sparkle" /></span><div><h2>Keyboard shortcuts</h2><p>Move faster without leaving the canvas.</p></div></div><button onClick={onClose}>×</button></div><div className="shortcut-groups">{groups.map(([title, items]) => <section key={title}><h3>{title}</h3>{items.map(([label, keys]) => <div key={label}><span>{label}</span><kbd>{keys}</kbd></div>)}</section>)}</div></div></div>;
}

interface ErrorBoundaryState { readonly hasError: boolean; readonly message: string; }

export class ErrorBoundary extends Component<{ readonly children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, message: "" };
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState { return { hasError: true, message: error instanceof Error ? error.message : "Unexpected editor error" }; }
  override componentDidCatch(error: Error, info: ErrorInfo): void { console.error("Editor boundary", error, info.componentStack); }
  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return <div className="fatal-error"><span className="fatal-logo">G</span><h1>GPT-5.6 Sol</h1><p>The editor hit an unexpected problem. Your latest saved version is still safe.</p><pre>{this.state.message}</pre><button onClick={() => window.location.reload()}>Reload editor</button></div>;
  }
}
