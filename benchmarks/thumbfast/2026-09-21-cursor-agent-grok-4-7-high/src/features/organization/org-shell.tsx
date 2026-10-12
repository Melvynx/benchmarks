import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactFeedbackPopover } from "@/features/contact/feedback/contact-feedback-popover";
import { useCredits } from "@/features/credits/credits.query";
import { GenerationCompletionNotifier } from "@/features/editor/generation-completion-notifier";
import { useCurrentOrg } from "@/features/organization/current-org-store";
import {
  OrgDashboard,
  OrgDashboardSkeleton,
} from "@/features/organization/org-dashboard";
import { getOrganizationNavigation } from "@/features/organization/org-navigation.links";
import { SidebarUserButton } from "@/features/sidebar/sidebar-user-button";
import type { AuthRole } from "@/lib/auth/auth-permissions";
import { getOrgRoutePageMetadata } from "@/lib/metadata";
import { usePageMetadata } from "@/lib/use-page-metadata";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  CornerDownLeft,
  Home,
  ImageIcon,
  Key,
  MessageSquare,
  Search,
  Settings,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

type OrgSettingsResponse = {
  org: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    subscription?: {
      status?: string | null;
      plan?: string | null;
      overrideLimits?: unknown;
    } | null;
  };
  limits: {
    maxGenerations: number;
    noWatermark: boolean;
  };
  role: AuthRole;
  features: {
    thumbnailAgentEnabled: boolean;
  };
};

type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  role?: AuthRole;
};

type OrganizationsResponse = {
  items: UserOrganization[];
};

function isAdminDebugOnboardingSearch(searchStr: string) {
  const value = new URLSearchParams(searchStr).get("adminDebug");
  return value === "1" || value === "true";
}

export function OrgShell() {
  const params = useParams({ strict: false }) as { orgSlug?: string };
  const location = useLocation();
  const orgSlug = params.orgSlug ?? "";
  const isAdminDebugOnboarding =
    location.pathname === `/orgs/${orgSlug}/onboard` &&
    isAdminDebugOnboardingSearch(location.searchStr);
  const isDrawingEditor = location.pathname.endsWith("/inspirations/draw");
  const data = useQuery(
    api.app.orgSettings,
    orgSlug && !isAdminDebugOnboarding ? { orgSlug } : "skip",
  ) as OrgSettingsResponse | undefined;
  const organizationsData = useQuery(
    api.app.listUserOrganizations,
    isAdminDebugOnboarding ? "skip" : {},
  ) as OrganizationsResponse | undefined;

  useEffect(() => {
    if (isAdminDebugOnboarding) return;
    if (!data) return;
    useCurrentOrg.setState({
      id: data.org.id,
      slug: data.org.slug,
      name: data.org.name,
      image: data.org.logo ?? null,
      subscription: data.org.subscription ?? null,
      limits: data.limits,
    });
  }, [data, isAdminDebugOnboarding]);

  usePageMetadata(
    isDrawingEditor
      ? {
          title: "Grok 4.7",
          description: "Draw a thumbnail inspiration.",
          path: location.pathname,
          noIndex: true,
        }
      : !isAdminDebugOnboarding && data?.org
        ? getOrgRoutePageMetadata(location.pathname, orgSlug, data.org.name)
        : null,
  );

  const role = data?.role;
  const isLoadingOrgSettings = Boolean(orgSlug) && data?.org.slug !== orgSlug;
  const organizations = organizationsData?.items ?? [];
  const isLoadingOrganizations = organizationsData === undefined;
  const settingsBasePath = `/orgs/${orgSlug}/settings`;
  const isOrgDashboardPage = location.pathname === `/orgs/${orgSlug}`;
  const isSettingsPage =
    location.pathname === settingsBasePath ||
    location.pathname.startsWith(`${settingsBasePath}/`);
  const allNavigationGroups = useMemo(
    () =>
      getOrganizationNavigation(orgSlug, role ? [role] : undefined, {
        thumbnailAgentEnabled: data?.features.thumbnailAgentEnabled,
      }),
    [data?.features.thumbnailAgentEnabled, role, orgSlug],
  );
  const navigationGroups = useMemo(() => {
    if (isSettingsPage) {
      return allNavigationGroups.filter(
        (group) => group.title === "Organization",
      );
    }

    return allNavigationGroups.filter(
      (group) => group.title !== "Organization",
    );
  }, [allNavigationGroups, isSettingsPage]);

  if (isAdminDebugOnboarding || isDrawingEditor) {
    return <Outlet />;
  }

  return (
    <SidebarProvider>
      {orgSlug ? <GenerationCompletionNotifier orgSlug={orgSlug} /> : null}
      <OrgSidebar
        orgSlug={orgSlug}
        orgName={data?.org.name}
        isSettingsPage={isSettingsPage}
        pathname={location.pathname}
        navigationGroups={navigationGroups}
        allNavigationGroups={allNavigationGroups}
        orgLogo={data?.org.logo}
        organizations={organizations}
        orgPlan={data?.org.subscription?.plan ?? "free"}
        isLoadingOrg={isLoadingOrgSettings || isLoadingOrganizations}
      />
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="m-auto mt-4 flex w-full max-w-7xl items-center justify-between gap-2 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger
                variant="outline"
                className="size-8 cursor-pointer"
              />
              <OrgBreadcrumb pathname={location.pathname} orgSlug={orgSlug} />
            </div>
            <div className="flex items-center gap-4">
              <HeaderCreditBalance orgSlug={orgSlug} />
              <ContactFeedbackPopover>
                <Button size="icon-sm" variant="outline">
                  <MessageSquare />
                  <span className="sr-only">Feedback</span>
                </Button>
              </ContactFeedbackPopover>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {isOrgDashboardPage ? <OrgDashboard orgSlug={orgSlug} /> : <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function OrgShellSkeleton({
  orgSlug,
  pathname,
}: {
  orgSlug: string;
  pathname: string;
}) {
  const settingsBasePath = `/orgs/${orgSlug}/settings`;
  const isSettingsPage =
    pathname === settingsBasePath ||
    pathname.startsWith(`${settingsBasePath}/`);

  return (
    <SidebarProvider>
      <OrgSidebarSkeleton isSettingsPage={isSettingsPage} />
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="m-auto mt-4 flex w-full max-w-7xl items-center justify-between gap-2 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Skeleton className="size-8 rounded-md" />
              <div className="border-border bg-background flex h-8 items-center gap-2 rounded-lg border px-3 shadow-sm shadow-black/5">
                <Skeleton className="size-4 rounded-md" />
                {isSettingsPage ? (
                  <>
                    <span className="text-muted-foreground">/</span>
                    <Skeleton className="h-3.5 w-16" />
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {isSettingsPage ? <OrgSettingsSkeleton /> : <OrgDashboardSkeleton />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function OrgSidebarSkeleton(props: { isSettingsPage: boolean }) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="flex flex-col gap-2">
        {props.isSettingsPage ? (
          <Skeleton className="h-9 w-full rounded-md" />
        ) : (
          <>
            <div className="border-border bg-input dark:bg-input/30 flex h-12 items-center gap-2 rounded-md border px-3">
              <Skeleton className="size-6 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="size-4 rounded-sm" />
            </div>
            <div className="border-input bg-background flex h-9 items-center gap-2 rounded-md border px-3">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className="h-3.5 w-20" />
              <div className="ml-auto flex gap-1">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </div>
          </>
        )}
      </SidebarHeader>
      <SidebarContent className="border-card">
        {[1, 2, 3].map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>
              <Skeleton className="h-3 w-20" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[1, 2, 3, 4].map((item) => (
                  <SidebarMenuItem key={item}>
                    <div className="flex h-8 items-center gap-2 rounded-md px-2">
                      <Skeleton className="size-4 rounded-sm" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-14" />
        </div>
        {!props.isSettingsPage ? <Skeleton className="h-8 w-full" /> : null}
        <div className="border-border bg-input dark:bg-input/30 flex h-12 items-center gap-2 rounded-md border px-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function OrgSettingsSkeleton() {
  return (
    <div
      aria-label="Loading settings"
      className="m-auto mt-4 flex w-full max-w-7xl flex-col gap-6 px-4"
      role="status"
    >
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton className="h-9 w-full rounded-md" key={item} />
          ))}
        </div>
        <div className="rounded-lg border p-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="mt-6 grid gap-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgSidebar(props: {
  orgSlug: string;
  orgName?: string;
  isSettingsPage: boolean;
  pathname: string;
  navigationGroups: ReturnType<typeof getOrganizationNavigation>;
  allNavigationGroups: ReturnType<typeof getOrganizationNavigation>;
  orgLogo?: string | null;
  orgPlan?: string | null;
  organizations: UserOrganization[];
  isLoadingOrg: boolean;
}) {
  const bestMatch = findBestNavigationMatch(
    props.pathname,
    props.navigationGroups.flatMap((group) =>
      group.links.flatMap((item) =>
        item.links
          ? [item.href, ...item.links.map((subItem) => subItem.href)]
          : [item.href],
      ),
    ),
  );

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="flex flex-col gap-2">
        {props.isSettingsPage ? (
          <Button variant="ghost" className="justify-start" asChild>
            <Link to={`/orgs/${props.orgSlug}` as never}>
              <ArrowLeft className="size-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>
        ) : (
          <>
            <OrgSelector
              isLoading={props.isLoadingOrg}
              organizations={props.organizations}
              orgLogo={props.orgLogo}
              orgName={props.orgName}
              orgPlan={props.orgPlan}
              orgSlug={props.orgSlug}
            />
            <OrgCommand
              orgSlug={props.orgSlug}
              navigationGroups={props.allNavigationGroups}
            />
          </>
        )}
      </SidebarHeader>
      <SidebarContent className="border-card">
        {props.navigationGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.links.map((item) => {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={bestMatch === item.href}
                      >
                        <Link to={item.href as never}>
                          <item.Icon />
                          <span>{item.label}</span>
                          {item.badge ? (
                            <span className="bg-primary/10 text-primary ml-auto rounded px-1.5 py-0.5 text-[10px] leading-none font-medium">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        {!props.isSettingsPage ? (
          <>
            <div className="flex items-center gap-3 px-2">
              <a
                className="text-muted-foreground text-xs hover:underline"
                href="/docs"
              >
                Docs
              </a>
              <a
                className="text-muted-foreground text-xs hover:underline"
                href="/changelog"
              >
                Changelog
              </a>
            </div>
            <Button variant="outline" asChild size="sm">
              <Link to={`/orgs/${props.orgSlug}/settings` as never}>
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <a
              className="text-muted-foreground text-xs hover:underline"
              href="/docs"
            >
              Docs
            </a>
            <a
              className="text-muted-foreground text-xs hover:underline"
              href="/legal/terms"
            >
              Terms
            </a>
          </div>
        )}
        <SidebarUserButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function findBestNavigationMatch(pathname: string, hrefs: string[]) {
  const matches = hrefs.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );

  if (matches.length === 0) return null;

  return matches.reduce((best, current) =>
    current.length > best.length ? current : best,
  );
}

function OrgSelector(props: {
  orgSlug: string;
  orgName?: string;
  orgLogo?: string | null;
  orgPlan?: string | null;
  organizations: UserOrganization[];
  isLoading: boolean;
}) {
  const navigate = useNavigate();
  const selected =
    props.organizations.find(
      (organization) => organization.slug === props.orgSlug,
    ) ?? null;
  const name = props.orgName ?? selected?.name ?? "";
  const logo = props.orgLogo ?? selected?.logo ?? null;
  const plan = props.orgPlan ?? "free";

  if (props.isLoading && !name) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="border-border bg-input dark:bg-input/30 flex h-12 items-center gap-2 rounded-md border px-3">
            <Skeleton className="size-6 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              data-testid="org-selector"
              variant="default"
              size="lg"
              className="border-border bg-input dark:bg-input/30 cursor-pointer rounded-md border"
            >
              <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                <Avatar className="size-6 object-contain">
                  <AvatarFallback>
                    {getOrganizationInitial(name)}
                  </AvatarFallback>
                  {logo ? <AvatarImage src={logo} alt="" /> : null}
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-left">
                  {name || "Workspace"}
                </span>
                <OrgPlanBadge plan={plan} />
              </span>
              <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
            side="bottom"
          >
            {props.organizations.length > 0 ? (
              props.organizations.map((organization) => {
                const isCurrent = organization.slug === props.orgSlug;

                return (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    key={organization.id}
                    onSelect={() => {
                      if (isCurrent) return;
                      void navigate({
                        to: "/orgs/$orgSlug",
                        params: { orgSlug: organization.slug },
                      });
                    }}
                  >
                    <Avatar className="size-5 object-contain">
                      <AvatarFallback>
                        {getOrganizationInitial(organization.name)}
                      </AvatarFallback>
                      {organization.logo ? (
                        <AvatarImage src={organization.logo} alt="" />
                      ) : null}
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate">
                      {organization.name}
                    </span>
                    {isCurrent ? <OrgPlanBadge plan={plan} /> : null}
                    {isCurrent ? <Check className="size-4" /> : null}
                  </DropdownMenuItem>
                );
              })
            ) : (
              <DropdownMenuItem disabled>No workspace found</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function OrgPlanBadge({ plan }: { plan?: string | null }) {
  return (
    <Badge
      variant="outline"
      className="border-primary/25 bg-primary/10 text-primary h-5 px-1.5 text-[10px] leading-none font-semibold tracking-normal capitalize"
    >
      {formatPlanName(plan)}
    </Badge>
  );
}

function formatPlanName(plan?: string | null) {
  if (plan === "poweruser") return "Poweruser";
  return plan?.trim() ? plan : "Free";
}

function getOrganizationInitial(name: string) {
  return (name.trim().slice(0, 1) || "W").toUpperCase();
}

function OrgCommand(props: {
  orgSlug: string;
  navigationGroups: ReturnType<typeof getOrganizationNavigation>;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = props.navigationGroups.flatMap((group) =>
    group.links.map((link) => ({ ...link, groupTitle: group.title })),
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <InputGroup className="w-full">
        <InputGroupAddon align="inline-start">
          <Search className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="Search..."
          onClick={() => setOpen(true)}
          readOnly
        />
        <InputGroupAddon align="inline-end">
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </InputGroupAddon>
      </InputGroup>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="rounded-xl border-none bg-clip-padding p-2 pb-11 shadow-2xl ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search documentation...</DialogTitle>
            <DialogDescription>
              Search for a command to run...
            </DialogDescription>
          </DialogHeader>
          <Command className="**:data-[slot=command-input-wrapper]:bg-input/50 **:data-[slot=command-input-wrapper]:border-input rounded-none bg-transparent **:data-[slot=command-input]:!h-9 **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:!h-9 **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border">
            <CommandList className="no-scrollbar min-h-80 scroll-pt-2 scroll-pb-1.5">
              {links.length === 0 ? (
                <CommandEmpty className="text-muted-foreground py-12 text-center text-sm">
                  No results found.
                </CommandEmpty>
              ) : (
                props.navigationGroups.map((group) => (
                  <CommandGroup
                    heading={group.title}
                    key={group.title}
                    className="!p-0 [&_[cmdk-group-heading]]:scroll-mt-16 [&_[cmdk-group-heading]]:!p-3 [&_[cmdk-group-heading]]:!pb-1"
                  >
                    {group.links.map((link) => (
                      <CommandItem
                        key={link.href}
                        onSelect={() => {
                          void navigate({ to: link.href as never });
                          setOpen(false);
                        }}
                        className="data-[selected=true]:border-input data-[selected=true]:bg-input/50 h-9 rounded-md border border-transparent !px-3 font-medium"
                      >
                        <link.Icon className="size-4" />
                        <span>{link.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          </Command>
          <div className="text-muted-foreground absolute inset-x-0 bottom-0 z-20 flex h-10 items-center gap-2 rounded-b-xl border-t border-t-neutral-100 bg-neutral-50 px-4 text-xs font-medium dark:border-t-neutral-700 dark:bg-neutral-800">
            <div className="flex items-center gap-2">
              <Kbd>
                <CornerDownLeft className="size-3" />
              </Kbd>
              Go to Page
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function HeaderCreditBalance(props: { orgSlug: string }) {
  const { data, isLoading } = useCredits(props.orgSlug);

  if (isLoading) {
    return <Skeleton className="h-6 w-20" />;
  }

  if (data?.apiKeyMode === "required" || data?.plan === "poweruser") {
    return (
      <Link
        to={`/orgs/${props.orgSlug}/settings/api-keys` as never}
        className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
      >
        <Key className="text-primary size-4" />
        <span className="font-medium">API Keys</span>
      </Link>
    );
  }

  const approximateThumbnails = Math.floor(data?.balance ?? 0);

  return (
    <Link
      to={`/orgs/${props.orgSlug}/settings/billing` as never}
      className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
    >
      <ImageIcon className="text-primary size-4" />
      <span className="font-medium">~{approximateThumbnails}</span>
      <span className="text-muted-foreground text-sm">thumbnails</span>
    </Link>
  );
}

function OrgBreadcrumb(props: { pathname: string; orgSlug: string }) {
  const paths = props.pathname.split("/").filter(Boolean);
  const basePath = `/orgs/${props.orgSlug}`;
  const sectionPaths = paths.slice(2);

  return (
    <Breadcrumb>
      <BreadcrumbList className="border-border bg-background h-8 rounded-lg border px-3 shadow-sm shadow-black/5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/orgs/$orgSlug" params={{ orgSlug: props.orgSlug }}>
              <Home size={16} strokeWidth={2} aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {sectionPaths.length > 0 ? <BreadcrumbSeparator /> : null}
        {sectionPaths.map((path, index) => {
          const isLast = index === sectionPaths.length - 1;
          const currentPath = `/${paths.slice(0, index + 3).join("/")}`;
          const displayName = path.replaceAll("-", " ");

          return (
            <Fragment key={`${path}-${index}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-2 capitalize">
                    {displayName}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      to={(currentPath || basePath) as never}
                      className={cn("flex items-center gap-2 capitalize")}
                    >
                      {displayName}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
