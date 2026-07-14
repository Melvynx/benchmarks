import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, useForm } from "@/features/form/tanstack-form";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useAction } from "convex/react";
import type { FunctionReference } from "convex/server";
import { toast } from "sonner";
import { z } from "zod";

const CANCEL_REASONS = {
  too_expensive: "Too expensive",
  not_using: "Not using the product enough",
  missing_features: "Missing features",
  bugs: "Too many bugs/issues",
  competitor: "Switching to a competitor",
  other: "Other",
} as const;

const CancelSchema = z.object({
  reasonType: z.enum([
    "too_expensive",
    "not_using",
    "missing_features",
    "bugs",
    "competitor",
    "other",
  ] as const),
  details: z
    .string()
    .min(10, "Please provide more details (minimum 10 characters)"),
});

type BillingCancelApi = {
  billing: {
    openStripePortal: FunctionReference<
      "action",
      "public",
      { orgSlug: string; returnUrl: string },
      { url: string }
    >;
  };
};

const billingCancelApi = api as unknown as BillingCancelApi;

export const Route = createFileRoute("/orgs/$orgSlug/settings/billing/cancel")({
  component: BillingCancelRoute,
});

function BillingCancelRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/billing/cancel",
  });
  const navigate = useNavigate();
  const openStripePortal = useAction(billingCancelApi.billing.openStripePortal);

  const form = useForm({
    schema: CancelSchema,
    defaultValues: {
      reasonType: "other" as keyof typeof CANCEL_REASONS,
      details: "",
    },
    onSubmit: async () => {
      try {
        const result = await openStripePortal({
          orgSlug,
          returnUrl: `/orgs/${orgSlug}/settings/billing`,
        });
        toast.success(
          "Redirecting to billing portal where you can cancel your subscription.",
        );
        window.location.assign(result.url);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to open billing portal",
        );
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="h2">Cancel Subscription</Typography>
        <Typography variant="muted">
          We're sorry to see you go. Please let us know why you're cancelling so
          we can improve our service.
        </Typography>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cancel Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <Form form={form}>
            <div className="flex flex-col gap-6">
              <form.AppField name="reasonType">
                {(field) => (
                  <field.Field>
                    <field.Label>
                      What's your main reason for cancelling?
                    </field.Label>
                    <field.Content>
                      <RadioGroup
                        name={field.name}
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(
                            value as keyof typeof CANCEL_REASONS,
                          )
                        }
                        className="gap-2"
                      >
                        {Object.entries(CANCEL_REASONS).map(
                          ([value, label]) => (
                            <div
                              key={value}
                              className="flex items-center gap-3"
                            >
                              <RadioGroupItem value={value} />
                              <label className="cursor-pointer text-sm font-normal">
                                {label}
                              </label>
                            </div>
                          ),
                        )}
                      </RadioGroup>
                      <field.Message />
                    </field.Content>
                  </field.Field>
                )}
              </form.AppField>

              <form.AppField name="details">
                {(field) => (
                  <field.Field>
                    <field.Label>Additional details</field.Label>
                    <field.Content>
                      <field.Textarea
                        placeholder="Please provide more details to help us improve..."
                        className="min-h-[100px]"
                      />
                      <field.Message />
                    </field.Content>
                  </field.Field>
                )}
              </form.AppField>

              <div className="flex gap-4">
                <form.SubmitButton variant="destructive">
                  Confirm Cancellation
                </form.SubmitButton>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void navigate({
                      to: "/orgs/$orgSlug/settings/billing",
                      params: { orgSlug },
                    })
                  }
                >
                  Go Back
                </Button>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
