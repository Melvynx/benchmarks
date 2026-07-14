# Page Skeletons and Loading States

## Rule

**EVERY route MUST have a custom `pendingComponent`** — no exceptions. This includes layout routes (`route.tsx`), index pages, and even redirect-only routes. TanStack Router shows the `pendingComponent` during route transitions; without one, the UI looks broken.

## Why

Custom skeletons that match the final layout prevent layout shift and make the app feel instant. The global `defaultPendingComponent` is generic and does NOT match any specific page layout.

## Core Rules

- Use `Skeleton` from `@/components/ui/skeleton`
- The skeleton **MUST match the actual rendered layout** — same wrappers, same grid, same card structure
- Match widths: `w-XX` approximating real text length
- Match heights: `h-4` text, `h-5` card titles, `h-8` headings, `h-9` buttons, `h-10` inputs
- Use `rounded-full` for avatars, `rounded-xl` for cards, `rounded-md` for inputs/buttons
- **Client-side fetching** (`useQuery`): also handle `undefined` state inside the component (return skeleton or `null`)

## Skeleton Types by Route Kind

### 1. Simple Page Skeleton

For leaf pages that render cards or forms inside a layout wrapper.

```tsx
export const Route = createFileRoute("/my-page/")({
  component: MyPage,
  pendingComponent: MyPageSkeleton,
});

function MyPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
```

### 2. Sidebar Layout Skeleton

For layout routes (`route.tsx`) that render a sidebar + inset. Use actual sidebar components (`SidebarProvider`, `Sidebar`, `SidebarInset`, etc.) with `Skeleton` placeholders inside.

Reference: `src/routes/(logged-in)/account/route.tsx` and `src/routes/orgs/$orgSlug/(navigation)/_navigation/org-layout-skeleton.tsx`

```tsx
function LayoutSkeleton() {
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <Skeleton className="h-10 w-full rounded-lg" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>
              <Skeleton className="h-3 w-16" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Skeleton className="h-9 w-full rounded-md" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex w-full max-w-7xl items-center justify-between gap-2 px-4">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Skeleton className="h-8 w-28" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### 3. Reusable Card Skeleton

For account-style pages that render settings cards, reuse `AccountCardSkeleton` from `src/routes/(logged-in)/account/_components/account-card-skeleton.tsx`.

```tsx
import { AccountCardSkeleton } from "./_components/account-card-skeleton";

// For a page with multiple settings cards:
pendingComponent: () => (
  <div className="flex flex-col gap-6">
    <AccountCardSkeleton />
    <AccountCardSkeleton />
    <AccountCardSkeleton hasFooter={false} />
  </div>
);

// For a single-card form page:
pendingComponent: () => <AccountCardSkeleton contentLines={4} />;
```

### 4. Redirect Route Skeleton

Even redirect-only routes need a `pendingComponent` because auth/session checks can take time. Reuse the layout skeleton the user will land on.

```tsx
import { OrgLayoutSkeleton } from "./$orgSlug/(navigation)/_navigation/org-layout-skeleton";

export const Route = createFileRoute("/orgs/")({
  loader: async () => orgsRedirectLoader(),
  component: () => null,
  pendingComponent: OrgLayoutSkeleton,
});
```

### 5. Tab Layout Skeleton

For layout routes that render tab navigation + outlet.

```tsx
function TabsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
```

## Card Skeleton Pattern

Most org/admin pages render `Card` components. Match the card structure:

```tsx
function CardSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <div className="flex flex-col gap-1.5 px-6">
        <Skeleton className="h-5 w-36" /> {/* CardTitle */}
        <Skeleton className="h-4 w-64" /> {/* CardDescription */}
      </div>
      <div className="flex flex-col gap-3 px-6">
        <Skeleton className="h-10 w-80 rounded-md" /> {/* Input */}
      </div>
      <div className="border-t pt-6">
        <div className="flex items-center justify-end px-6">
          <Skeleton className="h-9 w-28 rounded-md" /> {/* Button */}
        </div>
      </div>
    </div>
  );
}
```

## Checklist for New Routes

When creating any new route file:

1. Define a `pendingComponent` skeleton function
2. Add it to the route config: `pendingComponent: MyPageSkeleton`
3. Match the real page's wrapper (`Layout`, `SidebarProvider`, etc.)
4. Match the content structure (number of cards, grid columns, table rows)
5. For `useQuery` data: also return the skeleton when data is `undefined`
