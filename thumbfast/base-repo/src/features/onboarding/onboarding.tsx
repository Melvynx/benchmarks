import { MultiImageUploader } from "@/components/multi-image-uploader";
import { Button } from "@/components/ui/button";
import { Form, useForm } from "@/features/form/tanstack-form";
import { testimonials } from "@/features/landing/testimonials-section";
import type { Person } from "@/features/person/person.query";
import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing-error";
import { usePersonQualityCheck } from "@/features/person/use-person-quality-check";
import { upfetch } from "@/lib/up-fetch";
import { cn } from "@/lib/utils";
import { SiteConfig } from "@/site-config";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "@/hooks/use-async-mutation";
import { useAction, useMutation as useConvexMutation } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  CreditCard,
  Eye,
  ImageIcon,
  LockKeyhole,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Sprout,
  User,
  WandSparkles,
} from "lucide-react";
import Image from "@/compat/image";
import { useRouter } from "@/compat/navigation";
import { useState } from "react";
import { useMeasure } from "react-use";
import { toast } from "sonner";
import { CreatePersonOnboardingSchema } from "../person/person.schema";
import { LeadQuestionsStep } from "./lead-questions";

function BigCtaButton({
  children,
  disabled,
  loading,
  onClick,
  type = "button",
  className,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled ?? loading}
      className={cn(
        "group relative inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl px-10 py-5 text-lg font-semibold transition-all duration-300",
        "bg-primary text-primary-foreground shadow-lg",
        "hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-xl",
        "shadow-primary/25 hover:shadow-primary/40",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className="absolute inset-0 rounded-2xl bg-linear-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative flex items-center gap-3">
        {loading ? (
          <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          children
        )}
      </span>
    </button>
  );
}

type OnboardingProps = {
  orgSlug: string;
  randomInspirations: {
    id: string;
    name: string;
    thumbnailUrls: string[];
    aiDescription: string;
  }[];
  existingPerson?: Person | null;
  questionsAnswered?: boolean;
  debugMode?: boolean;
  initialDebugStep?: number;
};

const STEP_VIDEOS: Record<number, string> = {
  1: "https://www.tella.tv/video/melvynxs-video-d39w/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0",
};

const PRESET_PROMPTS = [
  "Me laughing. The background is red.",
  "Me looking shocked, mouth open.",
  "Be creative, surprise me!",
] as const;

const PRO_PLAN = AUTH_PLANS.find((plan) => plan.name === "pro");
const PRO_MONTHLY_PRICE = `$${PRO_PLAN?.price ?? 20}/month`;

const STEPS = [
  {
    id: 1,
    label: "Add Person",
    icon: User,
  },
  {
    id: 2,
    label: "Pick Style",
    icon: ImageIcon,
  },
  {
    id: 3,
    label: "About You",
    icon: Sprout,
  },
  {
    id: 4,
    label: "Demo",
    icon: WandSparkles,
  },
  {
    id: 5,
    label: "Pro Trial",
    icon: CreditCard,
  },
  {
    id: 6,
    label: "Prompt",
    icon: MessageSquare,
  },
] as const;

const slideVariants = {
  initial: (direction: number) => ({
    x: `${40 * direction}px`,
    opacity: 0,
  }),
  active: {
    x: "0px",
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: `${-40 * direction}px`,
    opacity: 0,
  }),
};

export function Onboarding({
  orgSlug,
  randomInspirations,
  existingPerson,
  questionsAnswered = false,
  debugMode = false,
  initialDebugStep,
}: OnboardingProps) {
  const router = useRouter();
  const searchParams =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const resumeStep = searchParams.get("step");
  const resumeStyleId = searchParams.get("style");
  const initialStep = debugMode
    ? (initialDebugStep ?? 1)
    : resumeStep === "prompt"
      ? 6
      : !existingPerson
        ? 1
        : 2;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(1);
  const [contentRef, contentBounds] = useMeasure<HTMLDivElement>();
  const [createdPerson, setCreatedPerson] = useState<Person | null>(
    existingPerson ?? null,
  );
  const [selectedInspiration, setSelectedInspiration] = useState<{
    id: string;
    name: string;
    thumbnailUrls: string[];
  } | null>(
    randomInspirations.find(
      (inspiration) => inspiration.id === resumeStyleId,
    ) ?? (debugMode ? (randomInspirations[0] ?? null) : null),
  );
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const completeOnboarding = useConvexMutation(
    api.onboarding.completeOnboarding,
  );
  const createPrompt = useConvexMutation(api.onboarding.createPrompt);
  const upgradeOrg = useAction(api.billing.upgradeOrg);

  const skipMutation = useMutation({
    mutationFn: async () => {
      await completeOnboarding({ orgSlug });
    },
    onSuccess: () => {
      router.push(`/orgs/${orgSlug}`);
    },
    onError: (error) => {
      toast.error(getUserFacingErrorMessage(error));
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (promptText: string) => {
      await completeOnboarding({ orgSlug });

      const prompt = await createPrompt({
        orgSlug,
        textPrompt: promptText,
        personIds: createdPerson ? [createdPerson.id] : [],
        inspirationIds: selectedInspiration ? [selectedInspiration.id] : [],
        userImageIds: [],
      });

      return prompt;
    },
    onSuccess: (prompt) => {
      router.push(`/orgs/${orgSlug}/thumbnails/${prompt.id}?autoGenerate=true`);
    },
    onError: (error) => {
      toast.error(getUserFacingErrorMessage(error));
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const styleSearch = selectedInspiration
        ? `&style=${encodeURIComponent(selectedInspiration.id)}`
        : "";
      const returnPath = `/orgs/${orgSlug}/onboard?step=prompt${styleSearch}`;
      return upgradeOrg({
        orgSlug,
        plan: "pro",
        annual: false,
        successUrl: returnPath,
        cancelUrl: returnPath,
        offer: "onboarding_trial",
      });
    },
    onSuccess: (result) => {
      window.location.assign(result.url);
    },
    onError: (error) => {
      toast.error(getUserFacingErrorMessage(error));
    },
  });

  const goToStep = (step: number) => {
    const nextStep = Math.min(Math.max(step, 1), STEPS.length);
    setDirection(nextStep > currentStep ? 1 : -1);
    setCurrentStep(nextStep);
  };

  const handleQuestionsCompleted = () => {
    goToStep(4);
  };

  const handlePersonCreated = (person: Person) => {
    setCreatedPerson(person);
    goToStep(2);
  };

  const handleInspirationSelected = (
    inspiration: (typeof randomInspirations)[0],
  ) => {
    setSelectedInspiration(inspiration);
    goToStep(questionsAnswered ? 4 : 3);
  };

  const handleFinish = (promptText: string) => {
    if (debugMode) {
      toast.info("Debug preview: generation is disabled.");
      return;
    }

    if (!selectedInspiration) {
      toast.error("Please select an inspiration first");
      return;
    }
    completeMutation.mutate(promptText);
  };

  return (
    <div className="bg-background relative flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-12">
      <div className="bg-muted/30 pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        className={cn(
          "relative z-10 flex w-full flex-col items-center transition-[max-width] duration-300",
          currentStep === 5 ? "max-w-6xl" : "max-w-2xl",
        )}
      >
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome to {SiteConfig.title}
          </h1>
          <p className="text-muted-foreground mt-2 text-base sm:text-lg">
            Create your first AI thumbnail in under 2 minutes
          </p>
        </div>

        <StepProgress
          currentStep={currentStep}
          debugMode={debugMode}
          onStepSelect={goToStep}
        />

        {debugMode ? (
          <DebugPreviewBanner orgSlug={orgSlug} currentStep={currentStep} />
        ) : null}

        <div className="mt-8 w-full">
          <motion.div
            animate={{ height: contentBounds.height || "auto" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full overflow-hidden"
          >
            <div ref={contentRef}>
              <AnimatePresence mode="wait" custom={direction}>
                {currentStep === 1 && (
                  <motion.div
                    key="step-person"
                    variants={slideVariants}
                    initial="initial"
                    animate="active"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    custom={direction}
                  >
                    <StepCard
                      title="Who appears in your thumbnails?"
                      description="Upload photos of yourself, a character, or anyone you want the AI to place in thumbnails."
                      videoUrl={STEP_VIDEOS[1]}
                    >
                      <PersonFormOnboarding
                        orgSlug={orgSlug}
                        onSuccess={handlePersonCreated}
                      />
                    </StepCard>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step-style"
                    variants={slideVariants}
                    initial="initial"
                    animate="active"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    custom={direction}
                  >
                    <StepCard
                      title="Pick a thumbnail style"
                      description="Tap the style you like -- the AI will use it as a reference."
                    >
                      <InspirationPicker
                        inspirations={randomInspirations}
                        selectedInspiration={selectedInspiration}
                        onSelect={handleInspirationSelected}
                      />
                      {!createdPerson && (
                        <div className="mt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-fit"
                            onClick={() => goToStep(1)}
                          >
                            <ArrowLeft className="mr-1 size-4" />
                            Back
                          </Button>
                        </div>
                      )}
                    </StepCard>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step-questions"
                    variants={slideVariants}
                    initial="initial"
                    animate="active"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    custom={direction}
                  >
                    <StepCard
                      title="Tell us about you"
                      description="A few quick questions to tailor your experience."
                    >
                      <LeadQuestionsStep
                        orgSlug={orgSlug}
                        onBack={() => goToStep(2)}
                        onComplete={handleQuestionsCompleted}
                      />
                    </StepCard>
                  </motion.div>
                )}

                {currentStep === 4 && (
                  <motion.div
                    key="step-value"
                    variants={slideVariants}
                    initial="initial"
                    animate="active"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    custom={direction}
                  >
                    <StepCard
                      title="See how Thumbfa.st uses your template"
                      description="Your selected style becomes the creative direction for your first generation."
                    >
                      <ValueDemoStep
                        selectedInspiration={selectedInspiration}
                        onBack={() => goToStep(questionsAnswered ? 2 : 3)}
                        onContinue={() => goToStep(5)}
                      />
                    </StepCard>
                  </motion.div>
                )}

                {currentStep === 5 && (
                  <motion.div
                    key="step-upgrade"
                    variants={slideVariants}
                    initial="initial"
                    animate="active"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    custom={direction}
                  >
                    <StepCard title="Start Pro with a 7-day trial">
                      <UpgradeOfferStep
                        isLoading={upgradeMutation.isPending}
                        onAccept={() => {
                          if (debugMode) {
                            toast.info(
                              "Debug preview: Stripe checkout is disabled.",
                            );
                            return;
                          }
                          upgradeMutation.mutate();
                        }}
                        onDecline={() => goToStep(6)}
                      />
                    </StepCard>
                  </motion.div>
                )}

                {currentStep === 6 && (
                  <motion.div
                    key="step-prompt"
                    variants={slideVariants}
                    initial="initial"
                    animate="active"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    custom={direction}
                  >
                    <StepCard
                      title="What should the AI create?"
                      description="Pick a prompt or write your own."
                    >
                      <PromptPicker
                        selectedPrompt={selectedPrompt}
                        onSelect={setSelectedPrompt}
                        onGenerate={handleFinish}
                        onBack={() => goToStep(5)}
                        isLoading={completeMutation.isPending}
                      />
                    </StepCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <div className="mt-6">
          {debugMode ? (
            <Button asChild variant="ghost" size="sm">
              <a href={`/orgs/${orgSlug}`}>Exit debug preview</a>
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => skipMutation.mutate()}
              disabled={skipMutation.isPending}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors"
            >
              {skipMutation.isPending
                ? "Skipping..."
                : "Skip, I'll explore on my own"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepProgress({
  currentStep,
  debugMode = false,
  onStepSelect,
}: {
  currentStep: number;
  debugMode?: boolean;
  onStepSelect?: (step: number) => void;
}) {
  return (
    <div className="flex w-full max-w-2xl items-center overflow-x-auto pb-1">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const Icon = step.icon;

        return (
          <div key={step.id} className="contents">
            <button
              type="button"
              disabled={!debugMode}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => onStepSelect?.(step.id)}
              className={cn(
                "flex min-w-12 flex-col items-center gap-1.5 rounded-md",
                debugMode
                  ? "focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
                  : "cursor-default",
              )}
            >
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2 transition-colors duration-300 sm:size-10",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground/50",
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium whitespace-nowrap transition-colors duration-300 sm:block",
                  isCurrent
                    ? "text-foreground"
                    : isCompleted
                      ? "text-primary"
                      : "text-muted-foreground/60",
                )}
              >
                {step.label}
              </span>
            </button>

            {index < STEPS.length - 1 && (
              <div className="relative mx-2 mb-5 h-0.5 min-w-5 flex-1 sm:mx-3">
                <div className="bg-muted-foreground/20 absolute inset-0 rounded-full" />
                <motion.div
                  className="bg-primary absolute inset-y-0 left-0 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{
                    width: isCompleted ? "100%" : "0%",
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DebugPreviewBanner({
  orgSlug,
  currentStep,
}: {
  orgSlug: string;
  currentStep: number;
}) {
  const step = STEPS.find((item) => item.id === currentStep);

  return (
    <div className="mt-4 flex w-full max-w-2xl flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">Admin debug preview</p>
          <p className="text-muted-foreground">
            Viewing {step?.label ?? "onboarding"} without changing onboarding
            completion.
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={`/orgs/${orgSlug}/onboard?adminDebug=1&step=trial`}>
          Pro Trial
        </a>
      </Button>
    </div>
  );
}

function StepCard({
  title,
  description,
  videoUrl,
  children,
}: {
  title: string;
  description?: string;
  videoUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card w-full rounded-xl border p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {videoUrl && (
        <div
          className="relative mb-6 w-full overflow-hidden rounded-lg"
          style={{ paddingBottom: "56.25%", height: 0 }}
        >
          <iframe
            className="absolute inset-0 size-full border-0"
            src={videoUrl}
            title="Tutorial video"
            allowFullScreen
            allow="transparency"
          />
        </div>
      )}
      {children}
    </div>
  );
}

function PersonFormOnboarding({
  orgSlug,
  onSuccess,
}: {
  orgSlug: string;
  onSuccess: (person: Person) => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const generatePersonDescription = useAction(
    api.onboarding.generatePersonDescription,
  );
  const createPerson = useConvexMutation(api.onboarding.createPerson);
  const generateUploadUrl = useConvexMutation(
    api.app.generatePersonImageUploadUrl,
  );
  const resolveUpload = useConvexMutation(api.app.resolvePersonImageUpload);
  const runQualityCheck = usePersonQualityCheck(orgSlug);

  const handleImagesChange = (next: string[]) => {
    const addedUrl = next.find((url) => !images.includes(url));
    setImages(next);
    if (addedUrl) {
      void runQualityCheck(addedUrl, { onReplace: () => setImages([]) });
    }
  };

  const mutation = useMutation({
    mutationFn: async (values: { name: string; images: string[] }) => {
      const descriptionResult = await generatePersonDescription({
        images: values.images.slice(0, 2),
      });

      return createPerson({
        orgSlug,
        name: values.name,
        description: descriptionResult.description,
        images: values.images,
      });
    },
    onSuccess: async (data) => {
      toast.success("Person created");
      onSuccess(data);
    },
    onError: (error: Error) => {
      toast.error(getUserFacingErrorMessage(error));
    },
  });

  const form = useForm({
    schema: CreatePersonOnboardingSchema,
    defaultValues: {
      name: "",
    },
    onSubmit: async (values) => {
      await mutation.mutateAsync({
        name: values.name,
        images,
      });
    },
  });

  const handleUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ orgSlug });
      const result = await upfetch<{ storageId: Id<"_storage"> }>(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      return resolveUpload({ orgSlug, storageId: result.storageId });
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Upload failed"));
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Form form={form} className="flex flex-col gap-5">
      <form.AppField name="name">
        {(field) => (
          <field.Field>
            <field.Label>Name</field.Label>
            <field.Content>
              <field.Input placeholder="e.g., Alex - Tech Creator" autoFocus />
              <field.Message />
            </field.Content>
          </field.Field>
        )}
      </form.AppField>

      <div>
        <p className="text-muted-foreground mb-2 text-sm">
          Upload one clear photo. A front-facing face works best — create
          separate persons for multiple faces.
        </p>
        <MultiImageUploader
          images={images}
          onImagesChange={handleImagesChange}
          onUpload={handleUpload}
          maxImages={1}
          isUploading={isUploading}
          compact
        />
      </div>

      <BigCtaButton type="submit" disabled={images.length === 0}>
        Continue
        <ArrowRight className="size-5" />
      </BigCtaButton>
    </Form>
  );
}

function InspirationPicker({
  inspirations,
  selectedInspiration,
  onSelect,
}: {
  inspirations: OnboardingProps["randomInspirations"];
  selectedInspiration: { id: string } | null;
  onSelect: (inspiration: OnboardingProps["randomInspirations"][0]) => void;
}) {
  if (inspirations.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center py-10 text-center text-sm">
        <ImageIcon className="text-muted-foreground/40 mb-3 size-10" />
        <p>No inspiration styles available yet.</p>
        <p className="mt-1 text-xs">Contact support or try again later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {inspirations.map((inspiration) => {
        const isSelected = selectedInspiration?.id === inspiration.id;
        return (
          <button
            key={inspiration.id}
            type="button"
            onClick={() => onSelect(inspiration)}
            className={cn(
              "group relative aspect-video cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-200",
              isSelected
                ? "border-primary ring-primary/30 ring-4"
                : "hover:border-muted-foreground/30 border-transparent",
            )}
          >
            {inspiration.thumbnailUrls[0] && (
              <Image
                src={inspiration.thumbnailUrls[0]}
                alt={inspiration.name}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className={cn(
                  "object-cover transition-transform duration-200",
                  !isSelected && "group-hover:scale-105",
                )}
              />
            )}

            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-200",
                isSelected
                  ? "bg-primary/10"
                  : "bg-black/0 group-hover:bg-black/10",
              )}
            />

            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-primary absolute top-2 right-2 flex size-6 items-center justify-center rounded-full shadow-md"
              >
                <Check className="text-primary-foreground size-3.5" />
              </motion.div>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-2 pt-6">
              <p className="truncate text-xs font-medium text-white">
                {inspiration.name}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ValueDemoStep({
  selectedInspiration,
  onBack,
  onContinue,
}: {
  selectedInspiration: {
    id: string;
    name: string;
    thumbnailUrls: string[];
  } | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  const previewUrl = selectedInspiration?.thumbnailUrls[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
        <div className="border-border bg-background relative aspect-video overflow-hidden rounded-lg border">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={selectedInspiration.name}
              fill
              sizes="(max-width: 640px) 100vw, 380px"
              className="object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
              Template preview
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-3">
          <div className="flex items-start gap-3">
            <BadgeCheck className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">Template locked</p>
              <p className="text-muted-foreground text-sm">
                Thumbfa.st keeps the composition, colors, and contrast from the
                style you picked.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">Your person stays consistent</p>
              <p className="text-muted-foreground text-sm">
                The uploaded face reference is reused so the result still feels
                like your channel.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Eye className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">Built for click testing</p>
              <p className="text-muted-foreground text-sm">
                Generate multiple directions quickly, then keep the strongest
                idea for your next upload.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted/40 rounded-lg border p-4">
        <p className="text-sm font-medium">Demo flow</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick a proven template, write one prompt, then Thumbfa.st creates a
          YouTube-ready thumbnail direction with your subject and style.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <BigCtaButton onClick={onContinue}>
          Continue
          <ArrowRight className="size-5" />
        </BigCtaButton>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit self-center"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

function UpgradeOfferStep({
  isLoading,
  onAccept,
  onDecline,
}: {
  isLoading: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const trialMilestones = [
    {
      icon: Check,
      title: "Today: start for $0",
      description: "Confirm the trial in Stripe. No charge is made today.",
      tone: "primary",
    },
    {
      icon: Sparkles,
      title: "Today: get 50 free credits",
      description:
        "Use them immediately to test real thumbnail output quality.",
      tone: "primary",
    },
    {
      icon: Mail,
      title: "Day 6: renewal reminder",
      description: "We email you before the trial turns into a paid plan.",
      tone: "muted",
    },
    {
      icon: CalendarDays,
      title: "Day 7: Pro renews",
      description: `After the trial, Pro continues at ${PRO_MONTHLY_PRICE} unless canceled.`,
      tone: "muted",
    },
  ] as const;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)]">
      <aside className="bg-muted/30 rounded-lg border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Order summary
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">
              $0 today
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              You are starting a free trial. Your card is only used to keep the
              subscription ready after the trial.
            </p>
          </div>
          <StripeWordmark />
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-4 border-b pb-3">
            <div>
              <p className="text-sm font-medium">Pro trial</p>
              <p className="text-muted-foreground text-xs">7 days</p>
            </div>
            <p className="text-sm font-semibold">$0</p>
          </div>
          <div className="flex items-center justify-between gap-4 border-b pb-3">
            <div>
              <p className="text-sm font-medium">50 trial credits</p>
              <p className="text-muted-foreground text-xs">Available now</p>
            </div>
            <p className="text-sm font-semibold">Included</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">After free trial</p>
              <p className="text-muted-foreground text-xs">Starts on day 7</p>
            </div>
            <p className="text-sm font-semibold">{PRO_MONTHLY_PRICE}</p>
          </div>
        </div>

        <div className="bg-background mt-6 rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <LockKeyhole className="text-primary mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                Secure checkout with Stripe
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Your payment details are handled by Stripe. You pay nothing
                today and can cancel before the trial ends.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <BigCtaButton onClick={onAccept} loading={isLoading}>
            <CreditCard className="size-5" />
            Start 7-day trial in Stripe
          </BigCtaButton>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onDecline}
            disabled={isLoading}
          >
            Continue without trial
          </Button>
        </div>
      </aside>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">You stay in control before renewal</p>
              <p className="text-muted-foreground mt-1 text-sm">
                We notify you before billing starts. Cancel anytime from billing
                settings if Pro is not right for you.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-background rounded-lg border p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Now
              </p>
              <p className="mt-1 text-lg font-semibold">Pay $0 now</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Start the trial today, use your credits, and decide before the
                first renewal.
              </p>
            </div>
            <Check className="text-primary mt-1 size-5 shrink-0" />
          </div>
        </div>

        <div className="rounded-lg border p-5">
          <p className="text-sm font-semibold">How your free trial works</p>
          <div className="mt-5 space-y-5">
            {trialMilestones.map((item, index) => {
              const Icon = item.icon;
              const isPrimary = item.tone === "primary";
              return (
                <div key={item.title} className="relative flex gap-4">
                  {index < trialMilestones.length - 1 ? (
                    <span
                      className={cn(
                        "absolute top-9 left-[17px] h-[calc(100%+0.25rem)] w-px",
                        isPrimary ? "bg-primary/50" : "bg-border",
                      )}
                      aria-hidden="true"
                    />
                  ) : null}
                  <div
                    className={cn(
                      "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border",
                      isPrimary
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="bg-background rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Bell className="text-primary mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Reminder included</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  The email reminder is scheduled from the Stripe trial end.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-semibold">Creator reviews</p>
            <div className="mt-3 grid gap-3">
              {testimonials.slice(0, 3).map((testimonial) => (
                <div
                  key={testimonial.author}
                  className="bg-background flex gap-3 rounded-lg border p-3"
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full border">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.author}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className="text-primary size-3.5 fill-current"
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-sm font-medium">
                      "{testimonial.quote}"
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {testimonial.author} - {testimonial.result}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StripeWordmark() {
  return (
    <svg
      aria-label="Stripe"
      className="h-7 w-[84px] shrink-0"
      role="img"
      viewBox="0 0 360 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M360 77.4001C360 51.8001 347.6 31.6001 323.9 31.6001C300.1 31.6001 285.7 51.8001 285.7 77.2001C285.7 107.3 302.7 122.5 327.1 122.5C339 122.5 348 119.8 354.8 116V96.0001C348 99.4001 340.2 101.5 330.3 101.5C320.6 101.5 312 98.1001 310.9 86.3001H359.8C359.8 85.0001 360 79.8001 360 77.4001ZM310.6 67.9001C310.6 56.6001 317.5 51.9001 323.8 51.9001C329.9 51.9001 336.4 56.6001 336.4 67.9001H310.6Z"
        fill="#533AFD"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M247.1 31.6001C237.3 31.6001 231 36.2001 227.5 39.4001L226.2 33.2001H204.2V149.8L229.2 144.5L229.3 116.2C232.9 118.8 238.2 122.5 247 122.5C264.9 122.5 281.2 108.1 281.2 76.4001C281.1 47.4001 264.6 31.6001 247.1 31.6001ZM241.1 100.5C235.2 100.5 231.7 98.4001 229.3 95.8001L229.2 58.7001C231.8 55.8001 235.4 53.8001 241.1 53.8001C250.2 53.8001 256.5 64.0001 256.5 77.1001C256.5 90.5001 250.3 100.5 241.1 100.5Z"
        fill="#533AFD"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M169.8 25.7L194.9 20.3V0L169.8 5.3V25.7Z"
        fill="#533AFD"
      />
      <path d="M194.9 33.3H169.8V120.8H194.9V33.3Z" fill="#533AFD" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M142.9 40.7L141.3 33.3H119.7V120.8H144.7V61.5C150.6 53.8 160.6 55.2 163.7 56.3V33.3C160.5 32.1 148.8 29.9 142.9 40.7Z"
        fill="#533AFD"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M92.8999 11.6001L68.4999 16.8001L68.3999 96.9001C68.3999 111.7 79.4999 122.6 94.2999 122.6C102.5 122.6 108.5 121.1 111.8 119.3V99.0001C108.6 100.3 92.7999 104.9 92.7999 90.1001V54.6001H111.8V33.3001H92.7999L92.8999 11.6001Z"
        fill="#533AFD"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M25.3 58.7001C25.3 54.8001 28.5 53.3001 33.8 53.3001C41.4 53.3001 51 55.6001 58.6 59.7001V36.2001C50.3 32.9001 42.1 31.6001 33.8 31.6001C13.5 31.6001 0 42.2001 0 59.9001C0 87.5001 38 83.1001 38 95.0001C38 99.6001 34 101.1 28.4 101.1C20.1 101.1 9.5 97.7001 1.1 93.1001V116.9C10.4 120.9 19.8 122.6 28.4 122.6C49.2 122.6 63.5 112.3 63.5 94.4001C63.4 64.6001 25.3 69.9001 25.3 58.7001Z"
        fill="#533AFD"
      />
    </svg>
  );
}

function PromptPicker({
  selectedPrompt,
  onSelect,
  onGenerate,
  onBack,
  isLoading,
}: {
  selectedPrompt: string | null;
  onSelect: (prompt: string) => void;
  onGenerate: (promptText: string) => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  const [customPrompt, setCustomPrompt] = useState("");
  const isCustom =
    selectedPrompt !== null &&
    !PRESET_PROMPTS.includes(selectedPrompt as (typeof PRESET_PROMPTS)[number]);

  const activePrompt = isCustom ? customPrompt : selectedPrompt;

  return (
    <div className="flex flex-col gap-3">
      {PRESET_PROMPTS.map((prompt) => {
        const isSelected = selectedPrompt === prompt;
        return (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              onSelect(prompt);
              setCustomPrompt("");
            }}
            className={cn(
              "relative cursor-pointer rounded-lg border-2 px-4 py-3 text-left text-sm transition-all duration-200",
              isSelected
                ? "border-primary bg-primary/10 font-medium"
                : "border-border hover:border-primary/40 hover:bg-accent/50",
            )}
          >
            {isSelected && (
              <Check className="text-primary absolute top-3 right-3 size-4" />
            )}
            <span className="pr-6">{prompt}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => {
          onSelect(customPrompt || " ");
          setCustomPrompt(customPrompt);
        }}
        className={cn(
          "relative cursor-pointer rounded-lg border-2 px-4 py-3 text-left text-sm transition-all duration-200",
          isCustom
            ? "border-primary bg-primary/10 font-medium"
            : "border-border hover:border-primary/40 hover:bg-accent/50",
        )}
      >
        {isCustom && (
          <Check className="text-primary absolute top-3 right-3 size-4" />
        )}
        <span className="text-muted-foreground">Write your own...</span>
      </button>

      {isCustom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <textarea
            value={customPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value);
              if (e.target.value.trim()) {
                onSelect(e.target.value);
              }
            }}
            autoFocus
            placeholder="Me laughing. The background is blue."
            rows={2}
            className="border-primary bg-background placeholder:text-muted-foreground w-full resize-none rounded-lg border-2 px-4 py-3 text-sm focus:outline-none"
          />
        </motion.div>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <BigCtaButton
          onClick={() =>
            activePrompt?.trim() && onGenerate(activePrompt.trim())
          }
          disabled={!activePrompt?.trim()}
          loading={isLoading}
        >
          <Sparkles className="size-5" />
          Generate My First Thumbnail
        </BigCtaButton>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit self-center"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
