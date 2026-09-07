import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { Layout, LayoutContent } from "@/features/page/layout";
import { authClient } from "@/lib/auth-client";
import { dayjs } from "@/lib/dayjs";
import { unwrapSafePromise } from "@/lib/promises";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Copy,
  MoreHorizontal,
  UserCog,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  AdminEmptyState,
  AdminTable,
  StatusBadge,
} from "../../_components/admin-shared";
import { AdminUserDetailSkeleton } from "../../_components/admin-skeletons";

const userTabs = ["profile", "organizations", "providers", "sessions"] as const;

export const Route = createFileRoute("/admin/users/$userId/")({
  component: AdminUserDetailRoute,
  pendingComponent: AdminUserDetailPageSkeleton,
});

function AdminUserDetailPageSkeleton() {
  return (
    <Layout size="lg">
      <LayoutContent>
        <AdminUserDetailSkeleton />
      </LayoutContent>
    </Layout>
  );
}

function AdminUserDetailRoute() {
  const { userId } = Route.useParams();
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(userTabs).withDefault("profile").withOptions({
      clearOnDefault: true,
    }),
  );
  const user = useQuery(api.admin.queries.getUserById, { userId });

  if (user === null) {
    return (
      <Layout size="lg">
        <LayoutContent>
          <AdminEmptyState title="User not found" />
        </LayoutContent>
      </Layout>
    );
  }

  if (user === undefined) {
    return (
      <Layout size="lg">
        <LayoutContent>
          <AdminUserDetailSkeleton />
        </LayoutContent>
      </Layout>
    );
  }

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <Link
            to="/admin/users"
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Users
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="size-14 rounded-lg">
                {user.image ? (
                  <AvatarImage src={user.image} alt={user.name || user.email} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground rounded-lg font-semibold">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold">
                    {user.name || user.email}
                  </h1>
                  <Badge
                    variant={user.role === "admin" ? "default" : "outline"}
                  >
                    {user.role}
                  </Badge>
                  {user.banned ? <StatusBadge value="banned" /> : null}
                </div>
                <p className="text-muted-foreground truncate text-sm">
                  {user.email}
                </p>
              </div>
            </div>
            <UserDetailActions user={user} />
          </div>
          <Tabs
            value={tab}
            onValueChange={(value) => void setTab(value as typeof tab)}
          >
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>
            <div className="mt-6 flex flex-col gap-8 lg:flex-row">
              <UserMetadata user={user} />
              <div className="min-w-0 flex-1">
                <TabsContent value="profile" className="mt-0">
                  <UserProfile user={user} />
                </TabsContent>
                <TabsContent value="organizations" className="mt-0">
                  <UserOrganizations user={user} />
                </TabsContent>
                <TabsContent value="providers" className="mt-0">
                  <UserProviders user={user} />
                </TabsContent>
                <TabsContent value="sessions" className="mt-0">
                  <UserSessions user={user} />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </LayoutContent>
    </Layout>
  );
}

type UserDetail = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.queries.getUserById>>
>;

function UserDetailActions({ user }: { user: UserDetail }) {
  const banUser = useMutation(api.admin.mutations.banUser);
  const unbanUser = useMutation(api.admin.mutations.unbanUser);

  const run = async (
    action: () => Promise<unknown>,
    success: string,
    options?: { rethrow?: boolean },
  ) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
      if (options?.rethrow) {
        throw error;
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Open user actions">
          <MoreHorizontal className="size-4" />
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {!user.banned ? (
          <>
            <DropdownMenuItem
              onClick={() =>
                dialogManager.confirm({
                  title: "Impersonate user",
                  description: `You will sign in as ${user.name || user.email}.`,
                  action: {
                    label: "Impersonate",
                    onClick: async () =>
                      run(
                        async () => {
                          await unwrapSafePromise(
                            authClient.admin.impersonateUser({
                              userId: user.id,
                            }),
                          );
                          window.location.href = "/orgs";
                        },
                        "Now impersonating user",
                        { rethrow: true },
                      ),
                  },
                })
              }
            >
              <UserCog className="mr-2 size-4" />
              Impersonate user
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {user.banned ? (
          <DropdownMenuItem
            className="text-primary"
            onClick={() =>
              dialogManager.confirm({
                title: "Unban user",
                description: `This allows ${user.name || user.email} to sign in again.`,
                action: {
                  label: "Unban user",
                  onClick: async () =>
                    run(
                      async () => unbanUser({ userId: user.id }),
                      "User has been unbanned",
                      { rethrow: true },
                    ),
                },
              })
            }
          >
            <CheckCircle2 className="mr-2 size-4" />
            Unban user
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() =>
              openBanUserDialog(user, async (reason) =>
                run(
                  async () => banUser({ userId: user.id, reason }),
                  "User has been banned",
                  { rethrow: true },
                ),
              )
            }
          >
            <Ban className="mr-2 size-4" />
            Ban user
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMetadata({ user }: { user: UserDetail }) {
  return (
    <aside className="border-border/80 flex flex-col gap-5 border-b pb-6 lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0 lg:pr-6">
      <MetadataItem label="User ID">
        <div className="mt-1 flex min-w-0 items-center gap-1">
          <code className="truncate font-mono text-sm">
            {user.id.slice(0, 8)}...{user.id.slice(-6)}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label="Copy user ID"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(user.id);
                toast.success("User ID copied");
              } catch {
                toast.error("Unable to copy user ID");
              }
            }}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
      </MetadataItem>
      <Separator />
      <MetadataItem label="Email">
        <p className="mt-1 text-sm break-words">{user.email}</p>
      </MetadataItem>
      <Separator />
      <MetadataItem label="Created">
        <p className="mt-1 text-sm font-medium">
          {user.createdAt ? dayjs(user.createdAt).format("MMMM D, YYYY") : "-"}
        </p>
      </MetadataItem>
    </aside>
  );
}

function openBanUserDialog(
  user: Pick<UserDetail, "email" | "name">,
  onBan: (reason?: string) => Promise<unknown>,
) {
  dialogManager.input({
    title: `Ban ${user.name ? user.name : user.email}`,
    description:
      "This blocks future sign-ins and revokes the user's active sessions.",
    input: {
      label: "Reason",
      placeholder: "Spam, abuse, payment fraud...",
    },
    action: {
      label: "Ban user",
      variant: "destructive",
      onClick: async (reason) => {
        const trimmedReason = reason?.trim();
        await onBan(trimmedReason ? trimmedReason : undefined);
      },
    },
  });
}

function UserProfile({ user }: { user: UserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <Info label="Name" value={user.name || "-"} />
        <Info label="Email" value={user.email} />
        <Info label="Role" value={user.role} />
        <Info
          label="Email verified"
          value={user.emailVerified ? "Yes" : "No"}
        />
        <Info
          label="Joined"
          value={user.createdAt ? dayjs(user.createdAt).format("LL") : "-"}
        />
        <Info label="Ban reason" value={user.banReason ?? "-"} />
      </CardContent>
    </Card>
  );
}

function UserOrganizations({ user }: { user: UserDetail }) {
  return (
    <AdminTable
      headers={["Organization", "Organization ID", "Slug", "Role", "Joined"]}
      empty="No organization memberships found."
      rows={user.members.map((member) => [
        member.organization ? (
          <Link
            key="org"
            to="/admin/organizations/$orgId"
            params={{ orgId: member.organization.id }}
            className="text-sm font-medium hover:underline"
          >
            {member.organization.name}
          </Link>
        ) : (
          <span key="org">{member.organizationId}</span>
        ),
        <span key="org-id" className="font-mono text-xs break-words">
          {member.organizationId}
        </span>,
        <span key="org-slug" className="text-muted-foreground text-xs">
          {member.organization?.slug || "-"}
        </span>,
        <Badge key="role" variant="outline">
          {member.role}
        </Badge>,
        <span key="joined" className="text-muted-foreground text-sm">
          {member.createdAt
            ? dayjs(member.createdAt).format("MMM D, YYYY")
            : "-"}
        </span>,
      ])}
    />
  );
}

function UserProviders({ user }: { user: UserDetail }) {
  const setPassword = useMutation(api.admin.mutations.setUserPassword);
  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={() =>
          dialogManager.input({
            title: "Set password",
            input: {
              label: "New password",
              placeholder: "Minimum 8 characters",
            },
            action: {
              label: "Save",
              onClick: async (password) => {
                if (!password || password.length < 8) return;
                await setPassword({ userId: user.id, password });
                toast.success("Password updated");
              },
            },
          })
        }
      >
        Set password
      </Button>
      <AdminTable
        headers={["Provider", "Account", "Linked", "Updated"]}
        empty="No providers found."
        rows={user.accounts.map((account) => [
          <Badge key="provider" variant="outline">
            {account.providerId}
          </Badge>,
          <span key="account" className="text-muted-foreground text-sm">
            {account.accountId}
          </span>,
          <span key="linked" className="text-muted-foreground text-sm">
            {account.createdAt
              ? dayjs(account.createdAt).format("MMM D, YYYY")
              : "-"}
          </span>,
          <span key="updated" className="text-muted-foreground text-sm">
            {account.updatedAt
              ? dayjs(account.updatedAt).format("MMM D, YYYY")
              : "-"}
          </span>,
        ])}
      />
    </div>
  );
}

function UserSessions({ user }: { user: UserDetail }) {
  const revokeSession = useMutation(api.admin.mutations.revokeUserSession);
  const revokeSessions = useMutation(api.admin.mutations.revokeUserSessions);
  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={() =>
          dialogManager.confirm({
            title: "Revoke all sessions",
            description: "This signs the user out on all devices.",
            action: {
              label: "Revoke",
              onClick: async () => {
                await revokeSessions({ userId: user.id });
                toast.success("Sessions revoked");
              },
            },
          })
        }
      >
        Revoke all sessions
      </Button>
      <AdminTable
        headers={["Session", "IP", "User Agent", "Expires", "Actions"]}
        empty="No sessions found."
        rows={user.sessions.map((session) => [
          <span key="id" className="font-mono text-xs">
            {session.id}
          </span>,
          <span key="ip" className="text-muted-foreground text-sm">
            {session.ipAddress ?? "-"}
          </span>,
          <span key="agent" className="line-clamp-2 max-w-sm text-xs">
            {session.userAgent ?? "-"}
          </span>,
          <span key="expires" className="text-muted-foreground text-sm">
            {session.expiresAt
              ? dayjs(session.expiresAt).format("MMM D, YYYY")
              : "-"}
          </span>,
          <Button
            key="revoke"
            variant="outline"
            size="sm"
            onClick={() =>
              void revokeSession({ sessionToken: session.token }).then(() =>
                toast.success("Session revoked"),
              )
            }
          >
            Revoke
          </Button>,
        ])}
      />
    </div>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs font-medium">
        {props.label}
      </div>
      <div className="mt-1 text-sm break-words">{props.value}</div>
    </div>
  );
}

function MetadataItem(props: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs tracking-wider uppercase">
        {props.label}
      </p>
      {props.children}
    </div>
  );
}
