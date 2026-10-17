import type { ReactNode } from "react";

export function SectionLabel({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
      {children}
    </h2>
  );
}
