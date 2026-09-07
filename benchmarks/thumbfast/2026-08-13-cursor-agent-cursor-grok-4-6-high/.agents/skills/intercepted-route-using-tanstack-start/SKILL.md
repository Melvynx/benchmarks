---
name: intercepted-route-using-tanstack-start
description: "Implement intercepted/modal routes in NowStack TanStack Start using route masks, real shareable URLs, refresh-to-full-page behavior, and browser verification."
---

# Intercepted Route Using TanStack Start

Use this skill when a UI should open as a modal during client navigation while the browser URL shows the real destination path, and a refresh or direct visit should render the destination as a full page.

This is the TanStack Start equivalent of a Next.js intercepted route. Do not use `?modal=...` as the visible URL for this UX.

## Desired Behavior

For a list-to-detail flow:

1. User starts on `/items`.
2. User clicks an item.
3. Browser URL becomes `/items/$id`.
4. UI still shows `/items` context with a modal on top.
5. Back closes the modal and returns to `/items`.
6. Refresh or direct visit on `/items/$id` renders the full detail page.

For a global modal like sign-in:

1. User starts on `/docs`.
2. User clicks `Sign in`.
3. Browser URL becomes `/auth/signin`.
4. UI shows the sign-in modal over `/docs`.
5. Back or close returns to `/docs`.
6. Refresh on `/auth/signin` renders the full sign-in page.

## Core Pattern

Navigate to the source route internally, store modal state in that source route's search, and mask the browser URL as the real destination route.

```tsx
<Link
  to="/changelog"
  search={{ entry: changelog.slug }}
  mask={{
    to: "/changelog/$slug",
    params: { slug: changelog.slug },
    unmaskOnReload: true,
  }}
  resetScroll={false}
>
  {changelog.attributes.title}
</Link>
```

The source route owns the modal state:

```tsx
type ChangelogSearch = {
  entry?: string;
};

export const Route = createFileRoute("/(layout)/changelog/")({
  validateSearch: (search: Record<string, unknown>): ChangelogSearch => ({
    entry:
      typeof search.entry === "string" && search.entry.length > 0
        ? search.entry
        : undefined,
  }),
  loader: changelogLoader,
  component: ChangelogPage,
  pendingComponent: ChangelogPageSkeleton,
});

function ChangelogPage() {
  const { changelogs } = Route.useLoaderData();
  const { entry } = Route.useSearch();

  return <ChangelogTimeline changelogs={changelogs} selectedSlug={entry} />;
}
```

The destination route remains a normal route. It must be usable on direct visit and refresh:

```tsx
export const Route = createFileRoute("/(layout)/changelog/$slug/")({
  loader: async ({ params }) => {
    const item = await loadItem(params.slug);
    if (!item) throw notFound();
    return item;
  },
  component: ChangelogDetailPage,
  pendingComponent: ChangelogDetailPageSkeleton,
});
```

## Closing the Modal

Do not blindly call `router.history.back()` for every close. Only do that when the current location is masked.

```tsx
const router = useRouter();
const location = useLocation();

const closeModal = () => {
  if (location.maskedLocation) {
    router.history.back();
    return;
  }

  void router.navigate({
    to: "/changelog",
    search: {},
    replace: true,
  });
};
```

Use this close handler for dialog `onOpenChange`.

## Opening the Full Page from the Modal

If the modal has an "Open page" action, avoid firing the close handler first. Closing a masked modal usually calls `history.back()`, which races with the full-page navigation and can return to the source page.

```tsx
void router.navigate({
  to: "/changelog/$slug",
  params: { slug },
  replace: true,
});
```

If the same dialog component is also used outside an intercepted route, add explicit props:

```tsx
<ChangelogDialog
  changelog={selectedChangelog}
  openPageReplace
  closeOnOpenPage={false}
  onOpenChange={(open) => {
    if (!open) closeModal();
  }}
/>
```

## Global Modal Variant

For global modals mounted at the root, keep the visible URL masked but the internal state on the current route:

```tsx
<Link
  to="."
  search={(previous) => ({ ...previous, modal: "signin" })}
  mask={{ to: "/auth/signin", unmaskOnReload: true }}
>
  Sign in
</Link>
```

Keep the source route mounted exactly the same while the modal search state is added. Do not conditionally swap root layouts, providers, auth wrappers, query providers, or Suspense boundaries based on `modal`, `callbackUrl`, or other internal modal search values. That can remount the background page even when the URL mask is technically working.

For example, if `/` uses a static landing provider setup, keep that setup stable while `modal=signin` is present:

```tsx
const isStaticLandingRequest = location.pathname === "/";
```

Avoid:

```tsx
const isStaticLandingRequest =
  location.pathname === "/" && search.modal !== "signin";
```

The root/global dialog reads the internal search state:

```tsx
const search = useSearch({ strict: false }) as { modal?: string };
const isOpen = search.modal === "signin";
```

Close with the same masked-location guard:

```tsx
const closeDialog = () => {
  if (location.maskedLocation) {
    router.history.back();
    return;
  }

  void router.navigate({
    to: ".",
    search: (previous) => ({ ...previous, modal: undefined }),
    replace: true,
  });
};
```

## Rules

- Always keep the destination route as a real route with its own loader, SEO/head metadata when needed, and `pendingComponent`.
- Use `mask={{ to: realDestination, unmaskOnReload: true }}` for refresh-to-full-page behavior.
- Keep modal state internal to the source route search, not visible as `?modal=...` in the browser URL.
- Use `location.maskedLocation` before deciding whether close should call `history.back()`.
- Do not call a modal close handler immediately before "open full page" navigation from inside the modal.
- Preserve callback/search data in the internal route search when the modal flow needs it.
- Add or update e2e coverage for click, close/back, refresh, and direct destination visit.
- For global modals, verify the background page does not remount. A DOM marker probe on a source-route element before click should still exist after the masked URL and dialog appear.

## Verification

For routes/UI flows, use the repo workflow:

```bash
pnpm ts
pnpm lint:ci
pnpm start-all -p <port>
PLAYWRIGHT_TEST_BASE_URL=http://localhost:<port> HEADLESS=TRUE pnpm exec playwright test e2e/<spec>.ts
```

Also verify manually with `dev-browser` when behavior matters:

1. Visit the source page.
2. Click the masked/intercepted link.
3. Confirm the browser URL is the destination URL.
4. Confirm the modal is visible.
5. Refresh.
6. Confirm the modal is gone and the full destination page is visible.

## Existing References

- Changelog route mask: `src/features/changelog/changelog-timeline.tsx`
- Changelog source route search: `src/routes/(layout)/changelog/index.tsx`
- Changelog destination route: `src/routes/(layout)/changelog/$slug/index.tsx`
- Sign-in global modal mask: `src/features/auth/sign-in-button.tsx`
- Sign-in global dialog close behavior: `src/features/auth/sign-in-dialog.tsx`
- E2E examples: `e2e/changelog.spec.ts`, `e2e/signin-modal.spec.ts`
