import { Button } from "@/components/ui/button";
import { Form, useForm } from "@/features/form/tanstack-form";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useMutation } from "@/hooks/use-async-mutation";
import { useAction } from "convex/react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  REFERRAL_SOURCE_VALUES,
  USER_TYPE_VALUES,
} from "./lead-questions.schema";
import {
  LeadQuestionsSchema,
  isValidYoutubeUrl,
} from "./lead-questions.schema";

type ReferralSource = (typeof REFERRAL_SOURCE_VALUES)[number];
type UserType = (typeof USER_TYPE_VALUES)[number];

const USER_TYPES = {
  youtuber: {
    value: "youtuber",
    label: "YouTuber",
    description: "I run my own YouTube channel",
  },
  agency: {
    value: "agency",
    label: "Agency",
    description: "I create thumbnails for clients",
  },
  curious: {
    value: "curious",
    label: "Just curious",
    description: "I'm just exploring",
  },
} as const;

const REFERRAL_SOURCES = {
  melvynx: {
    value: "melvynx",
    label: "From Melvynx (Founder)",
  },
  twitter: {
    value: "twitter",
    label: "Twitter / X",
  },
  youtube: {
    value: "youtube",
    label: "YouTube",
  },
  google: {
    value: "google",
    label: "Google Search",
  },
  friend: {
    value: "friend",
    label: "Friend / Word of mouth",
  },
  other: {
    value: "other",
    label: "Other",
  },
} as const;

const VIDEOS_PER_MONTH_OPTIONS = [
  { value: 2, label: "1-3 videos" },
  { value: 6, label: "4-9 videos" },
  { value: 14, label: "10-19 videos" },
  { value: 25, label: "20+ videos" },
] as const;

type LeadQuestionsStepProps = {
  orgSlug: string;
  onBack?: () => void;
  onComplete: () => void;
};

const slideVariants = {
  initial: (direction: number) => ({ x: `${30 * direction}px`, opacity: 0 }),
  active: { x: "0px", opacity: 1 },
  exit: (direction: number) => ({ x: `${-30 * direction}px`, opacity: 0 }),
};

export function LeadQuestionsStep({
  orgSlug,
  onBack,
  onComplete,
}: LeadQuestionsStepProps) {
  const [subStep, setSubStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const submitLeadQuestions = useAction(api.onboarding.submitLeadQuestions);

  const form = useForm({
    schema: LeadQuestionsSchema,
    defaultValues: {
      referralSource: undefined as unknown as ReferralSource,
      userType: undefined as unknown as UserType,
      youtubeChannelUrl: "",
      videosPerMonth: undefined as number | undefined,
    },
    onSubmit: async (values) => {
      await mutation.mutateAsync(values);
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: {
      referralSource: ReferralSource;
      userType: UserType;
      youtubeChannelUrl?: string;
      videosPerMonth?: number;
    }) => {
      return submitLeadQuestions({ orgSlug, ...values });
    },
    onSuccess: () => {
      onComplete();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const goNext = () => {
    setDirection(1);
    setSubStep((prev) => prev + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setSubStep((prev) => Math.max(0, prev - 1));
  };

  const submitAnswers = (overrides?: {
    userType?: UserType;
    youtubeChannelUrl?: string;
    videosPerMonth?: number;
  }) => {
    const referralSource = form.getFieldValue("referralSource") as
      | ReferralSource
      | undefined;
    const userType = (overrides?.userType ?? form.getFieldValue("userType")) as
      | UserType
      | undefined;
    const youtubeChannelUrl =
      overrides?.youtubeChannelUrl !== undefined
        ? overrides.youtubeChannelUrl
        : form.getFieldValue("youtubeChannelUrl");
    const videosPerMonth =
      overrides?.videosPerMonth !== undefined
        ? overrides.videosPerMonth
        : form.getFieldValue("videosPerMonth");

    if (!referralSource || !userType) {
      toast.error("Please complete all questions before continuing");
      return;
    }

    mutation.mutate({
      referralSource,
      userType,
      youtubeChannelUrl: youtubeChannelUrl?.trim() || undefined,
      videosPerMonth,
    });
  };

  const advanceFromUserType = (userType: UserType) => {
    form.setFieldValue("userType", userType);
    if (userType !== "youtuber") {
      form.setFieldValue("youtubeChannelUrl", "");
    }
    if (userType === "curious") {
      form.setFieldValue("videosPerMonth", undefined);
    }
    if (userType === "youtuber") {
      goNext();
      return;
    }
    if (userType === "agency") {
      setDirection(1);
      setSubStep(3);
      return;
    }
    submitAnswers({
      userType,
      youtubeChannelUrl: "",
      videosPerMonth: undefined,
    });
  };

  const advanceFromYoutubeUrl = () => {
    const rawUrl = form.getFieldValue("youtubeChannelUrl") ?? "";
    const url = rawUrl.trim();
    if (!url) {
      toast.error("Please enter your YouTube channel link");
      return;
    }
    if (!isValidYoutubeUrl(url)) {
      toast.error("That doesn't look like a YouTube channel URL");
      return;
    }
    if (url !== rawUrl) {
      form.setFieldValue("youtubeChannelUrl", url);
    }
    setDirection(1);
    setSubStep(3);
  };

  const advanceFromVideosPerMonth = () => {
    const videosPerMonth = form.getFieldValue("videosPerMonth");
    if (!videosPerMonth) {
      toast.error("Please pick how many videos you publish per month");
      return;
    }
    submitAnswers({ videosPerMonth });
  };

  const handleBack = () => {
    if (subStep === 0 && onBack) {
      onBack();
      return;
    }
    if (subStep === 3) {
      const userType = form.getFieldValue("userType");
      setDirection(-1);
      setSubStep(userType === "youtuber" ? 2 : 1);
      return;
    }
    if (subStep === 2) {
      setDirection(-1);
      setSubStep(1);
      return;
    }
    goBack();
  };

  return (
    <Form form={form} className="flex flex-col gap-6">
      <AnimatePresence mode="wait" custom={direction}>
        {subStep === 0 && (
          <motion.div
            key="lead-step-0"
            variants={slideVariants}
            initial="initial"
            animate="active"
            exit="exit"
            transition={{ duration: 0.2 }}
            custom={direction}
          >
            <QuestionTitle title="Where did you hear about us?" />
            <div className="flex flex-col gap-2">
              {Object.values(REFERRAL_SOURCES).map((source) => (
                <form.Subscribe
                  key={source.value}
                  selector={(state) => state.values.referralSource}
                >
                  {(currentSource) => (
                    <ChoiceCard
                      label={source.label}
                      selected={currentSource === source.value}
                      onClick={() => {
                        form.setFieldValue("referralSource", source.value);
                        goNext();
                      }}
                    />
                  )}
                </form.Subscribe>
              ))}
            </div>
            {onBack && <BackButton onClick={handleBack} />}
          </motion.div>
        )}

        {subStep === 1 && (
          <motion.div
            key="lead-step-1"
            variants={slideVariants}
            initial="initial"
            animate="active"
            exit="exit"
            transition={{ duration: 0.2 }}
            custom={direction}
          >
            <QuestionTitle title="Are you a YouTuber, agency, or just curious?" />
            <div className="flex flex-col gap-2">
              {Object.values(USER_TYPES).map((type) => (
                <form.Subscribe
                  key={type.value}
                  selector={(state) => state.values.userType}
                >
                  {(currentType) => (
                    <ChoiceCard
                      label={type.label}
                      description={type.description}
                      selected={currentType === type.value}
                      onClick={() => advanceFromUserType(type.value)}
                    />
                  )}
                </form.Subscribe>
              ))}
            </div>
            <BackButton onClick={handleBack} />
          </motion.div>
        )}

        {subStep === 2 && (
          <motion.div
            key="lead-step-2"
            variants={slideVariants}
            initial="initial"
            animate="active"
            exit="exit"
            transition={{ duration: 0.2 }}
            custom={direction}
          >
            <QuestionTitle title="What's your YouTube channel link?" />
            <form.AppField name="youtubeChannelUrl">
              {(field) => (
                <field.Field>
                  <field.Content>
                    <field.Input
                      type="url"
                      placeholder="https://youtube.com/@yourchannel"
                      autoFocus
                    />
                    <field.Message />
                  </field.Content>
                </field.Field>
              )}
            </form.AppField>
            <p className="text-muted-foreground mt-2 text-xs">
              We&apos;ll auto-fill your organization name and logo from your
              channel.
            </p>
            <PrimaryButton
              onClick={advanceFromYoutubeUrl}
              loading={mutation.isPending}
            >
              Continue
              <ArrowRight className="size-5" />
            </PrimaryButton>
            <BackButton onClick={handleBack} />
          </motion.div>
        )}

        {subStep === 3 && (
          <motion.div
            key="lead-step-3"
            variants={slideVariants}
            initial="initial"
            animate="active"
            exit="exit"
            transition={{ duration: 0.2 }}
            custom={direction}
          >
            <QuestionTitle title="How many videos do you publish per month?" />
            <div className="flex flex-col gap-2">
              {VIDEOS_PER_MONTH_OPTIONS.map((option) => (
                <form.Subscribe
                  key={option.value}
                  selector={(state) => state.values.videosPerMonth}
                >
                  {(currentValue) => (
                    <ChoiceCard
                      label={option.label}
                      selected={currentValue === option.value}
                      onClick={() => {
                        form.setFieldValue("videosPerMonth", option.value);
                      }}
                    />
                  )}
                </form.Subscribe>
              ))}
            </div>
            <form.Subscribe selector={(state) => state.values.videosPerMonth}>
              {(videosPerMonth) => (
                <PrimaryButton
                  onClick={advanceFromVideosPerMonth}
                  disabled={!videosPerMonth}
                  loading={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="size-5" />
                    </>
                  )}
                </PrimaryButton>
              )}
            </form.Subscribe>
            <BackButton onClick={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </Form>
  );
}

function QuestionTitle({ title }: { title: string }) {
  return <h2 className="mb-4 text-xl font-semibold">{title}</h2>;
}

function ChoiceCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-lg border-2 px-4 py-3 text-left text-sm transition-all duration-200",
        selected
          ? "border-primary bg-primary/10 font-medium"
          : "border-border hover:border-primary/40 hover:bg-accent/50",
      )}
    >
      {selected && (
        <Check className="text-primary absolute top-3 right-3 size-4" />
      )}
      <div className="pr-6">
        <span className="block">{label}</span>
        {description && (
          <span className="text-muted-foreground mt-0.5 block text-xs">
            {description}
          </span>
        )}
      </div>
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled ?? loading}
      className={cn(
        "group relative mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl px-10 py-5 text-lg font-semibold transition-all duration-300",
        "bg-primary text-primary-foreground shadow-lg",
        "hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-xl",
        "shadow-primary/25 hover:shadow-primary/40",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className="mt-3 w-fit"
      onClick={onClick}
    >
      <ArrowLeft className="mr-1 size-4" />
      Back
    </Button>
  );
}
