---
paths:
  - "**/*.tsx"
---

# Dialog Manager

Use `dialogManager` from `@/features/dialog-manager/dialog-manager` for global modals.

## Import

```tsx
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
```

## Confirm Dialog

Basic confirmation with optional text verification.

```tsx
dialogManager.confirm({
  title: "Delete Project",
  description: "This action cannot be undone.",
  variant: "destructive", // "default" | "destructive" | "warning"
  icon: Trash2, // optional LucideIcon
  style: "centered", // optional "default" | "centered"
  action: {
    label: "Delete",
    variant: "destructive",
    onClick: async () => {
      await deleteProject(id);
    },
  },
  cancel: {
    // optional - defaults to "Cancel"
    label: "Keep it",
  },
});
```

## Confirm with Text Verification

Require the user to type exact text before enabling the action button.

```tsx
dialogManager.confirm({
  title: "Delete Organization",
  description: "Type the organization slug to confirm deletion.",
  variant: "destructive",
  confirmText: "my-org-slug",
  action: {
    label: "Delete Forever",
    variant: "destructive",
    onClick: async () => {
      await deleteOrg(id);
    },
  },
});
```

## Input Dialog

Prompt the user for text input.

```tsx
dialogManager.input({
  title: "Rename Project",
  description: "Enter a new name for your project.",
  icon: Pencil,
  input: {
    label: "Project Name",
    defaultValue: "My Project",
    placeholder: "Enter name...",
  },
  action: {
    label: "Rename",
    onClick: async (value) => {
      await renameProject(id, value);
    },
  },
});
```

## Custom Dialog

Render any React content. You must handle closing manually.

```tsx
dialogManager.custom({
  title: "Custom Content",
  description: "Optional description.",
  size: "lg",
  children: (
    <div className="flex flex-col gap-4">
      <MyCustomComponent />
      <Button onClick={() => dialogManager.closeAll()}>Done</Button>
    </div>
  ),
});
```

## Closing Dialogs

```tsx
dialogManager.close(id); // close specific dialog
dialogManager.closeAll(); // close all dialogs
```

## UI Behavior

- **Footer bar**: Bottom bar with `Esc` to close and action button
- **Keyboard**: `Enter` submits (input/confirmText), `Esc` closes
- **Loading**: Action buttons auto-show spinner during async onClick
- **Errors**: Caught errors display via toast notification
- **Queue**: Multiple dialogs are queued - only one shows at a time

## Size Options

| Size | Max Width | Use Case                |
| ---- | --------- | ----------------------- |
| `sm` | 384px     | Simple confirmations    |
| `md` | 448px     | Default - most dialogs  |
| `lg` | 512px     | Forms, longer content   |
| `xl` | 896px     | Videos, complex layouts |

## Rules

- NEVER create custom modal/dialog components - always use `dialogManager`
- Action buttons handle loading state automatically during async operations
- For custom dialogs, call `dialogManager.closeAll()` to close
- Use `variant: "destructive"` for delete/dangerous actions
- Use `confirmText` for irreversible actions (org deletion, data wipe)
