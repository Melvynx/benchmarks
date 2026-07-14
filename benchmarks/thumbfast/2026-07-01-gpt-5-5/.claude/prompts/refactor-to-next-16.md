NextJS 16 change the logic or pre-rendering and in order to remove this kind of warning :

```
Error occurred prerendering page "/orgs/new". Read more: https://nextjs.org/docs/messages/prerender-error
Error: Route "/docs/[slug]": Uncached data was accessed outside of <Suspense>. This delays the entire page from rendering, resulting in a slow user experience. Learn more: https://nextjs.org/docs/messages/blocking-route
    at Providers (turbopack:///[project]/app/providers.tsx:13:29)
    at body (<anonymous>)
    at html (<anonymous>)
  11 | const queryClient = new QueryClient();
  12 |
> 13 | export const Providers = ({ children }: PropsWithChildren) => {
     |                             ^
  14 |   return (
  15 |     <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  16 |       <QueryClientProvider client={queryClient}>
To get a more detailed stack trace and pinpoint the issue, start the app in development mode by running `next dev`, then open "/docs/[slug]" in your browser to investigate the error.
Error occurred prerendering page "/docs/embedding". Read more: https://nextjs.org/docs/messages/prerender-error
```

## Exemple 1

You need to check at the code of `/orgs/new` and refactor it as follow :

BEFORE :

```tsx
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { AccountNavigation } from "../../(logged-in)/(account-layout)/account-navigation";
import { NewOrganizationForm } from "./new-org-form";

export default async function RoutePage() {
  await getRequiredUser();

  return (
    <AccountNavigation>
      <Layout>
        <LayoutHeader>
          <LayoutTitle>Create a new organization</LayoutTitle>
        </LayoutHeader>
        <LayoutContent>
          <NewOrganizationForm />
        </LayoutContent>
      </Layout>
    </AccountNavigation>
  );
}
```

AFTER :

```tsx
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { Suspense } from "react";
import { AccountNavigation } from "../../(logged-in)/(account-layout)/account-navigation";
import { NewOrganizationForm } from "./new-org-form";

export default async function Page() {
  return (
    <AccountNavigation>
      <Layout>
        <LayoutHeader>
          <LayoutTitle>Create a new organization</LayoutTitle>
        </LayoutHeader>
        <LayoutContent>
          <Suspense fallback={null}>
            <RoutePage />
          </Suspense>
        </LayoutContent>
      </Layout>
    </AccountNavigation>
  );
}

async function RoutePage() {
  await getRequiredUser();

  return <NewOrganizationForm />;
}
```

## Exemple 2

BEFORE :

```tsx
import { getRequiredUser } from "@/lib/auth/auth-user";
import { combineWithParentMetadata } from "@/lib/metadata";
import { EditProfileCardForm } from "./edit-profile-form";

export const generateMetadata = combineWithParentMetadata({
  title: "Settings",
  description: "Update your profile.",
});

export default async function EditProfilePage() {
  const user = await getRequiredUser();

  return (
    <div className="flex flex-col gap-4 lg:gap-8">
      <EditProfileCardForm defaultValues={user} />
    </div>
  );
}
```

AFTER :

```tsx
import { getRequiredUser } from "@/lib/auth/auth-user";
import { combineWithParentMetadata } from "@/lib/metadata";
import { Suspense } from "react";
import { EditProfileCardForm } from "./edit-profile-form";

export const generateMetadata = combineWithParentMetadata({
  title: "Settings",
  description: "Update your profile.",
});

export default function Page() {
  return (
    <div className="flex flex-col gap-4 lg:gap-8">
      <Suspense fallback={null}>
        <EditProfilePage />
      </Suspense>
    </div>
  );
}

async function EditProfilePage() {
  const user = await getRequiredUser();

  return (
    <div className="flex flex-col gap-4 lg:gap-8">
      <EditProfileCardForm defaultValues={user} />
    </div>
  );
}
```

## Exemple 3 - With Params

When you have params, you need to await them inside a suspended component :

BEFORE :

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { getRequiredAdmin } from "@/lib/auth/auth-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserDetailsCard } from "../../_components/user-details-card";
import { UserActions } from "./_components/user-actions";
import { UserProviders } from "./_components/user-providers";
import { UserSessions } from "./_components/user-sessions";

export default async function RoutePage(props: {
  params: Promise<{ userId: string }>;
}) {
  const params = await props.params;
  await getRequiredAdmin();

  const userData = await prisma.user.findUnique({
    where: {
      id: params.userId,
    },
    include: {
      members: {
        include: {
          organization: {
            include: {
              subscription: true,
            },
          },
        },
      },
      accounts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!userData) {
    notFound();
  }

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>User Details</LayoutTitle>
        <LayoutDescription>
          View and manage user information and organization memberships
        </LayoutDescription>
      </LayoutHeader>
      <LayoutActions>
        <UserActions user={userData} />
      </LayoutActions>

      <LayoutContent className="flex flex-col gap-4">
        <UserDetailsCard user={userData} />
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            {userData.members.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center">
                No organizations found
              </div>
            ) : (
              <ItemGroup>
                {userData.members.map((memberRole) => (
                  <Item key={memberRole.id} variant="outline" size="sm" asChild>
                    <Link
                      href={`/admin/organizations/${memberRole.organization.id}`}
                    >
                      <ItemMedia variant="image">
                        <Avatar className="size-10">
                          <AvatarImage
                            src={memberRole.organization.logo ?? undefined}
                            alt={memberRole.organization.name}
                          />
                          <AvatarFallback className="text-sm">
                            {memberRole.organization.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{memberRole.organization.name}</ItemTitle>
                        <ItemDescription>
                          {memberRole.organization.email} • Role:{" "}
                          {memberRole.role}
                          {memberRole.organization.subscription && (
                            <>
                              {" • "}
                              <Badge
                                variant={
                                  memberRole.organization.subscription
                                    .status === "active"
                                    ? "default"
                                    : memberRole.organization.subscription
                                          .status === "canceled"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {memberRole.organization.subscription.plan}
                                {memberRole.organization.subscription.status &&
                                  ` (${memberRole.organization.subscription.status})`}
                              </Badge>
                            </>
                          )}
                        </ItemDescription>
                      </ItemContent>
                    </Link>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </CardContent>
        </Card>

        <UserSessions userId={userData.id} />
        <UserProviders accounts={userData.accounts} />
      </LayoutContent>
    </Layout>
  );
}
```

AFTER :

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { getRequiredAdmin } from "@/lib/auth/auth-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { UserDetailsCard } from "../../_components/user-details-card";
import { UserActions } from "./_components/user-actions";
import { UserProviders } from "./_components/user-providers";
import { UserSessions } from "./_components/user-sessions";

export default async function Page(props: PageProps<"/admin/users/[userId]">) {
  return (
    <Suspense fallback={null}>
      <RoutePage {...props} />
    </Suspense>
  );
}

async function RoutePage(props: PageProps<"/admin/users/[userId]">) {
  const params = await props.params;
  await getRequiredAdmin();

  const userData = await prisma.user.findUnique({
    where: {
      id: params.userId,
    },
    include: {
      members: {
        include: {
          organization: {
            include: {
              subscription: true,
            },
          },
        },
      },
      accounts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!userData) {
    notFound();
  }

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>User Details</LayoutTitle>
        <LayoutDescription>
          View and manage user information and organization memberships
        </LayoutDescription>
      </LayoutHeader>
      <LayoutActions>
        <UserActions user={userData} />
      </LayoutActions>

      <LayoutContent className="flex flex-col gap-4">
        <UserDetailsCard user={userData} />
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            {userData.members.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center">
                No organizations found
              </div>
            ) : (
              <ItemGroup>
                {userData.members.map((memberRole) => (
                  <Item key={memberRole.id} variant="outline" size="sm" asChild>
                    <Link
                      href={`/admin/organizations/${memberRole.organization.id}`}
                    >
                      <ItemMedia variant="image">
                        <Avatar className="size-10">
                          <AvatarImage
                            src={memberRole.organization.logo ?? undefined}
                            alt={memberRole.organization.name}
                          />
                          <AvatarFallback className="text-sm">
                            {memberRole.organization.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{memberRole.organization.name}</ItemTitle>
                        <ItemDescription>
                          {memberRole.organization.email} • Role:{" "}
                          {memberRole.role}
                          {memberRole.organization.subscription && (
                            <>
                              {" • "}
                              <Badge
                                variant={
                                  memberRole.organization.subscription
                                    .status === "active"
                                    ? "default"
                                    : memberRole.organization.subscription
                                          .status === "canceled"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {memberRole.organization.subscription.plan}
                                {memberRole.organization.subscription.status &&
                                  ` (${memberRole.organization.subscription.status})`}
                              </Badge>
                            </>
                          )}
                        </ItemDescription>
                      </ItemContent>
                    </Link>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </CardContent>
        </Card>

        <UserSessions userId={userData.id} />
        <UserProviders accounts={userData.accounts} />
      </LayoutContent>
    </Layout>
  );
}
```
