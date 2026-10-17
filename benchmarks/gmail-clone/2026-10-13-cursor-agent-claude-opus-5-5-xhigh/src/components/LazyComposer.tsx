import { lazy, Suspense, type ComponentProps } from "react";
import { ui } from "../lib/ui";
import { ErrorBoundary } from "./ErrorBoundary";
import { Button } from "./ui";

const load = () => import("./Composer");
const Inner = lazy(() => load().then((m) => ({ default: m.Composer })));

export const preloadComposer = load;

export function Composer(props: ComponentProps<typeof Inner>) {
  return (
    <ErrorBoundary
      fallback={(reset) => (
        <div className="pointer-events-auto flex w-[min(560px,calc(100vw-32px))] flex-col gap-3 rounded-t-2xl bg-surface p-5 font-sans text-sm text-fg shadow-e3">
          The editor ran into a problem. Your draft is saved.
          <div className="flex justify-end gap-2">
            <Button variant="text" onClick={() => (ui().closeComposer(props.id), reset())}>Close</Button>
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      )}
    >
      <Suspense fallback={null}>
        <Inner {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
