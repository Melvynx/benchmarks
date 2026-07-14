import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, useForm } from "@/features/form/tanstack-form";
import { Layout, LayoutContent } from "@/features/page/layout";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { authClient } from "@/lib/auth-client";
import { dayjs } from "@/lib/dayjs";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  CheckCircle2,
  Crown,
  MoreHorizontal,
  Plus,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  AdminPageHeader,
  AdminSearch,
  AdminTable,
  StatusBadge,
} from "../_components/admin-shared";
import { AdminTableListPageSkeleton } from "../_components/admin-skeletons";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export const Route = createFileRoute("/admin/users/")({
  validateSearch: z.object({
    q: z.string().optional().default(""),
    page: z.number().optional().default(1),
    role: z.enum(["admin", "user"]).optional(),
    status: z.enum(["active", "banned"]).optional(),
    sort: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
  component: AdminUsersRoute,
  pendingComponent: () => (
    <AdminTableListPageSkeleton
      withAction
      filterCount={2}
      headers={["User", "Role", "Status", "Joined", "Actions"]}
    />
  ),
});

function AdminUsersRoute() {
  const search = useSearch({ from: "/admin/users/" });
  const navigate = useNavigate({ from: "/admin/users/" });
  const usersData = useQuery(api.admin.queries.listUsers, {
    page: search.page,
    pageSize: 20,
    search: search.q || undefined,
    role: search.role,
    status: search.status,
    sort: search.sort,
  });

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <AdminPageHeader
            title="Users"
            description="Search users, manage roles, bans, and impersonation."
            action={
              <Button onClick={openCreateUserDialog}>
                <Plus className="size-4" />
                Create user
              </Button>
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <AdminSearch
              value={search.q}
              onChange={(q) =>
                void navigate({ search: (prev) => ({ ...prev, q, page: 1 }) })
              }
            />
            <Select
              value={search.role ?? "all"}
              onValueChange={(role) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    role:
                      role === "all" ? undefined : (role as "admin" | "user"),
                    page: 1,
                  }),
                })
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={search.status ?? "all"}
              onValueChange={(status) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    status:
                      status === "all"
                        ? undefined
                        : (status as "active" | "banned"),
                    page: 1,
                  }),
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AdminTable
            headers={["User", "Role", "Status", "Joined", "Actions"]}
            empty="No users found."
            rows={usersData?.users.map((user) => [
              <Link
                key="user"
                to="/admin/users/$userId"
                params={{ userId: user.id }}
                className="flex items-center gap-3"
              >
                <Avatar className="size-8">
                  {user.image ? <AvatarImage src={user.image} /> : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {user.name || user.email}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {user.email}
                  </span>
                </span>
              </Link>,
              <Badge
                key="role"
                variant={user.role === "admin" ? "default" : "outline"}
              >
                {user.role}
              </Badge>,
              <StatusBadge
                key="status"
                value={user.banned ? "banned" : "active"}
              />,
              <span key="joined" className="text-muted-foreground text-sm">
                {user.createdAt
                  ? dayjs(user.createdAt).format("MMM D, YYYY")
                  : "-"}
              </span>,
              <UserActions key="actions" user={user} />,
            ])}
          />
        </div>
      </LayoutContent>
    </Layout>
  );
}

type AdminUser = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.queries.listUsers>>
>["users"][number];

function UserActions({ user }: { user: AdminUser }) {
  const setRole = useMutation(api.admin.mutations.setUserRole);
  const banUser = useMutation(api.admin.mutations.banUser);
  const unbanUser = useMutation(api.admin.mutations.unbanUser);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="size-8 p-0"
          aria-label="Open actions menu"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {!user.banned ? (
          <DropdownMenuItem
            onClick={() =>
              void run(async () => {
                await authClient.admin.impersonateUser({ userId: user.id });
                window.location.href = "/orgs";
              }, "Now impersonating user")
            }
          >
            <UserCog className="mr-2 size-4" />
            Impersonate
          </DropdownMenuItem>
        ) : null}
        {user.role !== "admin" ? (
          <DropdownMenuItem
            onClick={() =>
              void run(
                async () => setRole({ userId: user.id, role: "admin" }),
                "User role updated",
              )
            }
          >
            <Crown className="mr-2 size-4" />
            Make admin
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() =>
              void run(
                async () => setRole({ userId: user.id, role: "user" }),
                "User role updated",
              )
            }
          >
            <UserCog className="mr-2 size-4" />
            Make regular user
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {user.banned ? (
          <DropdownMenuItem
            className="text-primary"
            onClick={() =>
              void run(
                async () => unbanUser({ userId: user.id }),
                "User has been unbanned",
              )
            }
          >
            <CheckCircle2 className="mr-2 size-4" />
            Unban user
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() =>
              openBanUserDialog(user, async (reason) =>
                run(
                  async () => banUser({ userId: user.id, reason }),
                  "User has been banned",
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

function openBanUserDialog(
  user: Pick<AdminUser, "email" | "name">,
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

function CreateUserForm() {
  const createUser = useMutation(api.admin.mutations.createUser);
  const form = useForm({
    schema: createUserSchema,
    defaultValues: { name: "", email: "", password: "" },
    onSubmit: async (values) => {
      await createUser({ ...values, role: "user" });
      toast.success("User created");
      dialogManager.closeAll();
    },
  });

  return (
    <Form form={form} className="space-y-4">
      <form.AppField name="name">
        {(field) => (
          <field.Field>
            <field.Label>Name</field.Label>
            <field.Content>
              <field.Input placeholder="Jane Creator" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>
      <form.AppField name="email">
        {(field) => (
          <field.Field>
            <field.Label>Email</field.Label>
            <field.Content>
              <field.Input type="email" placeholder="jane@example.com" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>
      <form.AppField name="password">
        {(field) => (
          <field.Field>
            <field.Label>Password</field.Label>
            <field.Content>
              <field.Input type="password" placeholder="Minimum 8 characters" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>
      <form.SubmitButton className="w-full">Create user</form.SubmitButton>
    </Form>
  );
}

function openCreateUserDialog() {
  dialogManager.custom({
    title: "Create user",
    description: "Create a new email/password account.",
    size: "md",
    children: <CreateUserForm />,
  });
}
