import { useEffect } from "react";
import { useUI } from "../lib/ui";
import { useMail } from "../lib/store";
import { useIsMobile } from "../hooks/useMedia";
import { Composer } from "./LazyComposer";

export function ComposeDock() {
  const composers = useUI((s) => s.composers);
  const sidePanel = useUI((s) => s.sidePanel);
  const messages = useMail((s) => s.messages);
  const mobile = useIsMobile();

  useEffect(() => {
    const stale = composers.filter((c) => messages[c.id]?.status !== "draft");
    if (stale.length) useUI.setState({ composers: composers.filter((c) => messages[c.id]?.status === "draft") });
  }, [composers, messages]);

  const live = composers.filter((c) => messages[c.id]?.status === "draft");
  if (!live.length) return null;

  if (mobile) {
    const top = live[live.length - 1];
    return <Composer key={top.id} id={top.id} variant="mobile" win={top} />;
  }

  const max = live.find((c) => c.maximized);
  return (
    <>
      <div className="no-print pointer-events-none fixed bottom-0 z-[70] flex flex-row-reverse items-end gap-4" style={{ right: sidePanel ? 392 : 72 }}>
        {[...live].reverse().map((c) => (c.maximized ? null : <Composer key={c.id} id={c.id} variant="floating" win={c} />))}
      </div>
      {max && <Composer key={max.id} id={max.id} variant="floating" win={max} />}
    </>
  );
}
