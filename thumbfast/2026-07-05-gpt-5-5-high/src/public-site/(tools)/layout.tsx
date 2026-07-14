import { LandingHeader } from "@/features/landing/landing-header";
import { SignedInDialog } from "@/features/landing/signed-in-dialog";
import { Footer } from "@/features/layout/footer";
import type { PropsWithChildren } from "react";

export default function ToolsLayout({ children }: PropsWithChildren) {
  return (
    <div className="force-light-theme bg-background text-foreground relative flex h-fit flex-col">
      <SignedInDialog />
      <LandingHeader />
      {children}
      <Footer />
    </div>
  );
}
