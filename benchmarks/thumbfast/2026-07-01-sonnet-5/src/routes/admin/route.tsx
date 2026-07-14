import { useIsClient } from "@/hooks/use-is-client";
import { useSession } from "@/lib/auth-client";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminLayoutSkeleton } from "./_components/admin-skeletons";
import { AdminNavigation } from "./_navigation/-admin-navigation";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
  pendingComponent: AdminLayoutSkeleton,
});

function AdminLayout() {
  const session = useSession();
  const isClient = useIsClient();

  if (!isClient || session.isPending) {
    return <AdminLayoutSkeleton />;
  }

  if (session.data?.user.role !== "admin") {
    return <AdminRedirect />;
  }

  return (
    <AdminNavigation>
      <Outlet />
    </AdminNavigation>
  );
}

function AdminRedirect() {
  useEffect(() => {
    window.location.replace("/");
  }, []);

  return <AdminLayoutSkeleton />;
}
