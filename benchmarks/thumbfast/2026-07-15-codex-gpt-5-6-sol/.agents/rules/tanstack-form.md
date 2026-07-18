---
paths:
  - "**/*.tsx"
---

# TanStack Form Usage

**CRITICAL**: Use TanStack Form for ALL forms - ~~React Hook Form~~ is deprecated

## Import

```tsx
import { useForm, Form } from "@/features/form/tanstack-form";
```

## Creating a Form

```tsx
const form = useForm({
  schema: z.object({
    email: z.string().email(),
    name: z.string().min(2),
  }),
  defaultValues: { email: "", name: "" },
  onSubmit: async (values) => {
    // Handle submission - values is typed from schema
  },
});
```

## Form Structure Pattern

```tsx
<Form form={form} className="flex flex-col gap-4">
  <form.AppField name="email">
    {(field) => (
      <field.Field>
        <field.Label>Email</field.Label>
        <field.Content>
          <field.Input type="email" placeholder="you@example.com" />
          <field.Message />
        </field.Content>
      </field.Field>
    )}
  </form.AppField>

  <form.AppField name="name">
    {(field) => (
      <field.Field>
        <field.Label>Name</field.Label>
        <field.Content>
          <field.Input />
          <field.Message />
        </field.Content>
      </field.Field>
    )}
  </form.AppField>

  <form.SubmitButton>Submit</form.SubmitButton>
</Form>
```

## Available Field Components

Inside `form.AppField` callback, these components are available on `field`:

- `field.Input` - Text input (supports all Input props)
- `field.Select` - Select dropdown
- `field.Textarea` - Multi-line text input
- `field.Checkbox` - Checkbox input
- `field.Switch` - Toggle switch
- `field.Label` - Field label
- `field.Description` - Helper text
- `field.Message` - Validation error message
- `field.Field` - Field wrapper (handles invalid state)
- `field.Content` - Content wrapper for input + message

## With Convex Mutations

```tsx
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";

const save = useMutation(api.profile.mutations.save);
const form = useForm({
  schema: MySchema,
  defaultValues: { ... },
  onSubmit: async (values) => {
    await save(values);
  },
});
```

## Validation Modes

Default is `onBlur`. Available modes:

```tsx
const form = useForm({
  schema: MySchema,
  defaultValues: { ... },
  validationMode: "onBlur", // "onChange" | "onBlur" | "onSubmit"
  onSubmit: async (values) => { ... },
});
```
