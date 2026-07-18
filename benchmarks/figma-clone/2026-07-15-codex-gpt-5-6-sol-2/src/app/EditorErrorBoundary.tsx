import { Component } from 'react';

import type { ErrorInfo, ReactNode } from 'react';

interface EditorErrorBoundaryProps {
  readonly children: ReactNode;
}

interface EditorErrorBoundaryState {
  readonly error: Error | null;
}

export class EditorErrorBoundary extends Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  override state: EditorErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): EditorErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Editor render failure', { error, componentStack: errorInfo.componentStack });
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="fatal-error" role="alert">
        <div className="fatal-error__mark" aria-hidden="true">
          !
        </div>
        <h1>The editor hit an unexpected error</h1>
        <p>Your locally saved file is still available. Reload the editor to restore it.</p>
        <details>
          <summary>Technical details</summary>
          <pre>{error.message}</pre>
        </details>
        <button type="button" onClick={() => window.location.reload()}>
          Reload editor
        </button>
      </main>
    );
  }
}
