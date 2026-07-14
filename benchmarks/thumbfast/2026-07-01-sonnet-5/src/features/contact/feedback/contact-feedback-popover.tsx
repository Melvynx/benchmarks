import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InlineTooltip } from "@/components/ui/tooltip";
import { Form, useForm } from "@/features/form/tanstack-form";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { useAction as useConvexAction } from "convex/react";
import { Angry, Frown, Meh, SmilePlus } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { ContactFeedbackSchemaType } from "./contact-feedback.schema";
import { ContactFeedbackSchema } from "./contact-feedback.schema";

type ContactFeedbackPopoverProps = PropsWithChildren;

const ReviewInputItems = [
  {
    value: "1",
    icon: Angry,
    tooltip: "Extremely dissatisfied",
  },
  {
    value: "2",
    icon: Frown,
    tooltip: "Somewhat dissatisfied",
  },
  {
    value: "3",
    icon: Meh,
    tooltip: "Neutral",
  },
  {
    value: "4",
    icon: SmilePlus,
    tooltip: "Satisfied",
  },
];

export function ContactFeedbackPopover({ children }: ContactFeedbackPopoverProps) {
  const [open, setOpen] = useState(false);
  const session = useSession();
  const email = session.data?.user ? session.data.user.email : "";
  const sendFeedback = useConvexAction(api.forms.submitFeedback);

  const mutation = useQueryMutation({
    mutationFn: async (values: ContactFeedbackSchemaType) => {
      return sendFeedback(values);
    },
    onSuccess: () => {
      toast.success("Your feedback has been sent. Thanks!");
      form.reset();
      setOpen(false);
    },
    onError: () => {
      toast.error("An error occurred");
    },
  });

  const form = useForm({
    schema: ContactFeedbackSchema,
    defaultValues: {
      email,
      message: "",
      review: undefined,
    },
    onSubmit: async (values) => {
      mutation.mutate(values);
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? <Button variant="outline">Feedback</Button>}
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0">
        <Form form={form}>
          <div className="flex flex-col gap-4">
            <div className="p-2">
              {email ? null : (
                <form.AppField name="email">
                  {(field) => (
                    <field.Field>
                      <field.Label>Email</field.Label>
                      <field.Content>
                        <field.Input type="email" placeholder="Email" />
                        <field.Message />
                      </field.Content>
                    </field.Field>
                  )}
                </form.AppField>
              )}

              <form.AppField name="message">
                {(field) => (
                  <field.Field>
                    <field.Label>Message</field.Label>
                    <field.Content>
                      <field.Textarea placeholder="Enter your message" />
                      <field.Message />
                    </field.Content>
                  </field.Field>
                )}
              </form.AppField>
            </div>
            <div className="border-accent bg-accent/50 flex w-full items-center justify-between border-t p-2">
              <form.AppField name="review">
                {(field) => (
                  <div className="flex items-center gap-2">
                    <ReviewInput
                      onChange={(value) => field.handleChange(value)}
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.AppField>
              <form.SubmitButton
                disabled={mutation.isPending}
                variant="outline"
              >
                Send
              </form.SubmitButton>
            </div>
          </div>
        </Form>
      </PopoverContent>
    </Popover>
  );
}

function ReviewInput({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) {
  return (
    <>
      {ReviewInputItems.map((item) => (
        <InlineTooltip key={item.value} title={item.tooltip}>
          <button
            type="button"
            aria-label={item.tooltip}
            onClick={() => onChange(item.value)}
            className={cn("transition hover:scale-110 hover:rotate-12", {
              "text-primary scale-110": value === item.value,
            })}
          >
            <item.icon size={24} />
          </button>
        </InlineTooltip>
      ))}
    </>
  );
}
