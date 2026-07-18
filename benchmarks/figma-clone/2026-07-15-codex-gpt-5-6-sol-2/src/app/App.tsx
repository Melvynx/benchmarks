import {
  ArrowDown,
  ArrowUp,
  BringToFront,
  Circle,
  Copy,
  CopyPlus,
  Download,
  FileJson2,
  Frame,
  Grid3X3,
  Group,
  Hand,
  Layers3,
  Magnet,
  Maximize2,
  Minus,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Redo2,
  Ruler,
  SendToBack,
  Square,
  Star,
  Trash2,
  Type,
  Undo2,
  Ungroup,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createSceneDocument } from '@/core/model';
import { CanvasStage } from '@/editor/CanvasStage';
import { EditorStore, useCanvasSnapshot, useEditorSnapshot } from '@/editor/EditorStore';
import {
  downloadSceneDocumentJson,
  downloadSceneDocumentPng,
  downloadSceneDocumentSvg,
  parseSceneDocumentJson,
} from '@/editor/export';
import { LocalDocumentRepository } from '@/editor/persistence';
import { createSeedDocument } from '@/editor/seedDocument';
import { useEditorShortcuts } from '@/editor/useEditorShortcuts';
import { CommandPalette } from '@/ui/CommandPalette';
import { ContextMenu } from '@/ui/ContextMenu';
import { ExportDialog } from '@/ui/ExportDialog';
import { MainMenu } from '@/ui/MainMenu';
import { PreviewModal } from '@/ui/PreviewModal';
import { StatusBar } from '@/ui/StatusBar';
import { TopBar } from '@/ui/TopBar';
import { LayersPanel, PropertiesPanel } from '@/ui/panels';
import { ToastViewport } from '@/ui/primitives';

import { alignEditorNodes } from './editorOperations';
import { useWorkspacePersistence } from './useWorkspacePersistence';

import type { Vec2 } from '@/core/geometry';
import type { SceneNode } from '@/core/model';
import type { ExportFormat, ExportScope } from '@/ui/ExportDialog';
import type { CommandAction } from '@/ui/CommandPalette';
import type { ContextActionId } from '@/ui/ContextMenu';
import type { MainMenuAction } from '@/ui/MainMenu';
import type { AlignmentAction, DocumentPropertyChanges, PropertyExportRequest } from '@/ui/panels';
import type { EditorShortcutActions } from '@/editor/useEditorShortcuts';
import type { DocumentManifestEntry } from '@/editor/persistence';

interface WorkspaceBootstrap {
  readonly repository: LocalDocumentRepository;
  readonly document: ReturnType<typeof createSeedDocument>;
  readonly documents: readonly DocumentManifestEntry[];
  readonly loadError: string | null;
}

interface ContextPoint {
  readonly x: number;
  readonly y: number;
}

function loadWorkspace(): WorkspaceBootstrap {
  const repository = new LocalDocumentRepository();
  const activeResult = repository.loadActiveDocument();
  const manifestResult = repository.listDocuments();
  const document =
    activeResult.ok && activeResult.value ? activeResult.value : createSeedDocument();
  const loadError = activeResult.ok ? null : activeResult.error.message;
  return {
    repository,
    document,
    documents: manifestResult.ok ? manifestResult.value : [],
    loadError,
  };
}

function isTextEntryTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function unavailable(available: boolean, reason: string) {
  return available ? {} : { disabledReason: reason };
}

function ConnectedStatusBar({ store }: { readonly store: EditorStore }) {
  const snapshot = useCanvasSnapshot(store);
  return (
    <StatusBar
      cursorWorld={snapshot.session.cursorWorld}
      activeTool={snapshot.session.activeTool}
      selectedCount={snapshot.session.selectedIds.size}
      nodeCount={snapshot.runtime.nodeCount}
      isSnappingEnabled={snapshot.session.isSnappingEnabled}
      isGridVisible={snapshot.session.isGridVisible}
    />
  );
}

export function App() {
  const [workspace] = useState<WorkspaceBootstrap>(loadWorkspace);
  const [store] = useState(() => new EditorStore(workspace.document));
  const snapshot = useEditorSnapshot(store);
  const [documents, setDocuments] = useState(workspace.documents);
  const [isMainMenuOpen, setMainMenuOpen] = useState(false);
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [isExportOpen, setExportOpen] = useState(false);
  const [contextPoint, setContextPoint] = useState<ContextPoint | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const updateManifest = useCallback(
    (nextDocuments: readonly DocumentManifestEntry[]) => setDocuments(nextDocuments),
    [],
  );
  useWorkspacePersistence({
    store,
    repository: workspace.repository,
    initialLoadError: workspace.loadError,
    onManifestChange: updateManifest,
  });

  const refreshDocuments = useCallback(() => {
    const result = workspace.repository.listDocuments();
    if (result.ok) setDocuments(result.value);
  }, [workspace.repository]);

  const saveCurrentDocument = useCallback(() => {
    const result = workspace.repository.saveDocument(store.document);
    if (!result.ok) store.addToast(result.error.message, 'error');
    return result.ok;
  }, [store, workspace.repository]);

  const createNewDocument = useCallback(() => {
    if (!saveCurrentDocument()) return;
    const document = createSceneDocument({
      name: 'Untitled',
      background: { r: 0.12, g: 0.125, b: 0.145, a: 1 },
    });
    store.replaceDocument(document);
    const saved = workspace.repository.saveDocument(document);
    if (saved.ok) {
      store.markSaved();
      store.addToast('New document created', 'success');
      refreshDocuments();
    } else {
      store.markSaveError(saved.error.message);
      store.addToast(saved.error.message, 'error');
    }
  }, [refreshDocuments, saveCurrentDocument, store, workspace.repository]);

  const openDocument = useCallback(
    (documentId: string) => {
      if (documentId === store.document.id || !saveCurrentDocument()) return;
      const result = workspace.repository.loadDocument(documentId);
      if (!result.ok) {
        store.addToast(result.error.message, 'error');
        return;
      }
      if (!result.value) {
        store.addToast('That local document no longer exists.', 'error');
        refreshDocuments();
        return;
      }
      store.replaceDocument(result.value);
      workspace.repository.setActiveDocument(result.value.id);
      store.markSaved();
      store.addToast(`Opened ${result.value.name}`, 'success');
      window.requestAnimationFrame(() => store.fitAll());
    },
    [refreshDocuments, saveCurrentDocument, store, workspace.repository],
  );

  const requestImport = useCallback(() => importInputRef.current?.click(), []);

  const importJsonFile = useCallback(
    async (file: File) => {
      try {
        const source = await file.text();
        const parsed = parseSceneDocumentJson(source);
        if (!parsed.ok) {
          store.addToast(parsed.error.message, 'error');
          return;
        }
        if (!saveCurrentDocument()) return;
        store.replaceDocument(parsed.value);
        const saved = workspace.repository.saveDocument(parsed.value);
        if (!saved.ok) {
          store.markSaveError(saved.error.message);
          store.addToast(saved.error.message, 'error');
          return;
        }
        store.markSaved();
        store.addToast(`Imported ${file.name}`, 'success');
        refreshDocuments();
        window.requestAnimationFrame(() => store.fitAll());
      } catch (error: unknown) {
        store.addToast(
          error instanceof Error ? error.message : 'The JSON file could not be read.',
          'error',
        );
      }
    },
    [refreshDocuments, saveCurrentDocument, store, workspace.repository],
  );

  const exportDocument = useCallback(
    async (format: ExportFormat, scope: ExportScope, scale: number) => {
      const sourceDocument = store.document;
      const renderedDocument = store.getSnapshot().runtime.document;
      const nodeIds = scope === 'selection' ? [...store.session.selectedIds] : undefined;
      const svgOptions = nodeIds ? { nodeIds } : { includeBackground: true };
      const result =
        format === 'json'
          ? downloadSceneDocumentJson(sourceDocument)
          : format === 'svg'
            ? downloadSceneDocumentSvg(renderedDocument, svgOptions)
            : await downloadSceneDocumentPng(renderedDocument, { ...svgOptions, scale });
      if (!result.ok) {
        store.addToast(result.error.message, 'error');
        return;
      }
      store.addToast(`${format.toUpperCase()} export started`, 'success');
    },
    [store],
  );

  const handlePropertyExport = useCallback(
    (request: PropertyExportRequest) => {
      if (request.format === 'json') {
        void exportDocument('json', 'document', 1);
      } else {
        void exportDocument(request.format, 'selection', 2);
      }
    },
    [exportDocument],
  );

  const setNodeVisibility = useCallback(
    (nodeId: string, visible: boolean) => {
      const node = store.document.nodes[nodeId];
      if (!node || node.visible === visible) return;
      store.toggleNodeVisibility(nodeId);
    },
    [store],
  );

  const setNodeLocked = useCallback(
    (nodeId: string, locked: boolean) => {
      const node = store.document.nodes[nodeId];
      if (!node || node.locked === locked) return;
      store.toggleNodeLock(nodeId);
    },
    [store],
  );

  const alignNodes = useCallback(
    (action: AlignmentAction, nodeIds: readonly string[]) =>
      alignEditorNodes(store, action, nodeIds),
    [store],
  );

  const changeDocumentProperties = useCallback(
    (changes: DocumentPropertyChanges, label: string) => store.updateDocument(changes, label),
    [store],
  );

  const closeTransientUi = useCallback(() => {
    setMainMenuOpen(false);
    setPreviewOpen(false);
    setExportOpen(false);
    setContextPoint(null);
    store.setCommandPaletteOpen(false);
    store.clearRenderPreview();
    store.setTool('move');
  }, [store]);

  const shortcutActions = useMemo<EditorShortcutActions>(
    () => ({
      setTool: (tool) => store.setTool(tool),
      undo: () => store.undo(),
      redo: () => store.redo(),
      copy: () => store.copySelection(),
      cut: () => store.cutSelection(),
      duplicate: () => store.duplicateSelection(),
      selectAll: () => store.selectAll(),
      group: () => store.groupSelection(),
      ungroup: () => store.ungroupSelection(),
      order: (direction) => store.reorderSelection(direction),
      deleteSelection: () => store.deleteSelection(),
      nudge: (x, y) => store.nudgeSelection(x, y),
      fitAll: () => store.fitAll(),
      zoomToOne: () => {
        const { viewport, camera } = store.session;
        store.zoomAt(viewport.width / 2, viewport.height / 2, 1);
        if (!Number.isFinite(camera.zoom)) store.setCamera({ x: 0, y: 0, zoom: 1 });
      },
      fitSelection: () => store.fitSelection(),
      toggleGrid: () => store.toggleGrid(),
      toggleRulers: () => store.toggleRulers(),
      openCommandPalette: () => store.setCommandPaletteOpen(true),
      escape: closeTransientUi,
    }),
    [closeTransientUi, store],
  );
  useEditorShortcuts(shortcutActions);

  useEffect(() => {
    const handleFileShortcut = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target) || !(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLocaleLowerCase();
      if (key === 'n' && !event.shiftKey) {
        event.preventDefault();
        createNewDocument();
      } else if (key === 'o' && event.shiftKey) {
        event.preventDefault();
        requestImport();
      } else if (key === 'e' && event.shiftKey) {
        event.preventDefault();
        setExportOpen(true);
      }
    };
    window.addEventListener('keydown', handleFileShortcut);
    return () => window.removeEventListener('keydown', handleFileShortcut);
  }, [createNewDocument, requestImport]);

  const handleContextMenuRequest = useCallback(
    (screenPoint: Vec2, worldPoint: Vec2) => {
      const current = store.getSnapshot();
      const hit = current.runtime.hitTest(worldPoint, 4 / current.session.camera.zoom);
      if (hit && !current.session.selectedIds.has(hit.id)) store.select(hit.id);
      setContextPoint({ x: screenPoint.x, y: screenPoint.y });
    },
    [store],
  );

  const handleContextAction = useCallback(
    (action: ContextActionId) => {
      const firstSelectedId = [...store.session.selectedIds][0];
      switch (action) {
        case 'cut':
          store.cutSelection();
          break;
        case 'copy':
          store.copySelection();
          break;
        case 'paste':
          store.paste();
          break;
        case 'duplicate':
          store.duplicateSelection();
          break;
        case 'group':
          store.groupSelection();
          break;
        case 'ungroup':
          store.ungroupSelection();
          break;
        case 'front':
          store.reorderSelection('front');
          break;
        case 'back':
          store.reorderSelection('back');
          break;
        case 'toggle-visibility':
          if (firstSelectedId) store.toggleNodeVisibility(firstSelectedId);
          break;
        case 'toggle-lock':
          if (firstSelectedId) store.toggleNodeLock(firstSelectedId);
          break;
        case 'export-svg':
          void exportDocument('svg', 'selection', 1);
          break;
        case 'delete':
          store.deleteSelection();
          break;
      }
    },
    [exportDocument, store],
  );

  const handleMainMenuAction = useCallback(
    (action: MainMenuAction) => {
      switch (action) {
        case 'new-document':
          createNewDocument();
          break;
        case 'import-json':
          requestImport();
          break;
        case 'export':
          setExportOpen(true);
          break;
        case 'command-palette':
          store.setCommandPaletteOpen(true);
          break;
        case 'toggle-grid':
          store.toggleGrid();
          break;
        case 'toggle-rulers':
          store.toggleRulers();
          break;
        case 'toggle-snapping':
          store.toggleSnapping();
          break;
        case 'toggle-left-panel':
          store.toggleLeftPanel();
          break;
        case 'toggle-right-panel':
          store.toggleRightPanel();
          break;
      }
    },
    [createNewDocument, requestImport, store],
  );

  const hasSelection = snapshot.session.selectedIds.size > 0;
  const canUngroup = [...snapshot.session.selectedIds].some(
    (nodeId) => snapshot.document.nodes[nodeId]?.type === 'group',
  );
  const selectionUnavailable = unavailable(hasSelection, 'Select at least one layer');
  const multipleUnavailable = unavailable(
    snapshot.session.selectedIds.size > 1,
    'Select two or more layers',
  );
  const commandActions: readonly CommandAction[] = [
    {
      id: 'tool-move',
      label: 'Move tool',
      group: 'Tools',
      shortcut: 'V',
      icon: MousePointer2,
      run: () => store.setTool('move'),
    },
    {
      id: 'tool-frame',
      label: 'Frame tool',
      group: 'Tools',
      shortcut: 'F',
      icon: Frame,
      run: () => store.setTool('frame'),
    },
    {
      id: 'tool-rectangle',
      label: 'Rectangle tool',
      group: 'Tools',
      shortcut: 'R',
      icon: Square,
      run: () => store.setTool('rectangle'),
    },
    {
      id: 'tool-ellipse',
      label: 'Ellipse tool',
      group: 'Tools',
      shortcut: 'O',
      icon: Circle,
      run: () => store.setTool('ellipse'),
    },
    {
      id: 'tool-line',
      label: 'Line tool',
      group: 'Tools',
      shortcut: 'L',
      icon: Minus,
      run: () => store.setTool('line'),
    },
    {
      id: 'tool-star',
      label: 'Star tool',
      group: 'Tools',
      shortcut: '⇧S',
      icon: Star,
      run: () => store.setTool('star'),
    },
    {
      id: 'tool-text',
      label: 'Text tool',
      group: 'Tools',
      shortcut: 'T',
      icon: Type,
      run: () => store.setTool('text'),
    },
    {
      id: 'tool-hand',
      label: 'Hand tool',
      group: 'Tools',
      shortcut: 'H',
      icon: Hand,
      run: () => store.setTool('hand'),
    },
    {
      id: 'undo',
      label: 'Undo',
      group: 'Recent',
      shortcut: '⌘Z',
      icon: Undo2,
      ...unavailable(snapshot.history.canUndo, 'Nothing to undo'),
      run: () => store.undo(),
    },
    {
      id: 'redo',
      label: 'Redo',
      group: 'Recent',
      shortcut: '⇧⌘Z',
      icon: Redo2,
      ...unavailable(snapshot.history.canRedo, 'Nothing to redo'),
      run: () => store.redo(),
    },
    {
      id: 'duplicate',
      label: 'Duplicate selection',
      group: 'Selection',
      shortcut: '⌘D',
      icon: CopyPlus,
      ...selectionUnavailable,
      run: () => store.duplicateSelection(),
    },
    {
      id: 'copy',
      label: 'Copy selection',
      group: 'Selection',
      shortcut: '⌘C',
      icon: Copy,
      ...selectionUnavailable,
      run: () => store.copySelection(),
    },
    {
      id: 'group',
      label: 'Group selection',
      group: 'Selection',
      shortcut: '⌘G',
      icon: Group,
      ...selectionUnavailable,
      run: () => store.groupSelection(),
    },
    {
      id: 'ungroup',
      label: 'Ungroup selection',
      group: 'Selection',
      shortcut: '⇧⌘G',
      icon: Ungroup,
      ...unavailable(canUngroup, 'Select a group'),
      run: () => store.ungroupSelection(),
    },
    {
      id: 'delete',
      label: 'Delete selection',
      group: 'Selection',
      shortcut: '⌫',
      icon: Trash2,
      ...selectionUnavailable,
      run: () => store.deleteSelection(),
    },
    {
      id: 'bring-forward',
      label: 'Bring forward',
      group: 'Arrange',
      shortcut: '⌘]',
      icon: ArrowUp,
      ...selectionUnavailable,
      run: () => store.reorderSelection('forward'),
    },
    {
      id: 'bring-front',
      label: 'Bring to front',
      group: 'Arrange',
      shortcut: '⇧⌘]',
      icon: BringToFront,
      ...selectionUnavailable,
      run: () => store.reorderSelection('front'),
    },
    {
      id: 'send-backward',
      label: 'Send backward',
      group: 'Arrange',
      shortcut: '⌘[',
      icon: ArrowDown,
      ...selectionUnavailable,
      run: () => store.reorderSelection('backward'),
    },
    {
      id: 'send-back',
      label: 'Send to back',
      group: 'Arrange',
      shortcut: '⇧⌘[',
      icon: SendToBack,
      ...selectionUnavailable,
      run: () => store.reorderSelection('back'),
    },
    {
      id: 'align-left',
      label: 'Align left',
      group: 'Arrange',
      icon: Layers3,
      ...multipleUnavailable,
      run: () => alignNodes('align-left', [...store.session.selectedIds]),
    },
    {
      id: 'fit-all',
      label: 'Zoom to fit',
      group: 'View',
      shortcut: '⌘0',
      icon: Maximize2,
      run: () => store.fitAll(),
    },
    {
      id: 'toggle-grid',
      label: snapshot.session.isGridVisible ? 'Hide grid' : 'Show grid',
      group: 'View',
      shortcut: '⇧G',
      icon: Grid3X3,
      run: () => store.toggleGrid(),
    },
    {
      id: 'toggle-rulers',
      label: snapshot.session.areRulersVisible ? 'Hide rulers' : 'Show rulers',
      group: 'View',
      shortcut: '⇧R',
      icon: Ruler,
      run: () => store.toggleRulers(),
    },
    {
      id: 'toggle-snap',
      label: snapshot.session.isSnappingEnabled ? 'Disable snapping' : 'Enable snapping',
      group: 'View',
      icon: Magnet,
      run: () => store.toggleSnapping(),
    },
    {
      id: 'toggle-left',
      label: snapshot.session.isLeftPanelOpen ? 'Hide layers panel' : 'Show layers panel',
      group: 'View',
      icon: PanelLeft,
      run: () => store.toggleLeftPanel(),
    },
    {
      id: 'toggle-right',
      label: snapshot.session.isRightPanelOpen ? 'Hide properties panel' : 'Show properties panel',
      group: 'View',
      icon: PanelRight,
      run: () => store.toggleRightPanel(),
    },
    {
      id: 'import',
      label: 'Import JSON',
      group: 'File',
      shortcut: '⇧⌘O',
      icon: Upload,
      run: requestImport,
    },
    {
      id: 'export',
      label: 'Export document',
      group: 'File',
      shortcut: '⇧⌘E',
      icon: Download,
      run: () => setExportOpen(true),
    },
    {
      id: 'export-json',
      label: 'Export source JSON',
      group: 'File',
      icon: FileJson2,
      run: () => void exportDocument('json', 'document', 1),
    },
  ];

  const toastData = snapshot.toasts.map((toast) => ({
    id: toast.id,
    title: toast.message,
    tone:
      toast.tone === 'error'
        ? ('danger' as const)
        : toast.tone === 'neutral'
          ? ('info' as const)
          : ('success' as const),
    duration: toast.tone === 'error' ? 6000 : 3600,
    ...(toast.actionLabel && toast.onAction
      ? { action: { label: toast.actionLabel, onAction: toast.onAction } }
      : {}),
  }));

  return (
    <div className="editor-shell">
      <TopBar
        activeTool={snapshot.session.activeTool}
        canUndo={snapshot.history.canUndo}
        canRedo={snapshot.history.canRedo}
        saveState={snapshot.session.saveState}
        onToolChange={(tool) => store.setTool(tool)}
        onUndo={() => store.undo()}
        onRedo={() => store.redo()}
        onOpenMenu={() => {
          refreshDocuments();
          setMainMenuOpen((open) => !open);
        }}
        onOpenPreview={() => setPreviewOpen(true)}
        onOpenExport={() => setExportOpen(true)}
      />

      <main
        className="editor-main"
        data-left-panel={snapshot.session.isLeftPanelOpen ? 'open' : 'closed'}
        data-right-panel={snapshot.session.isRightPanelOpen ? 'open' : 'closed'}
      >
        <LayersPanel
          className="panel panel--left"
          scene={snapshot.document}
          selectedIds={snapshot.session.selectedIds}
          onSelectionChange={(nodeIds) => store.setSelection(nodeIds)}
          onRename={(nodeId, name) => store.renameNode(nodeId, name)}
          onSetVisibility={setNodeVisibility}
          onSetLocked={setNodeLocked}
          onMove={(request) =>
            store.reparent(request.nodeIds, request.targetParentId, request.targetIndex)
          }
        />
        <CanvasStage store={store} onContextMenuRequest={handleContextMenuRequest} />
        <PropertiesPanel
          className="panel panel--right"
          scene={snapshot.document}
          selectedIds={snapshot.session.selectedIds}
          onCommitNodes={(nodes: readonly SceneNode[], label) => store.updateNodes(nodes, label)}
          onAlign={alignNodes}
          onChangeDocument={changeDocumentProperties}
          onExport={handlePropertyExport}
        />
      </main>

      <ConnectedStatusBar store={store} />

      {isMainMenuOpen ? (
        <MainMenu
          documents={documents}
          activeDocumentId={snapshot.document.id}
          gridVisible={snapshot.session.isGridVisible}
          rulersVisible={snapshot.session.areRulersVisible}
          snappingEnabled={snapshot.session.isSnappingEnabled}
          leftPanelOpen={snapshot.session.isLeftPanelOpen}
          rightPanelOpen={snapshot.session.isRightPanelOpen}
          onAction={handleMainMenuAction}
          onOpenDocument={openDocument}
          onClose={() => setMainMenuOpen(false)}
        />
      ) : null}

      <CommandPalette
        open={snapshot.session.isCommandPaletteOpen}
        actions={commandActions}
        onOpenChange={(open) => store.setCommandPaletteOpen(open)}
      />
      {contextPoint ? (
        <ContextMenu
          x={contextPoint.x}
          y={contextPoint.y}
          hasSelection={hasSelection}
          canUngroup={canUngroup}
          onAction={handleContextAction}
          onClose={() => setContextPoint(null)}
        />
      ) : null}
      {isPreviewOpen ? <PreviewModal store={store} onClose={() => setPreviewOpen(false)} /> : null}
      {isExportOpen ? (
        <ExportDialog
          hasSelection={hasSelection}
          onClose={() => setExportOpen(false)}
          onExport={exportDocument}
        />
      ) : null}

      <ToastViewport
        className="editor-toasts"
        toasts={toastData}
        onDismiss={(toastId) => store.dismissToast(toastId)}
      />
      <input
        ref={importInputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importJsonFile(file);
          event.currentTarget.value = '';
        }}
      />
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {snapshot.lastActionLabel}
      </div>
    </div>
  );
}
