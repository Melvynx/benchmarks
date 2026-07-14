import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info);
  }

  override render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-panel-bg text-text-primary">
          <div className="max-w-md p-6 rounded-lg border border-red-900/50 bg-red-950/30">
            <div className="text-lg font-semibold text-red-400 mb-2">Something went wrong.</div>
            <pre className="text-xs text-text-secondary whitespace-pre-wrap break-all">
              {this.state.error.message}
            </pre>
            <button
              className="mt-4 px-3 py-1.5 text-xs bg-accent rounded hover:bg-accent-hover text-white"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
