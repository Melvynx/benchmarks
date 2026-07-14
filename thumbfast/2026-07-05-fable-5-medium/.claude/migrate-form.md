# Migration Guide: React Hook Form → TanStack Form

## ⚠️ CRITICAL RULES

1. **ONLY import from `@/components/ui/tanstack-form`:**
   - `useForm`, `Form` - that's it!

2. **ALL field components come from `field` parameter:**
   - `field.Field`, `field.Label`, `field.Content`, `field.Message`
   - `field.Input`, `field.Textarea`, `field.Select`, `field.Checkbox`, `field.Switch`

3. **DO NOT import Field components separately** (no `Field`, `FieldContent`, `FieldLabel`, `FieldError`)

---

## Quick Migration Steps

### 1. Update Imports

```tsx
// BEFORE
import {
  useZodForm,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

// AFTER
import { useForm, Form } from "@/components/ui/tanstack-form";
```

### 2. Convert Form Hook

```tsx
// BEFORE
const form = useZodForm({
  schema: MySchema,
  defaultValues: { email: "" },
});

// AFTER
const form = useForm({
  schema: MySchema,
  defaultValues: { email: "" },
  onSubmit: async (values) => {
    // Move submit logic here
    await mutation.mutateAsync(values);
  },
});
```

### 3. Convert Form Wrapper

```tsx
// BEFORE
<Form form={form} onSubmit={async (values) => { /* ... */ }}>

// AFTER
<Form form={form}>
```

### 4. Convert Fields

```tsx
// BEFORE
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

// AFTER
<form.AppField name="email">
  {(field) => (
    <field.Field>
      <field.Label>Email</field.Label>
      <field.Content>
        <field.Input type="email" />
        <field.Message />
      </field.Content>
    </field.Field>
  )}
</form.AppField>
```

### 5. Convert Submit Button

```tsx
// BEFORE
<Button type="submit">Submit</Button>

// AFTER
<form.SubmitButton>Submit</form.SubmitButton>
```

---

## Field Type Examples

### Input

```tsx
<form.AppField name="name">
  {(field) => (
    <field.Field>
      <field.Label>Name</field.Label>
      <field.Content>
        <field.Input placeholder="John Doe" />
        <field.Message />
      </field.Content>
    </field.Field>
  )}
</form.AppField>
```

### Textarea

```tsx
<form.AppField name="bio">
  {(field) => (
    <field.Field>
      <field.Label>Bio</field.Label>
      <field.Content>
        <field.Textarea rows={4} />
        <field.Message />
      </field.Content>
    </field.Field>
  )}
</form.AppField>
```

### Select

```tsx
<form.AppField name="role">
  {(field) => (
    <field.Field>
      <field.Label>Role</field.Label>
      <field.Content>
        <field.Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </field.Select>
        <field.Message />
      </field.Content>
    </field.Field>
  )}
</form.AppField>
```

### Checkbox

```tsx
<form.AppField name="consent">
  {(field) => (
    <field.Field>
      <field.Content>
        <div className="flex items-start gap-2">
          <field.Checkbox id="consent" />
          <field.Label htmlFor="consent">I agree</field.Label>
        </div>
        <field.Message />
      </field.Content>
    </field.Field>
  )}
</form.AppField>
```

### Switch

```tsx
<form.AppField name="notifications">
  {(field) => (
    <field.Field>
      <field.Content>
        <div className="flex items-center justify-between">
          <field.Label>Notifications</field.Label>
          <field.Switch />
        </div>
      </field.Content>
    </field.Field>
  )}
</form.AppField>
```

### Custom Components

```tsx
<form.AppField name="tags">
  {(field) => (
    <field.Field>
      <field.Label>Tags</field.Label>
      <field.Content>
        <TagSelector
          selectedTags={field.state.value}
          onTagsChange={field.handleChange}
        />
        <field.Message />
      </field.Content>
    </field.Field>
  )}
</form.AppField>
```

---

## Auto-Save Pattern (FormAutoSave → FormManagement)

```tsx
// BEFORE
import { FormAutoSave, FormAutoSaveStickyBar } from "@/features/form/form-auto-save"

<FormAutoSave form={form} onSubmit={onSubmit}>
  <FormAutoSaveStickyBar />
  {/* fields */}
</FormAutoSave>

// AFTER
import { FormManagement, FormManagementAutoSave, FormManagementStickyBar } from "@/lib/form-management-tanstack/form-management"

const form = useForm({
  schema,
  defaultValues,
  onSubmit: async (values) => await mutation.mutateAsync(values)
})

<FormManagement form={form}>
  <FormManagementAutoSave form={form} autoSaveMs={300} />
  <FormManagementStickyBar />
  {/* fields */}
</FormManagement>
```

---

## Component Mapping Reference

| Old (React Hook Form)       | New (TanStack Form)       |
| --------------------------- | ------------------------- |
| `useZodForm`                | `useForm`                 |
| `FormField`                 | `form.AppField`           |
| `FormItem`                  | `field.Field`             |
| `FormLabel`                 | `field.Label`             |
| `FormControl`               | `field.Content`           |
| `FormMessage`               | `field.Message`           |
| `FormDescription`           | `field.Description`       |
| `<Input {...field} />`      | `<field.Input />`         |
| `<Textarea {...field} />`   | `<field.Textarea />`      |
| `<Select>` (manual props)   | `<field.Select>`          |
| `<Checkbox>` (manual props) | `<field.Checkbox />`      |
| `<Switch>` (manual props)   | `<field.Switch />`        |
| `<Button type="submit">`    | `<form.SubmitButton>`     |
| `field.value`               | `field.state.value`       |
| `field.onChange`            | `field.handleChange`      |
| `form.setValue`             | `form.setFieldValue`      |
| `form.getValues()`          | `form.store.state.values` |

---

## Migration Checklist

- [ ] Update imports (only `useForm`, `Form` from tanstack-form)
- [ ] Move `onSubmit` to `useForm` hook
- [ ] Remove `onSubmit` from `<Form>` component
- [ ] Convert all `FormField` → `form.AppField`
- [ ] Use `field.Field`, `field.Label`, `field.Content`, `field.Message` (NOT imported separately!)
- [ ] Convert `<Input {...field} />` → `<field.Input />`
- [ ] Convert submit button to `<form.SubmitButton>`
- [ ] Update custom components to use `field.state.value` and `field.handleChange`
- [ ] Replace FormAutoSave with FormManagement (if used)
