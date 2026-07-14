import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Map failed to initialize:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-ink-900 px-6 text-center">
          <p className="text-[13.5px] text-ink-100">The map could not be displayed in this browser.</p>
          <p className="max-w-xs text-[12px] text-ink-400">
            This can happen when WebGL is unavailable. Use the List view to explore every event with the same
            filters, time range, and detail.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
