import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, useForm } from "@/features/form/tanstack-form";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/account/change-password")({
  component: ChangePasswordRoute,
});

const ChangePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    revokeOtherSessions: z.boolean().default(true),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormType = z.infer<typeof ChangePasswordFormSchema>;

function ChangePasswordRoute() {
  const navigate = useNavigate();
  const form = useForm({
    schema: ChangePasswordFormSchema,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: true,
    },
    onSubmit: async (values: ChangePasswordFormType) => {
      try {
        const result = await authClient.changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          revokeOtherSessions: values.revokeOtherSessions,
        });
        if (result.error) {
          throw new Error(result.error.message ?? "Password update failed");
        }
        toast.success("Password changed successfully");
        void navigate({ to: "/account" });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Password update failed",
        );
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <Form form={form}>
        <CardContent className="flex flex-col gap-4">
          <form.AppField name="currentPassword">
            {(field) => (
              <field.Field>
                <field.Label>Current Password</field.Label>
                <field.Content>
                  <field.Input type="password" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="newPassword">
            {(field) => (
              <field.Field>
                <field.Label>New Password</field.Label>
                <field.Content>
                  <field.Input type="password" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {(field) => (
              <field.Field>
                <field.Label>Confirm New Password</field.Label>
                <field.Content>
                  <field.Input type="password" />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.AppField name="revokeOtherSessions">
            {(field) => (
              <div className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3 shadow-sm">
                <div className="flex flex-col gap-0.5">
                  <field.Label>Sign out from other devices</field.Label>
                  <field.Description>
                    This will sign you out from all other devices where
                    you&apos;re currently logged in.
                  </field.Description>
                </div>
                <field.Switch />
              </div>
            )}
          </form.AppField>
          <form.SubmitButton className="w-full">
            Change Password
          </form.SubmitButton>
        </CardContent>
      </Form>
    </Card>
  );
}
