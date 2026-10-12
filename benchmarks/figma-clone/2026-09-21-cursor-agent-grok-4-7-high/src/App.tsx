import { Component, useMemo, type ReactNode } from "react";
import type { Editor } from "./engine/editor";
import { ToolController } from "./engine/tools/controller";
import { EditorContext, ToolsContext, useEditor, useEditorState } from "./ui/context";
import { CanvasView } from "./ui/CanvasView";
import { LayersPanel } from "./ui/LayersPanel";
import { PlayMode } from "./ui/PlayMode";
import { PropertiesPanel } from "./ui/PropertiesPanel";
import { Shortcuts } from "./ui/Shortcuts";
import { StatusBar } from "./ui/StatusBar";
import { Toolbar } from "./ui/Toolbar";
import { useShortcuts } from "./ui/useShortcuts";

export function App({ editor }: { editor: Editor }) {
  return (
    <EditorContext.Provider value={editor}>
      <ErrorBoundary>
        <Shell />
      </ErrorBoundary>
    </EditorContext.Provider>
  );
}

function Shell() {
  const editor = useEditor();
  const tools = useMemo(() => new ToolController(editor), [editor]);
  return (
    <ToolsContext.Provider value={tools}>
      <ShellBody />
    </ToolsContext.Provider>
  );
}

function ShellBody() {
  useShortcuts();
  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <LayersPanel />
        <CanvasView />
        <PropertiesPanel />
      </div>
      <StatusBar />
      <Shortcuts />
      <PlayMode />
      <Toasts />
    </div>
  );
}

function Toasts() {
  const { editor } = useEditorState("chrome");
  return (
    <div className="toasts">
      {editor.toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {toast.message}
        </div>
      ))}
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    console.error(error);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash">
        <h1>Grok 4.7</h1>
        <p>The editor hit an unexpected error.</p>
        <pre>{this.state.error.message}</pre>
        <button type="button" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
