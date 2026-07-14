import { ErrorBoundary } from "../ui/ErrorBoundary";
import { EditorShell } from "./EditorShell";

export function App() {
  return (
    <ErrorBoundary>
      <EditorShell />
    </ErrorBoundary>
  );
}
