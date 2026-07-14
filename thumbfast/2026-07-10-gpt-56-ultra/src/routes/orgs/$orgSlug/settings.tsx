import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, useForm } from "@/features/form/tanstack-form";
import { ImageFormItem } from "@/features/images/image-form-item";
import { Layout, LayoutContent } from "@/features/page/layout";
import { api } from "@convex/_generated/api";
import {
  Outlet,
  createFileRoute,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";

const OrgSettingsSchema = z.object({
  name: z.string().min(1),
  logo: z.string().nullable(),
});

export const Route = createFileRoute("/orgs/$orgSlug/settings")({
  component: OrgSettingsRoute,
});

function OrgSettingsRoute() {
  const { orgSlug } = useParams({ from: "/orgs/$orgSlug/settings" });
  const location = useLocation();
  const isSettingsIndex = location.pathname === `/orgs/${orgSlug}/settings`;
  const settings = useQuery(api.app.orgSettings, { orgSlug });
  const updateOrgName = useMutation(api.app.updateOrgName);
  const initializedOrgRef = useRef<string | null>(null);

  const form = useForm({
    schema: OrgSettingsSchema,
    defaultValues: {
      name: "",
      logo: null,
    },
    onSubmit: async (values) => {
      const result = await updateOrgName({
        orgSlug,
        name: values.name,
        logo: values.logo,
      });
      form.setFieldValue("name", result.org.name);
      form.setFieldValue("logo", result.org.logo);
      initializedOrgRef.current = result.org.slug;
      toast.success("Organization updated");
    },
  });

  useEffect(() => {
    if (!settings) {
      return;
    }

    if (initializedOrgRef.current === settings.org.slug) {
      return;
    }

    initializedOrgRef.current = settings.org.slug;
    form.setFieldValue("name", settings.org.name);
    form.setFieldValue("logo", settings.org.logo ?? null);
  }, [form, settings]);

  return (
    <Layout size="lg">
      <LayoutContent className="space-y-4">
        {isSettingsIndex ? (
          <Form form={form} className="flex w-full flex-col gap-6 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
                <CardDescription>
                  Add a custom image to your organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form.AppField name="logo">
                  {(field) => (
                    <field.Field>
                      <field.Content>
                        <ImageFormItem
                          className="size-32 rounded-full"
                          imageUrl={field.state.value}
                          onChange={(url) => field.handleChange(url)}
                        />
                        <field.Message />
                      </field.Content>
                    </field.Field>
                  )}
                </form.AppField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Name</CardTitle>
                <CardDescription>
                  Use your organization's name or your name if you don't have an
                  organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form.AppField name="name">
                  {(field) => (
                    <field.Field>
                      <field.Content>
                        <field.Input placeholder="" />
                        <field.Message />
                      </field.Content>
                    </field.Field>
                  )}
                </form.AppField>
              </CardContent>
            </Card>

            <Card className="flex items-end p-6">
              <form.SubmitButton className="w-fit">Save</form.SubmitButton>
            </Card>
          </Form>
        ) : (
          <Outlet />
        )}
      </LayoutContent>
    </Layout>
  );
}
