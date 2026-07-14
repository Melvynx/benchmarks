"use client";

import type { ReactNode } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      closeButton
      expand
      position="top-right"
      richColors
      theme={resolvedTheme === "light" ? "light" : "dark"}
      toastOptions={{
        className: "border border-border/70 bg-card/95 text-card-foreground",
      }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      enableSystem={false}
    >
      {children}
      <ThemedToaster />
    </ThemeProvider>
  );
}
