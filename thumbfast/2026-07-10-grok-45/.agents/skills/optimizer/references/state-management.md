<state_management_reference>
<overview>
Complete patterns for client-side state management using Zustand. Covers store creation, persistence, selectors, and integration with React components.
</overview>

<table_of_contents>

1. Store Creation Pattern
2. Store Actions Pattern
3. Accessing Store Outside React
4. Selectors and Performance
5. Persistence with localStorage
6. Dialog Store Pattern
7. Global State Patterns
8. Anti-Patterns
</table_of_contents>

<store_creation>
<basic_store>
Simple Zustand store:

```typescript
// src/stores/my-store.ts
import { create } from "zustand";

type MyStore = {
  // State
  value: string;
  count: number;

  // Actions
  setValue: (value: string) => void;
  increment: () => void;
  reset: () => void;
};

export const useMyStore = create<MyStore>((set) => ({
  // Initial state
  value: "",
  count: 0,

  // Actions
  setValue: (value) => set({ value }),
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ value: "", count: 0 }),
}));
```

</basic_store>

<dialog_store>
Dialog queue management store (from NowStack):

```typescript
// src/features/dialog-manager/dialog-store.ts
import { create } from "zustand";

type DialogStore = {
  dialogs: Dialog[];
  activeDialog: Dialog | undefined;
  addDialog: (config: DialogConfig) => string;
  removeDialog: (id: string) => void;
  setLoading: (id: string, loading: boolean) => void;
  clear: () => void;
};

export const useDialogStore = create<DialogStore>((set, get) => ({
  dialogs: [],

  get activeDialog() {
    return get().dialogs[0];
  },

  addDialog: (config) => {
    const dialog = DialogFactory.fromConfig(config);
    set((state) => ({ dialogs: [...state.dialogs, dialog] }));
    return dialog.id;
  },

  removeDialog: (id) =>
    set((state) => ({
      dialogs: state.dialogs.filter((d) => d.id !== id),
    })),

  setLoading: (id, loading) =>
    set((state) => ({
      dialogs: state.dialogs.map((d) => (d.id === id ? { ...d, loading } : d)),
    })),

  clear: () => set({ dialogs: [] }),
}));
```

</dialog_store>

<org_context_store>
Organization context hydration store:

```typescript
// src/hooks/use-current-org.ts
import { create } from "zustand";
import { getPlanLimits } from "@/lib/plans";

type CurrentOrgStore = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  subscription: Subscription | null;
  limits: PlanLimits;
} | null;

export const useCurrentOrg = create<CurrentOrgStore>(() => null);

// Setter function (called from OrgProvider)
export function setCurrentOrg(org: Organization) {
  useCurrentOrg.setState({
    id: org.id,
    slug: org.slug,
    name: org.name,
    image: org.image,
    subscription: org.subscription,
    limits: getPlanLimits(org.subscription?.plan),
  });
}

export function clearCurrentOrg() {
  useCurrentOrg.setState(null);
}
```

</org_context_store>
</store_creation>

<accessing_outside_react>
Access store state and actions outside React components:

```typescript
// Using getState() for utilities
import { useDialogStore } from "./dialog-store";

// Get current state
const currentDialogs = useDialogStore.getState().dialogs;

// Call actions
useDialogStore.getState().addDialog({ ... });
useDialogStore.getState().removeDialog(id);

// Example: handleDialogAction helper
export async function handleDialogAction(
  dialogId: string,
  action: () => Promise<void>
) {
  const store = useDialogStore.getState();

  try {
    store.setLoading(dialogId, true);
    await action();
    store.removeDialog(dialogId);
  } catch (error) {
    store.setLoading(dialogId, false);
    toast.error(error instanceof Error ? error.message : "Error");
  }
}
```

</accessing_outside_react>

<selectors_performance>
Use selectors to prevent unnecessary re-renders:

<wrong>
Subscribing to entire store:

```typescript
// BAD - re-renders on ANY store change
function Component() {
  const store = useMyStore();
  return <div>{store.value}</div>;
}
```

</wrong>

<right>
Subscribe only to needed state:

```typescript
// GOOD - only re-renders when value changes
function Component() {
  const value = useMyStore((state) => state.value);
  return <div>{value}</div>;
}

// Multiple values - use shallow comparison
import { shallow } from "zustand/shallow";

function Component() {
  const { value, count } = useMyStore(
    (state) => ({ value: state.value, count: state.count }),
    shallow
  );
  return <div>{value}: {count}</div>;
}
```

</right>

<actions_only>
Actions are stable - can destructure without selector:

```typescript
// Actions don't cause re-renders
function Component() {
  const { setValue, increment } = useMyStore.getState();
  // OR use in selector (actions are stable references)
  const increment = useMyStore((state) => state.increment);

  return <button onClick={increment}>+</button>;
}
```

</actions_only>
</selectors_performance>

<persistence>
Persist store to localStorage:

```typescript
// src/stores/preferences-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type PreferencesStore = {
  theme: "light" | "dark" | "system";
  sidebarOpen: boolean;
  setTheme: (theme: PreferencesStore["theme"]) => void;
  toggleSidebar: () => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: "preferences", // localStorage key
      partialize: (state) => ({
        // Only persist specific fields
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);
```

<hydration_handling>
Handle hydration mismatch for persisted stores:

```typescript
// Use useEffect to wait for hydration
function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const theme = usePreferencesStore((s) => s.theme);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton className="h-9 w-9" />;
  }

  return <ThemeButton theme={theme} />;
}
```

</hydration_handling>
</persistence>

<global_dialog_pattern>
Simple global dialog type tracker:

```typescript
// src/features/global-dialog/global-dialog.store.ts
import { create } from "zustand";

type DialogType = "org-plan" | "upgrade" | "settings";

type GlobalDialogStore = {
  openDialog: DialogType | null;
  setOpenDialog: (dialog: DialogType | null) => void;
};

const useGlobalDialogStore = create<GlobalDialogStore>((set) => ({
  openDialog: null,
  setOpenDialog: (openDialog) => set({ openDialog }),
}));

// Helper functions
export function openGlobalDialog(dialog: DialogType) {
  useGlobalDialogStore.getState().setOpenDialog(dialog);
}

export function closeGlobalDialog() {
  useGlobalDialogStore.getState().setOpenDialog(null);
}

// Component usage
function GlobalDialog() {
  const openDialog = useGlobalDialogStore((s) => s.openDialog);

  if (!openDialog) return null;

  const DialogComponent = DialogTypeMap[openDialog];
  return <DialogComponent />;
}
```

</global_dialog_pattern>

<debug_panel_store>
Development-only debug utilities:

```typescript
// src/features/debug/debug-panel-store.ts
import { create } from "zustand";

type DebugAction = {
  id: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
};

type DebugInfo = {
  id: string;
  label: string;
  value: string | number | boolean | null;
};

type DebugPanelStore = {
  actions: DebugAction[];
  infos: DebugInfo[];
  addAction: (action: DebugAction) => void;
  removeAction: (id: string) => void;
  addInfo: (info: DebugInfo) => void;
  updateInfo: (id: string, value: DebugInfo["value"]) => void;
  removeInfo: (id: string) => void;
};

export const useDebugPanelStore = create<DebugPanelStore>((set) => ({
  actions: [],
  infos: [],

  addAction: (action) =>
    set((state) => {
      // Deduplicate by ID
      const exists = state.actions.some((a) => a.id === action.id);
      if (exists) return state;
      return { actions: [...state.actions, action] };
    }),

  removeAction: (id) =>
    set((state) => ({
      actions: state.actions.filter((a) => a.id !== id),
    })),

  addInfo: (info) =>
    set((state) => {
      const exists = state.infos.some((i) => i.id === info.id);
      if (exists) return state;
      return { infos: [...state.infos, info] };
    }),

  updateInfo: (id, value) =>
    set((state) => ({
      infos: state.infos.map((i) => (i.id === id ? { ...i, value } : i)),
    })),

  removeInfo: (id) =>
    set((state) => ({
      infos: state.infos.filter((i) => i.id !== id),
    })),
}));
```

</debug_panel_store>

<hydrating_from_server>
Hydrate a client Zustand store from data resolved by the route component after a Convex query. Routing here uses `$orgSlug` (not `[orgSlug]`) and `route.tsx` layouts (not Next.js `layout.tsx`):

```tsx
// src/features/organization/org-provider.tsx
import { useEffect } from "react";
import { setCurrentOrg } from "@/hooks/use-current-org";
import type { Organization } from "@/types/organization";

export function OrgProvider({ org }: { org: Organization }) {
  useEffect(() => {
    setCurrentOrg(org);
  }, [org]);

  return null;
}
```

```tsx
// src/routes/orgs/$orgSlug/(navigation)/route.tsx
import { OrgProvider } from "@/features/organization/org-provider";
import { api } from "@convex/_generated/api";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useQuery } from "convex/react";

export const Route = createFileRoute("/orgs/$orgSlug/(navigation)")({
  component: OrgLayout,
});

function OrgLayout() {
  const { orgSlug } = Route.useParams();
  const org = useQuery(api.auth.queries.getFullOrganization, {
    organizationSlug: orgSlug,
  });

  if (org === undefined) return <OrgLayoutSkeleton />;
  if (org === null) return <Navigate to="/auth/signin" />;

  return (
    <>
      <OrgProvider org={org} />
      <Outlet />
    </>
  );
}
```

</hydrating_from_server>

<anti_patterns>
<wrong>
Using Zustand for server data:

```typescript
// BAD - use Convex queries for server data
const useUsersStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const users = await fetch("/api/users");
    set({ users });
  },
}));
```

</wrong>
<right>
Use Convex React hooks for server data:

```typescript
// GOOD - Convex subscription for server data
const users = useQuery(api.auth.queries.listUsersAdmin, {});

// Zustand for client-only state
const useUIStore = create((set) => ({
  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
}));
```

</right>

<wrong>
Storing URL state in Zustand:

```typescript
// BAD - URL state should be in URL
const useFiltersStore = create((set) => ({
  page: 1,
  search: "",
  setPage: (page) => set({ page }),
}));
```

</wrong>
<right>
Use TanStack Router search params (this project does **not** use `nuqs`):

```typescript
// GOOD - URL state via TanStack Router validateSearch
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/admin/organizations/")({
  validateSearch: z.object({
    page: z.number().optional().default(1),
    q: z.string().optional().default(""),
  }),
  component: OrgsPage,
});

function OrgsPage() {
  const { page, q } = Route.useSearch();
  const navigate = Route.useNavigate();

  const setPage = (next: number) =>
    navigate({ search: (prev) => ({ ...prev, page: next }) });
}
```

</right>

<wrong>
Not using selectors:

```typescript
// BAD - subscribes to entire store
function Counter() {
  const store = useCountStore();
  return <span>{store.count}</span>;
}
```

</wrong>
<right>
Use selectors:

```typescript
// GOOD - only subscribes to count
function Counter() {
  const count = useCountStore((s) => s.count);
  return <span>{count}</span>;
}
```

</right>
</anti_patterns>

<when_to_use_zustand>
**Use Zustand for:**

- UI state shared between components (dialogs, sidebars, modals)
- User preferences (theme, language, display settings)
- Cached client-side computed values
- Global application state (current org, selected items)
- State accessed outside React (in utilities, helpers)

**Do NOT use Zustand for:**

- Server data (use Convex `useQuery` / `useMutation`)
- URL state (use TanStack Router search params via `validateSearch` + `Route.useSearch()`)
- Form state (use TanStack Form)
- Single-component state (use useState)
- Prop drilling avoidance (use Context or composition)
</when_to_use_zustand>
</state_management_reference>
