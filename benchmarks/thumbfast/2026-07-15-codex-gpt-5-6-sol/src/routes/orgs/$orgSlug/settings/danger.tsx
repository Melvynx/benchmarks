import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { Form, useForm } from "@/features/form/tanstack-form";
import { formatId } from "@/lib/format/id";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const DangerSchema = z.object({
  slug: z.string().min(1),
});

export const Route = createFileRoute("/orgs/$orgSlug/settings/danger")({
  component: OrgDangerRoute,
});

function OrgDangerRoute() {
  const { orgSlug } = useParams({ from: "/orgs/$orgSlug/settings/danger" });
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const updateOrgSlug = useMutation(api.app.updateOrgSlug);
  const deleteOrg = useMutation(api.app.deleteOrg);

  const form = useForm({
    schema: DangerSchema,
    defaultValues: { slug: orgSlug },
    onSubmit: async (values) => {
      dialogManager.confirm({
        title: "Are you sure ?",
        description:
          "You are about to change the unique identifier of your organization. All the previous URLs will be changed.",
        action: {
          label: "Yes, change the slug",
          onClick: async () => {
            try {
              const result = await updateOrgSlug({
                orgSlug,
                slug: values.slug,
              });
              toast.success("Organization slug updated");
              await navigate({
                to: "/orgs/$orgSlug/settings/danger",
                params: { orgSlug: result.org.slug },
              });
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to update organization slug",
              );
            }
          },
        },
      });
    },
  });

  function confirmDelete() {
    dialogManager.confirm({
      title: "Delete Organization",
      description: "Are you sure you want to delete your organization?",
      confirmText: orgSlug,
      variant: "destructive",
      action: {
        label: "Delete",
        variant: "destructive",
        onClick: async () => {
          setIsDeleting(true);
          try {
            await deleteOrg({ orgSlug });
            toast.success("Organization deleted", {
              description: "Your organization has been deleted",
            });
            await navigate({ to: "/orgs" });
          } catch (error) {
            toast.error("Error deleting organization", {
              description:
                error instanceof Error
                  ? error.message
                  : "Failed to delete organization",
            });
          } finally {
            setIsDeleting(false);
          }
        },
      },
    });
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-8">
      <Form form={form}>
        <Card>
          <CardHeader>
            <CardTitle>Slug</CardTitle>
            <CardDescription>
              Slug is the unique identifier of your organization. It's used in
              all the URLs, if you change it, all your URLs will be broken.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.AppField name="slug">
              {(field) => (
                <field.Field>
                  <field.Content>
                    <field.Input
                      type="text"
                      placeholder=""
                      onChange={(event) => {
                        const slug = formatId(event.target.value);
                        field.handleChange(slug);
                      }}
                    />
                    <field.Message />
                  </field.Content>
                </field.Field>
              )}
            </form.AppField>
          </CardContent>
          <CardFooter className="flex justify-end border-t">
            <form.SubmitButton>Save</form.SubmitButton>
          </CardFooter>
        </Card>
      </Form>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Delete the organization</CardTitle>
          <CardDescription>
            By deleting your organization, you will lose all your data and your
            subscription will be cancelled.
          </CardDescription>
          <CardDescription>No refund will be provided.</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2 border-t">
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={confirmDelete}
          >
            <Trash2 className="mr-2" size={16} />
            Delete Organization
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
