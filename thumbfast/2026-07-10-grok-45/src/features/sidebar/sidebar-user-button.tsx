import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useIsClient } from "@/hooks/use-is-client";
import { cn } from "@/lib/utils";
import { useCurrentOrg } from "@/features/organization/current-org-store";
import { useSession } from "@/lib/auth-client";
import { ChevronsUpDown } from "lucide-react";
import { UserDropdown } from "../auth/user-dropdown";

export const SidebarUserButton = () => {
  const isClient = useIsClient();
  const session = useSession();
  const currentOrg = useCurrentOrg();
  const data = session.data?.user;

  const isPremium =
    currentOrg?.subscription?.plan && currentOrg.subscription.plan !== "free";

  const nameInitial = isClient ? (data?.name[0] ?? data?.email[0] ?? "?") : "?";

  return (
    <UserDropdown>
      <SidebarMenuButton variant="outline" className="bg-secondary h-12 border">
        <div
          className={cn(
            "rounded-lg p-[1.5px]",
            isPremium &&
              "bg-gradient-to-br from-violet-500/60 via-fuchsia-500/60 to-amber-500/60",
          )}
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={data?.image ?? ""} alt={nameInitial} />
            <AvatarFallback className="rounded-lg">
              {nameInitial}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">
            {isClient ? (data?.name ?? "...") : "..."}
          </span>
          <span className="truncate text-xs">
            {isClient ? (data?.email ?? "Loading...") : "Loading..."}
          </span>
        </div>
        <ChevronsUpDown className="ml-auto size-4" />
      </SidebarMenuButton>
    </UserDropdown>
  );
};
