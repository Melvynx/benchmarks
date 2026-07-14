import { AvatarUploader } from "@/components/avatar-upload";
import { Typography } from "@/components/nowts/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarNavigationMenu } from "@/components/ui/sidebar-utils";
import type { NavigationGroup } from "@/features/navigation/navigation.type";
import { SidebarUserButton } from "@/features/sidebar/sidebar-user-button";
import { uploadImageFile } from "@/features/images/upload-image";
import { LoadingButton } from "@/features/form/submit-button";
import { ClientSessionGuard } from "@/lib/auth/client-route-guard";
import { authClient, signOut } from "@/lib/auth-client";
import { api } from "@convex/_generated/api";
import {
  Outlet,
  createFileRoute,
  Link,
  useLocation,
} from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  BadgeCheck,
  ChevronsUpDown,
  Check,
  Copy,
  Mail,
  Shield,
  User2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  ssr: false,
  component: AccountRoute,
});

function AccountRoute() {
  return (
    <ClientSessionGuard>
      <AccountContent />
    </ClientSessionGuard>
  );
}

function AccountContent() {
  const location = useLocation();
  const isAccountIndex = location.pathname === "/account";

  return (
    <SidebarProvider>
      <AccountSidebar />
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="m-auto mt-4 flex w-full max-w-7xl items-center justify-between gap-2 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger
                variant="outline"
                className="size-8 cursor-pointer"
              />
              <div className="min-w-0">
                <Typography variant="h3" className="truncate">
                  Account
                </Typography>
                <Typography variant="muted" className="hidden text-xs sm:block">
                  Profile, security, and notification preferences.
                </Typography>
              </div>
            </div>
            <SignOutButton />
          </div>
        </header>
        <div className="m-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4">
          <div className="flex w-full flex-col gap-4">
            {isAccountIndex ? <ProfilePage /> : <Outlet />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SignOutButton() {
  const redirectToSignIn = () => {
    window.location.href = "/auth/signin";
  };

  return (
    <Button
      variant="outline"
      onClick={() => {
        const fallback = window.setTimeout(redirectToSignIn, 1000);
        void signOut()
          .catch(() => null)
          .finally(() => {
            window.clearTimeout(fallback);
            redirectToSignIn();
          });
      }}
    >
      Sign out
    </Button>
  );
}

const accountLinks: NavigationGroup[] = [
  {
    title: "Your profile",
    links: [
      { href: "/account", Icon: User2, label: "Profile" },
      { href: "/account/email", Icon: Mail, label: "Mail" },
      { href: "/account/change-password", Icon: Shield, label: "Security" },
      { href: "/account/danger", Icon: AlertCircle, label: "Danger" },
    ],
  },
];

type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

type OrganizationsResponse = {
  items: UserOrganization[];
};

function AccountSidebar() {
  const organizationsData = useQuery(api.app.listUserOrganizations, {}) as
    | OrganizationsResponse
    | undefined;
  const organizations = organizationsData?.items ?? [];

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <AccountOrgSelector
          organizations={organizations}
          isLoading={organizationsData === undefined}
        />
      </SidebarHeader>
      <SidebarContent>
        {accountLinks.map((link) => (
          <SidebarGroup key={link.title}>
            <SidebarGroupLabel>
              {link.title}
              <ChevronsUpDown className="ml-auto size-4 opacity-50" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarNavigationMenu link={link} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2">
          <Link
            className="text-muted-foreground text-xs hover:underline"
            to="/docs"
          >
            Docs
          </Link>
          <Link
            className="text-muted-foreground text-xs hover:underline"
            to="/legal/terms"
          >
            Terms
          </Link>
        </div>
        <SidebarUserButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function AccountOrgSelector(props: {
  organizations: UserOrganization[];
  isLoading: boolean;
}) {
  const firstOrg = props.organizations[0];

  if (props.isLoading) {
    return (
      <div className="flex h-12 items-center gap-2 rounded-md border px-2">
        <Skeleton className="size-8 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  if (props.organizations.length === 0) {
    return (
      <Button
        variant="outline"
        className="h-12 justify-start gap-2 px-2"
        disabled
      >
        <span className="flex w-full items-center gap-2">
          <OrgAvatar name="Workspace" image={null} />
          <span className="min-w-0 flex-1 truncate text-left">
            No workspace
          </span>
        </span>
      </Button>
    );
  }

  return (
    <Button variant="outline" className="h-12 justify-start gap-2 px-2" asChild>
      <Link to="/orgs/$orgSlug" params={{ orgSlug: firstOrg.slug }}>
        <OrgAvatar name={firstOrg.name} image={firstOrg.logo} />
        <span className="min-w-0 flex-1 truncate text-left">
          {firstOrg.name}
        </span>
        <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
      </Link>
    </Button>
  );
}

function OrgAvatar(props: { name: string; image?: string | null }) {
  const fallback = props.name.charAt(0).toUpperCase() || "?";

  return (
    <Avatar className="size-8 rounded-lg">
      {props.image ? <AvatarImage src={props.image} alt={props.name} /> : null}
      <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
    </Avatar>
  );
}

function ProfilePage() {
  const [name, setName] = useState<string | null>(null);
  const [image, setImage] = useState<string | null | undefined>(undefined);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const profile = useQuery(api.app.getProfile, {});
  const updateProfile = useMutation(api.app.updateProfile);
  const generateUploadUrl = useMutation(api.userImages.generateUploadUrl);
  const completeImageUpload = useMutation(api.userImages.completeImageUpload);

  if (!profile) {
    return <ProfileCardSkeleton />;
  }

  const displayedName = name ?? profile.user.name;
  const displayedImage = image === undefined ? profile.user.image : image;

  async function saveProfile(next: { name?: string; image?: string | null }) {
    const result = await updateProfile({
      name: (next.name ?? displayedName).trim(),
      image: next.image ?? displayedImage ?? null,
    });
    setName(result.user.name);
    setImage(result.user.image ?? null);
    await authClient.getSession();
    return result;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Your Avatar</CardTitle>
            <CardDescription>
              Upload a profile image that identifies your account.
            </CardDescription>
          </div>
          <AvatarUploader
            currentAvatar={displayedImage ?? null}
            onImageChange={(file) => {
              setIsUploadingAvatar(true);
              void uploadImageFile(file, {
                generateUploadUrl: async () => generateUploadUrl({}),
                completeImageUpload: async ({ storageId }) =>
                  completeImageUpload({ storageId: storageId as never }),
              })
                .then((url) => {
                  setImage(url);
                  toast.success("Avatar uploaded");
                })
                .catch((error) => {
                  toast.error(
                    error instanceof Error ? error.message : "Upload failed",
                  );
                })
                .finally(() => {
                  setIsUploadingAvatar(false);
                });
            }}
          />
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Typography variant="muted" className="text-sm">
            Square images work best. Your avatar is visible inside workspaces.
          </Typography>
          <LoadingButton
            type="button"
            size="sm"
            variant="outline"
            loading={isSavingAvatar || isUploadingAvatar}
            onClick={() => {
              setIsSavingAvatar(true);
              void saveProfile({ image: displayedImage ?? null })
                .then(() => {
                  toast.success("Avatar saved");
                })
                .catch((error) => {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Avatar update failed",
                  );
                })
                .finally(() => {
                  setIsSavingAvatar(false);
                });
            }}
          >
            Save changes
          </LoadingButton>
        </CardFooter>
      </Card>

      <Card>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            setIsSavingName(true);
            void saveProfile({ name: displayedName })
              .then(() => {
                toast.success("Name updated");
              })
              .catch((error) => {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Profile update failed",
                );
              })
              .finally(() => {
                setIsSavingName(false);
              });
          }}
        >
          <CardHeader>
            <CardTitle>Your Name</CardTitle>
            <CardDescription>
              This is your display name across Thumbfa.st.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid max-w-sm gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={displayedName}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Typography variant="muted" className="text-sm">
              Max 32 characters.
            </Typography>
            <LoadingButton
              type="submit"
              size="sm"
              variant="outline"
              loading={isSavingName}
            >
              Save changes
            </LoadingButton>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Email</CardTitle>
          <CardDescription>
            Used for login, invoices, and account notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-sm gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2">
              <Input
                id="email"
                name="email"
                value={profile.user.email}
                readOnly
              />
              {profile.user.emailVerified ? (
                <Badge variant="outline" className="h-9 gap-1.5 px-3">
                  <BadgeCheck className="size-3.5" />
                  Verified
                </Badge>
              ) : (
                <LoadingButton
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={isVerifyingEmail}
                  data-testid="verify-email-button"
                  onClick={() => {
                    setIsVerifyingEmail(true);
                    void authClient
                      .sendVerificationEmail({ email: profile.user.email })
                      .then(({ error }) => {
                        if (error) {
                          toast.error(error.message);
                          return;
                        }
                        toast.success("Verification email sent");
                      })
                      .finally(() => {
                        setIsVerifyingEmail(false);
                      });
                  }}
                >
                  Verify
                </LoadingButton>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Typography variant="muted" className="text-sm">
            Changing your email requires verification.
          </Typography>
          <Button size="sm" variant="outline" asChild>
            <Link to="/account/change-email">Change email</Link>
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Keep your password current and revoke sessions when needed.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end border-t pt-4">
          <Button size="sm" variant="outline" asChild>
            <Link to="/account/change-password">Change password</Link>
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your User ID</CardTitle>
          <CardDescription>
            Use this identifier when contacting support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-sm items-center gap-2">
            <Input value={profile.user.id} readOnly />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy user ID"
              onClick={() => {
                void navigator.clipboard.writeText(profile.user.id);
                setCopiedUserId(true);
                window.setTimeout(() => {
                  setCopiedUserId(false);
                }, 2000);
              }}
            >
              {copiedUserId ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Typography variant="muted" className="text-sm">
            This value is unique to your Thumbfa.st account.
          </Typography>
        </CardFooter>
      </Card>
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4">
      <AccountCardSkeleton media />
      <AccountCardSkeleton />
      <AccountCardSkeleton />
      <AccountCardSkeleton compact />
    </div>
  );
}

function AccountCardSkeleton(props: { media?: boolean; compact?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        {props.media ? <Skeleton className="size-16 rounded-full" /> : null}
      </CardHeader>
      {props.compact ? null : (
        <CardContent>
          <div className="max-w-sm space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        </CardContent>
      )}
      <CardFooter className="flex flex-col items-start gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="h-8 w-28" />
      </CardFooter>
    </Card>
  );
}
