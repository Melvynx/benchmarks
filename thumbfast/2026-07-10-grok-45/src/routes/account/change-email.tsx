import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, useForm } from "@/features/form/tanstack-form";
import { authClient, useSession } from "@/lib/auth-client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/account/change-email")({
  component: ChangeEmailRoute,
});

const ChangeEmailFormSchema = z.object({
  newEmail: z.string().email("Please enter a valid email address"),
});

type ChangeEmailFormType = z.infer<typeof ChangeEmailFormSchema>;

function ChangeEmailRoute() {
  const navigate = useNavigate();
  const session = useSession();
  const form = useForm({
    schema: ChangeEmailFormSchema,
    defaultValues: {
      newEmail: session.data?.user.email ?? "",
    },
    onSubmit: async (values: ChangeEmailFormType) => {
      try {
        const result = await authClient.changeEmail({
          newEmail: values.newEmail,
        });
        if (result.error) {
          throw new Error(result.error.message ?? "Email update failed");
        }
        toast.success("Verification email sent. Please check your inbox.");
        void navigate({ to: "/account" });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Email update failed",
        );
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Email</CardTitle>
        <CardDescription>
          Enter your new email address. We&apos;ll send a verification link to
          confirm the change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form form={form} className="flex flex-col gap-4">
          <form.AppField name="newEmail">
            {(field) => (
              <field.Field>
                <field.Label>New Email</field.Label>
                <field.Content>
                  <field.Input
                    type="email"
                    placeholder="new-email@example.com"
                  />
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
          <form.SubmitButton className="w-full">Change Email</form.SubmitButton>
        </Form>
      </CardContent>
    </Card>
  );
}
