import type { NavigationGroup } from "@/features/navigation/navigation.type";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { ChevronRight } from "lucide-react";
import Link from "@/compat/link";
import { usePathname } from "@/compat/navigation";
import type { ComponentProps } from "react";
import type { SidebarMenuButtonProps } from "./sidebar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./sidebar";

const findBestMatch = (pathname: string, hrefs: string[]): string | null => {
  const matches = hrefs.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, current) =>
    current.length > best.length ? current : best,
  );
};

const SidebarMenuButtonLinkWithActive = ({
  href,
  isActive,
  children,
  ...props
}: SidebarMenuButtonProps & { href: string; isActive: boolean }) => {
  return (
    <SidebarMenuButton {...props} asChild isActive={isActive}>
      <Link prefetch={true} href={href}>
        {children}
      </Link>
    </SidebarMenuButton>
  );
};

export const SidebarMenuButtonLink = ({
  href,
  children,
  ...props
}: SidebarMenuButtonProps & { href: string }) => {
  const pathname = usePathname();

  return (
    <SidebarMenuButton {...props} asChild isActive={pathname === href}>
      <Link prefetch={true} href={href}>
        {children}
      </Link>
    </SidebarMenuButton>
  );
};

export const SidebarSubButtonLink = ({
  href,
  children,
  ...props
}: ComponentProps<typeof SidebarMenuSubButton> & { href: string }) => {
  const pathname = usePathname();

  return (
    <SidebarMenuSubButton {...props} asChild isActive={pathname === href}>
      <Link prefetch={true} href={href}>
        {children}
      </Link>
    </SidebarMenuSubButton>
  );
};

export const SidebarNavigationMenu = (props: { link: NavigationGroup }) => {
  const { link } = props;
  const pathname = usePathname();

  const allHrefs = link.links.flatMap((item) =>
    item.links
      ? [item.href, ...item.links.map((sub) => sub.href)]
      : [item.href],
  );
  const bestMatch = findBestMatch(pathname, allHrefs);

  return (
    <SidebarMenu>
      {link.links.map((item) => {
        if (item.links) {
          const isParentActive =
            bestMatch === item.href ||
            item.links.some((subItem) => bestMatch === subItem.href);

          return (
            <Collapsible
              defaultOpen
              key={item.label}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <SidebarMenuButtonLinkWithActive
                  href={item.href}
                  isActive={isParentActive}
                >
                  <item.Icon />
                  <span>{item.label}</span>
                  <CollapsibleTrigger className="ml-auto">
                    <ChevronRight className="text-muted-foreground ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarMenuButtonLinkWithActive>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.links.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.label}>
                        <SidebarSubButtonLink href={subItem.href}>
                          <subItem.Icon />
                          <span>{subItem.label}</span>
                        </SidebarSubButtonLink>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        }

        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButtonLinkWithActive
              href={item.href}
              isActive={bestMatch === item.href}
            >
              <item.Icon />
              <span>{item.label}</span>
              {item.badge && (
                <span className="bg-primary/10 text-primary ml-auto rounded px-1.5 py-0.5 text-[10px] leading-none font-medium">
                  {item.badge}
                </span>
              )}
            </SidebarMenuButtonLinkWithActive>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
};
