import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { CSSProperties, PropsWithChildren } from "react";
import { AdminBreadcrumb } from "./-admin-breadcrumb";
import { AdminSidebar } from "./-admin-sidebar";

export function AdminNavigation({ children }: PropsWithChildren) {
  return (
    <SidebarProvider
      id="admin-sidebar"
      className="bg-background overflow-x-hidden"
      style={
        {
          "--sidebar": "var(--background)",
        } as CSSProperties
      }
    >
      <AdminSidebar />
      <SidebarInset className="bg-background min-w-0 border-0">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="m-auto mt-4 flex w-full max-w-7xl items-center gap-2 px-4">
            <SidebarTrigger
              variant="outline"
              className="size-8 cursor-pointer"
            />
            <AdminBreadcrumb />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
