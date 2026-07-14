import { Form, useForm } from "@/features/form/tanstack-form";
import { POSTHOG_EVENTS } from "@/features/posthog/posthog-events";
import { authClient } from "@/lib/auth-client";
import { getCallbackUrl } from "@/lib/auth/auth-utils";
import { getNameFromEmail } from "@/lib/format/id";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation } from "@/hooks/use-async-mutation";
import posthog from "posthog-js";
import { toast } from "sonner";
import type { LoginCredentialsFormType } from "./sign-up.schema";
import { LoginCredentialsFormScheme } from "./sign-up.schema";

export const SignUpCredentialsForm = () => {
  const submitMutation = useMutation({
    mutationFn: async (values: LoginCredentialsFormType) => {
      return unwrapSafePromise(
        authClient.signUp.email({
          email: values.email,
          password: values.password,
          name: getNameFromEmail(values.email),
          image: values.image,
        }),
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      posthog.capture(POSTHOG_EVENTS.AUTH_SIGNUP_STARTED, {
        method: "email",
      });
      const newUrl = window.location.origin + getCallbackUrl("/orgs");
      window.location.href = newUrl;
    },
  });

  const form = useForm({
    schema: LoginCredentialsFormScheme,
    defaultValues: {
      email: "",
      password: "",
      verifyPassword: "",
      image: "",
    },
    onSubmit: async (values) => {
      if (values.password !== values.verifyPassword) {
        toast.error("Password does not match");
        return;
      }

      await submitMutation.mutateAsync(values);
    },
  });

  return (
    <Form form={form} className="max-w-lg space-y-4">
      <form.AppField name="email">
        {(field) => (
          <field.Field>
            <field.Label>Email</field.Label>
            <field.Content>
              <field.Input type="email" placeholder="john@doe.com" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.AppField name="password">
        {(field) => (
          <field.Field>
            <field.Label>Password</field.Label>
            <field.Content>
              <field.Input type="password" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.AppField name="verifyPassword">
        {(field) => (
          <field.Field>
            <field.Label>Verify Password</field.Label>
            <field.Content>
              <field.Input type="password" />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.SubmitButton className="w-full">Sign up</form.SubmitButton>
    </Form>
  );
};
