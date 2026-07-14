import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = Readonly<{ children: ReactNode }>;
type State = Readonly<{ error: Error | null }>;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal">
          <h1>Editor failed to render</h1>
          <p>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
