import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineTooltip } from "@/components/ui/tooltip";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { Form, useForm } from "@/features/form/tanstack-form";
import { useSession } from "@/lib/auth-client";
import type { AuthRole } from "@/lib/auth/auth-permissions";
import { RolesKeys } from "@/lib/auth/auth-permissions";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Copy, MoreVertical, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

type Member = {
  id: string;
  role: AuthRole;
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: AuthRole;
  status: string;
  expiresAt: number | null;
};

const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["member", "admin"]),
});

export const Route = createFileRoute("/orgs/$orgSlug/settings/members")({
  component: OrgMembersRoute,
});

function OrgMembersRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/members",
  });
  const membersData = useQuery(api.app.listMembers, { orgSlug }) as
    | { members: Member[]; invitations: Invitation[] }
    | undefined;
  const updateMemberRole = useMutation(api.app.updateMemberRole);
  const removeMember = useMutation(api.app.removeMember);
  const cancelInvitation = useMutation(api.app.cancelInvitation);
  const session = useSession();
  const members = membersData?.members ?? [];
  const invitations = membersData?.invitations ?? [];
  const [renderedAt] = useState(() => Date.now());

  const handleCopy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handleRemoveMember = (memberId: string) => {
    dialogManager.confirm({
      title: "Remove member",
      description:
        "Are you sure you want to remove this member from the organization?",
      action: {
        label: "Remove",
        onClick: async () => {
          await removeMember({ orgSlug, memberId });
          toast.success("Member removed successfully");
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex w-full flex-row items-center gap-4 space-y-0">
        <div className="flex flex-col gap-2">
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Teammates that have access to this workspace.
          </CardDescription>
        </div>
        <div className="flex-1" />
        <OrganizationInviteMemberForm orgSlug={orgSlug} />
      </CardHeader>

      <Tabs defaultValue="members" className="mt-4 gap-0">
        <TabsList className="flex gap-4 px-6">
          <TabsTrigger
            value="members"
            className="text-muted-foreground hover:bg-accent/50 data-[state=active]:border-foreground translate-y-px rounded-t-md border-b px-3 py-2 text-sm transition"
          >
            Members
          </TabsTrigger>
          <TabsTrigger
            value="invitations"
            className="text-muted-foreground hover:bg-accent/50 data-[state=active]:border-foreground translate-y-px rounded-t-md border-b px-3 py-2 text-sm transition"
          >
            Invitations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-0 border-t pt-4">
          <CardContent className="flex flex-col">
            {members.length === 0 ? (
              <p className="text-muted-foreground text-sm">No members</p>
            ) : (
              members.map((member, index) => {
                const isCurrentUser = member.user.id === session.data?.user.id;
                const isOwner = member.role === "owner";

                return (
                  <div key={`${member.id}-${member.user.email}-${index}`}>
                    <div className="my-2 flex flex-wrap items-center gap-2">
                      <Avatar>
                        <AvatarFallback>
                          {member.user.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                        {member.user.image ? (
                          <AvatarImage src={member.user.image} />
                        ) : null}
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.user.name || member.user.email}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {member.user.email}
                        </p>
                      </div>
                      <div className="flex-1" />

                      {isOwner ? (
                        <InlineTooltip title="You can't change the role of an owner">
                          <p className="text-muted-foreground text-sm">Owner</p>
                        </InlineTooltip>
                      ) : (
                        <Select
                          disabled={isCurrentUser}
                          value={member.role}
                          onValueChange={async (value) => {
                            await updateMemberRole({
                              orgSlug,
                              memberId: member.id,
                              role: value as AuthRole,
                            });
                            toast.success("Member role updated successfully");
                          }}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {RolesKeys.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              void handleCopy(member.id, "Member ID")
                            }
                          >
                            <Copy className="mr-2 size-4" />
                            Copy member ID
                          </DropdownMenuItem>
                          {isCurrentUser || isOwner ? null : (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash className="mr-2 size-4" />
                              Delete member
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </TabsContent>

        <TabsContent value="invitations" className="mt-0 border-t pt-4">
          <CardContent className="flex flex-col">
            {invitations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No invitations</p>
            ) : (
              invitations.map((invitation, index) => {
                const isExpired = invitation.expiresAt
                  ? invitation.expiresAt < renderedAt
                  : false;
                const isCanceled =
                  invitation.status === "canceled" || isExpired;

                return (
                  <div key={`${invitation.id}-${invitation.email}-${index}`}>
                    <div className="my-2 flex flex-wrap items-center gap-2">
                      <Avatar>
                        <AvatarFallback>
                          {invitation.email.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/orgs/accept-invitation/$invitationId"
                          params={{ invitationId: invitation.id }}
                          className={cn("text-sm font-medium", {
                            "text-muted-foreground line-through": isCanceled,
                          })}
                        >
                          {invitation.email}
                        </Link>

                        <Badge variant="outline">
                          {isExpired ? "Expired" : invitation.status}
                        </Badge>
                      </div>
                      <div className="flex-1" />
                      <p className="text-muted-foreground text-sm">
                        {invitation.role}
                      </p>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() =>
                              void handleCopy(invitation.id, "Invitation ID")
                            }
                          >
                            <Copy className="mr-2 size-4" />
                            Copy invitation ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled={isCanceled}
                            onClick={async (event) => {
                              event.preventDefault();
                              await cancelInvitation({
                                orgSlug,
                                invitationId: invitation.id,
                              });
                              toast.success("Invitation removed successfully");
                            }}
                          >
                            <Trash className="mr-2 size-4" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function OrganizationInviteMemberForm({ orgSlug }: { orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const inviteMember = useMutation(api.app.inviteMember);

  const form = useForm({
    schema: InviteMemberSchema,
    defaultValues: {
      email: "",
      role: "member",
    },
    onSubmit: async (values) => {
      await inviteMember({
        orgSlug,
        email: values.email,
        role: values.role,
      });
      toast.success("Invitation sent");
      setOpen(false);
      form.reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(value) => setOpen(value)}>
      <DialogTrigger asChild>
        <Button type="button">Invite</Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-md">
        <DialogHeader className="p-6">
          <div className="mt-4 flex justify-center">
            <Avatar className="size-16">
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
          </div>
          <DialogTitle className="text-center">Invite Teammates</DialogTitle>
          <DialogDescription className="text-center">
            Invite members to collaborate in your organization
          </DialogDescription>
        </DialogHeader>

        <div className="border-t p-6">
          <Form form={form}>
            <div className="flex flex-col gap-8">
              <div className="flex items-end gap-4">
                <form.AppField name="email">
                  {(field) => (
                    <field.Field className="flex-2">
                      <field.Label>Email</field.Label>
                      <field.Content>
                        <field.Input
                          type="email"
                          placeholder="colleague@company.com"
                        />
                        <field.Message />
                      </field.Content>
                    </field.Field>
                  )}
                </form.AppField>

                <form.AppField name="role">
                  {(field) => (
                    <field.Field className="flex-1">
                      <field.Label>Role</field.Label>
                      <field.Content>
                        <field.Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {RolesKeys.filter((role) => role !== "owner").map(
                              (role) => (
                                <SelectItem key={role} value={role}>
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </field.Select>
                        <field.Message />
                      </field.Content>
                    </field.Field>
                  )}
                </form.AppField>
              </div>

              <form.SubmitButton className="w-full">
                Send invite
              </form.SubmitButton>
            </div>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
