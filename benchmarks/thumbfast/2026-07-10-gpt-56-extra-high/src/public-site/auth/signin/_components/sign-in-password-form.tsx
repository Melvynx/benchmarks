import { Form, useForm } from "@/features/form/tanstack-form";
import { POSTHOG_EVENTS } from "@/features/posthog/posthog-events";
import { authClient } from "@/lib/auth-client";
import { getCallbackUrl } from "@/lib/auth/auth-utils";
import { unwrapSafePromise } from "@/lib/promises";
import { cn } from "@/lib/utils";
import { useMutation } from "@/hooks/use-async-mutation";
import Link from "@/compat/link";
import posthog from "posthog-js";
import { toast } from "sonner";
import { z } from "zod";

const LoginCredentialsFormScheme = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

type LoginCredentialsFormType = z.infer<typeof LoginCredentialsFormScheme>;

export const SignInPasswordForm = (props: {
  callbackUrl?: string;
  email?: string;
  formId?: string;
  hideSubmit?: boolean;
  variant?: "default" | "split";
}) => {
  const isSplit = props.variant === "split";
  const signInMutation = useMutation({
    mutationFn: async (values: LoginCredentialsFormType) => {
      return unwrapSafePromise(
        authClient.signIn.email({
          email: values.email,
          password: values.password,
          rememberMe: true,
        }),
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      posthog.capture(POSTHOG_EVENTS.AUTH_SIGNIN_STARTED, {
        method: "password",
      });
      const callbackUrl = getCallbackUrl(props.callbackUrl ?? "/orgs");
      window.location.href = callbackUrl;
    },
  });

  const form = useForm({
    schema: LoginCredentialsFormScheme,
    defaultValues: {
      email: props.email ?? "",
      password: "",
    },
    onSubmit: async (values) => {
      await signInMutation.mutateAsync(values).catch(() => {
        // Error handled by mutation's onError
      });
    },
  });

  return (
    <Form
      form={form}
      id={props.formId}
      className={cn("max-w-lg space-y-4", isSplit && "max-w-none")}
    >
      <form.AppField name="email">
        {(field) => (
          <field.Field>
            <field.Label>Email</field.Label>
            <field.Content>
              <field.Input
                type="email"
                placeholder="you@example.com"
                className={cn(
                  "focus-visible:border-border focus-visible:ring-border/50",
                  isSplit && "bg-background h-11 shadow-none",
                )}
              />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <form.AppField name="password">
        {(field) => (
          <field.Field className="flex-1">
            <div className="flex items-center justify-between">
              <field.Label>Password</field.Label>
              <Link
                href="/auth/forget-password"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                tabIndex={-1}
              >
                Forgot password ?
              </Link>
            </div>
            <field.Content>
              <field.Input
                type="password"
                className={cn(
                  "focus-visible:border-border focus-visible:ring-border/50",
                  isSplit && "bg-background h-11 shadow-none",
                )}
              />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      {props.hideSubmit ? null : (
        <form.SubmitButton
          className={cn(
            "ring-offset-card w-full ring-offset-2",
            isSplit && "h-11",
          )}
        >
          Sign in
        </form.SubmitButton>
      )}
    </Form>
  );
};
