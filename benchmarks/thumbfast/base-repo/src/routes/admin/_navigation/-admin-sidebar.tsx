import { LogoSvg } from "@/components/svg/logo-svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarNavigationMenu } from "@/components/ui/sidebar-utils";
import { SidebarUserButton } from "@/features/sidebar/sidebar-user-button";
import { SiteConfig } from "@/site-config";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getAdminNavigation } from "./admin-navigation.links";

export function AdminSidebar() {
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="gap-3">
        <Link to="/admin" className="flex items-center gap-2 px-2">
          <LogoSvg size={24} />
          <span className="truncate text-sm font-semibold">
            {SiteConfig.title}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {getAdminNavigation().map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarNavigationMenu link={group} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <Link
          to="/orgs"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 px-2 text-xs"
        >
          <ArrowLeft className="size-3.5" />
          Back to app
        </Link>
        <SidebarUserButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
