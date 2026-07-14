<forms_reference>
<overview>
Complete patterns for form handling using TanStack Form with Zod validation. Covers form creation, field components, mutations, auto-save, and form state management.
</overview>

<table_of_contents>

1. Form Creation Pattern
2. Field Components
3. Form with Mutation
4. Form State Access
5. Auto-Save Pattern
6. Unsaved Changes Detection
7. Complex Forms
8. Form Reset After Success
</table_of_contents>

<form_creation>
<basic_form>
Simple form with Zod validation:

```typescript
import { useForm, Form } from "@/features/form/tanstack-form";
import { z } from "zod";

const ContactSchema = z.object({
  email: z.string().email(),
  message: z.string().min(10),
});

function ContactForm() {
  const form = useForm({
    schema: ContactSchema,
    defaultValues: {
      email: "",
      message: "",
    },
    onSubmit: async (values) => {
      // values is typed: { email: string; message: string }
      await submitContact(values);
    },
  });

  return (
    <Form form={form}>
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

      <form.AppField name="message">
        {(field) => (
          <field.Field>
            <field.Label>Message</field.Label>
            <field.Content>
              <field.Textarea placeholder="Your message..." />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.SubmitButton>Send</form.SubmitButton>
    </Form>
  );
}
```

</basic_form>

<validation_modes>
Available validation modes:

```typescript
const form = useForm({
  schema: MySchema,
  defaultValues: { ... },
  validationMode: "onBlur", // Default - validate on blur
  // validationMode: "onChange", // Validate on every change
  // validationMode: "onSubmit", // Validate only on submit
  onSubmit: async (values) => { ... },
});
```

</validation_modes>
</form_creation>

<field_components>
Pre-configured field components available:

```typescript
<form.AppField name="fieldName">
  {(field) => (
    <field.Field>
      {/* Label */}
      <field.Label>Field Label</field.Label>

      {/* Content wrapper */}
      <field.Content>
        {/* Input types */}
        <field.Input type="text" />
        <field.Input type="email" />
        <field.Input type="password" />
        <field.Input type="number" />

        {/* Other field types */}
        <field.Textarea />
        <field.Select>
          <option value="a">A</option>
          <option value="b">B</option>
        </field.Select>
        <field.Checkbox />
        <field.Switch />

        {/* Optional description */}
        <field.Description>Helper text</field.Description>

        {/* Error message (auto-shows when invalid) */}
        <field.Message />
      </field.Content>
    </field.Field>
  )}
</form.AppField>
```

<custom_field>
Using custom components with field state:

```typescript
<form.AppField name="tags">
  {(field) => (
    <field.Field>
      <field.Label>Tags</field.Label>
      <field.Content>
        {/* Custom component receives field value and handler */}
        <TagSelector
          value={field.state.value}
          onChange={(tags) => field.handleChange(tags)}
        />
        <field.Message />
      </field.Content>
    </field.Field>
  )}
</form.AppField>
```

</custom_field>
</field_components>

<form_with_mutation>
<standard_pattern>
Form with a TanStack Query mutation wrapping a Convex mutation:

```typescript
import { useForm, Form } from "@/features/form/tanstack-form";
import { api } from "@convex/_generated/api";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { toast } from "sonner";

function FeedbackForm() {
  const sendFeedback = useConvexMutation(api.feedbacks.mutations.create);
  const mutation = useQueryMutation({
    mutationFn: (data: FeedbackInput) => sendFeedback(data),
    onSuccess: () => {
      toast.success("Feedback sent!");
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    schema: FeedbackSchema,
    defaultValues: { email: "", message: "" },
    onSubmit: async (values) => {
      mutation.mutate(values);
    },
  });

  return (
    <Form form={form}>
      {/* fields... */}
      <form.SubmitButton disabled={mutation.isPending}>
        {mutation.isPending ? "Sending..." : "Send"}
      </form.SubmitButton>
    </Form>
  );
}
```

</standard_pattern>

<async_submission>
Awaiting mutation in onSubmit:

```typescript
const form = useForm({
  schema: FeedbackSchema,
  defaultValues: { email: "", message: "" },
  onSubmit: async (values) => {
    // Using mutateAsync to await result
    await mutation.mutateAsync(values);
  },
});
```

</async_submission>
</form_with_mutation>

<form_state_access>
<store_subscription>
Access form store state directly:

```typescript
import { useStore } from "@tanstack/react-form";

function MyForm() {
  const form = useForm({ ... });

  // Subscribe to specific store values
  const isDirty = useStore(form.store, (state) => state.isDirty);
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const values = useStore(form.store, (state) => state.values);

  return (
    <Form form={form}>
      {isDirty && <Badge>Unsaved changes</Badge>}
      {/* fields... */}
    </Form>
  );
}
```

</store_subscription>

<field_value_access>
Access and update field values programmatically:

```typescript
function MyForm() {
  const form = useForm({ ... });

  // Get current field value
  const currentEmail = form.state.values.email;

  // Set field value programmatically
  const handleSelectSender = (sender: Sender) => {
    form.setFieldValue("senderId", sender.id);
  };

  // Reset form with new values
  const handleReset = () => {
    form.reset({ email: "", message: "" });
  };

  return (
    <Form form={form}>
      {/* fields... */}
      <button type="button" onClick={() => handleSelectSender(sender)}>
        Select Sender
      </button>
    </Form>
  );
}
```

</field_value_access>
</form_state_access>

<auto_save_pattern>
<local_auto_save>
Auto-save is not wrapped by a shared helper in this repo. Keep it local to the form with a small debounced effect when needed:

```typescript
import { useEffect } from "react";
import { useMutation as useQueryMutation } from "@tanstack/react-query";

function SettingsForm() {
  const mutation = useQueryMutation({ ... });

  const form = useForm({
    schema: SettingsSchema,
    defaultValues: settings,
    onSubmit: async (values) => {
      await mutation.mutateAsync(values);
    },
  });

  const values = form.store.state.values;
  const isDirty = form.store.state.isDirty;

  useEffect(() => {
    if (!isDirty) return;
    const timeout = window.setTimeout(() => {
      void mutation.mutateAsync(values);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [isDirty, values, mutation]);

  return <Form form={form}>{/* fields... */}</Form>;
}
```

Use this pattern only when auto-save is a product requirement. For normal forms, submit explicitly with `form.SubmitButton`.
</local_auto_save>

<submit_shortcut>
If a screen needs Cmd+S/Ctrl+S, wire it locally and call `form.handleSubmit()`:

```typescript
useEffect(() => {
  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
      event.preventDefault();
      void form.handleSubmit();
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [form]);
```

</submit_shortcut>
</auto_save_pattern>

<unsaved_changes_detection>
<dialog_warning>
Show custom dialog on navigation with unsaved changes:

```typescript
import { useUnsavedChangesWithDialogManager } from "@/hooks/use-custom-unsaved-changes-dialog";

function MyForm() {
  const form = useForm({ ... });
  const isDirty = useStore(form.store, (state) => state.isDirty);

  useUnsavedChangesWithDialogManager({
    unsaved: isDirty,
    title: "Unsaved Changes",
    description: "You have unsaved changes. Do you want to leave?",
    onConfirm: () => {
      form.reset();
    },
  });

  return <Form form={form}>{/* fields... */}</Form>;
}
```

</dialog_warning>

<native_warning>
Use native browser dialog:

```typescript
import { useWarnIfUnsavedChanges } from "@/hooks/use-warn-if-unsaved-changes";

function MyForm() {
  const form = useForm({ ... });
  const isDirty = useStore(form.store, (state) => state.isDirty);

  useWarnIfUnsavedChanges(isDirty);

  return <Form form={form}>{/* fields... */}</Form>;
}
```

</native_warning>
</unsaved_changes_detection>

<complex_forms>
<multi_field>
Complex form with multiple field types:

```typescript
const CampaignSchema = z.object({
  subject: z.string().min(1).max(200),
  preview: z.string().max(200).optional(),
  content: z.string(),
  senderId: z.string(),
  replyTo: z.string().email().optional(),
  recipientFilters: z.array(FilterSchema),
});

function CampaignForm({ campaign }: { campaign: Campaign }) {
  const updateMutation = useQueryMutation({ ... });

  const form = useForm({
    schema: CampaignSchema,
    defaultValues: {
      subject: campaign.subject,
      preview: campaign.preview ?? "",
      content: campaign.content,
      senderId: campaign.senderId ?? "",
      replyTo: campaign.replyTo ?? "",
      recipientFilters: campaign.recipientFilters ?? [],
    },
    onSubmit: async (values) => {
      await updateMutation.mutateAsync({ id: campaign.id, ...values });
    },
  });

  // Reset form when campaign data changes
  useEffect(() => {
    form.reset({
      subject: campaign.subject,
      preview: campaign.preview ?? "",
      content: campaign.content,
      senderId: campaign.senderId ?? "",
      replyTo: campaign.replyTo ?? "",
      recipientFilters: campaign.recipientFilters ?? [],
    });
  }, [campaign.id]);

  return (
    <Form form={form}>
      {/* Standard field */}
      <form.AppField name="subject">
        {(field) => (
          <field.Field>
            <field.Label>Subject</field.Label>
            <field.Content>
              <field.Input />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      {/* Custom editor component */}
      <form.AppField name="content">
        {(field) => (
          <ContentEditor
            value={field.state.value}
            onChange={(content) => form.setFieldValue("content", content)}
          />
        )}
      </form.AppField>

      {/* Sender selector (custom component) */}
      <SenderSelector
        value={form.state.values.senderId}
        onSelect={(sender) => form.setFieldValue("senderId", sender.id)}
      />
    </Form>
  );
}
```

</multi_field>

<conditional_fields>
Conditional field rendering:

```typescript
function CaptureForm({ config }: { config: CaptureConfig }) {
  const form = useForm({
    schema: CaptureSchema,
    defaultValues: { email: "", name: "", phone: "", consent: false },
  });

  return (
    <Form form={form}>
      {/* Always show email */}
      <form.AppField name="email">
        {(field) => <field.Input type="email" required />}
      </form.AppField>

      {/* Conditionally show name */}
      {config.showName && (
        <form.AppField name="name">
          {(field) => <field.Input />}
        </form.AppField>
      )}

      {/* Conditionally show phone */}
      {config.showPhone && (
        <form.AppField name="phone">
          {(field) => <field.Input type="tel" />}
        </form.AppField>
      )}

      {/* Conditionally show consent */}
      {config.showConsent && (
        <form.AppField name="consent">
          {(field) => (
            <div className="flex items-center gap-2">
              <field.Checkbox />
              <field.Label>I agree to the terms</field.Label>
            </div>
          )}
        </form.AppField>
      )}
    </Form>
  );
}
```

</conditional_fields>
</complex_forms>

<form_reset_patterns>
<reset_after_success>
Reset form after successful submission:

```typescript
const mutation = useQueryMutation({
  mutationFn: async (data) => {
    return submitMutation(data);
  },
  onSuccess: (responseData) => {
    // Reset with response data (keeps form synced with server)
    form.reset({
      title: responseData.title,
      description: responseData.description,
    });
    toast.success("Saved!");
  },
});
```

</reset_after_success>

<reset_on_prop_change>
Reset when external data changes:

```typescript
function EditForm({ item }: { item: Item }) {
  const form = useForm({
    schema: ItemSchema,
    defaultValues: {
      title: item.title,
      description: item.description,
    },
  });

  // Reset form when item ID changes
  useEffect(() => {
    form.reset({
      title: item.title,
      description: item.description,
    });
  }, [item.id]);

  return <Form form={form}>{/* fields... */}</Form>;
}
```

</reset_on_prop_change>
</form_reset_patterns>

<anti_patterns>
<wrong>
Using custom state for forms:

```typescript
// BAD - reinventing form state
const [email, setEmail] = useState("");
const [error, setError] = useState("");

const handleSubmit = () => {
  if (!email.includes("@")) {
    setError("Invalid email");
    return;
  }
  // ...
};
```

</wrong>
<right>
Use TanStack Form:

```typescript
// GOOD - TanStack Form handles everything
const form = useForm({
  schema: z.object({ email: z.string().email() }),
  defaultValues: { email: "" },
  onSubmit: handleSubmit,
});
```

</right>

<wrong>
Manually parsing mutation result envelopes:

```typescript
// BAD - Convex mutations throw errors directly
const mutation = useQueryMutation({
  mutationFn: async (data) => {
    const result = await submitMutation(data);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  },
});
```

</wrong>
<right>
Call the Convex mutation directly:

```typescript
// GOOD - Convex error handling is preserved
const mutation = useQueryMutation({
  mutationFn: async (data) => {
    return submitMutation(data);
  },
});
```

</right>
</anti_patterns>

<success_criteria>

- Forms use TanStack Form with Zod schema
- Field components use pre-configured helpers (field.Input, field.Textarea, etc.)
- Mutations call Convex mutations/actions or client helpers directly
- Form resets after successful submission
- Auto-save implemented locally only when needed
- Unsaved changes detected and warned
- Validation mode appropriate for use case (onBlur default)
</success_criteria>
</forms_reference>
