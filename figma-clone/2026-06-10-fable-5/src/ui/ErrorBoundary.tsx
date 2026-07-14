import { Component, type ErrorInfo, type ReactNode } from 'react';
import { serializeDocument } from '../persistence/serialization';
import { editorStore } from '../store/store';
import { downloadText } from '../utils/download';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defense: if the UI throws, the document is still in memory and
 * localStorage. Offer a JSON download before reloading so no work is lost.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Editor crashed', error, info.componentStack);
  }

  private downloadBackup = (): void => {
    try {
      const state = editorStore.getState();
      downloadText(serializeDocument(state.doc, state.docName, state.viewport), `${state.docName}-recovery.fable5.json`);
    } catch (e) {
      console.error('Backup failed', e);
    }
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash-screen">
        <div className="crash-card">
          <h1>Something broke</h1>
          <p>
            The editor hit an unexpected error. Your document auto-saves continuously, but you can also download a
            recovery copy right now.
          </p>
          <pre>{this.state.error.message}</pre>
          <div className="crash-actions">
            <button className="btn btn--primary" onClick={this.downloadBackup}>
              Download recovery .json
            </button>
            <button className="btn" onClick={() => window.location.reload()}>
              Reload editor
            </button>
          </div>
        </div>
      </div>
    );
  }
}
