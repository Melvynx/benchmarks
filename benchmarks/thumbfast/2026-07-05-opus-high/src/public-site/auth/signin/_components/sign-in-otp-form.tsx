import { Typography } from "@/components/nowts/typography";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { LoadingButton } from "@/features/form/submit-button";
import { Form, useForm } from "@/features/form/tanstack-form";
import { authClient } from "@/lib/auth-client";
import { getCallbackUrl } from "@/lib/auth/auth-utils";
import { unwrapSafePromise } from "@/lib/promises";
import { cn } from "@/lib/utils";
import { useMutation } from "@/hooks/use-async-mutation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const LoginWithEmailOTPScheme = z.object({
  email: z.string().email(),
});

type LoginWithEmailOTPType = z.infer<typeof LoginWithEmailOTPScheme>;

export const SignInWithEmailOTP = (props: {
  callbackUrl?: string;
  email?: string;
  formId?: string;
  hideSubmit?: boolean;
  variant?: "default" | "split";
}) => {
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [ref, bounds] = useMeasure<HTMLDivElement>();
  const [direction, setDirection] = useState(1);

  const signInMutation = useMutation({
    mutationFn: async (values: LoginWithEmailOTPType) => {
      return unwrapSafePromise(
        authClient.emailOtp.sendVerificationOtp({
          email: values.email,
          type: "sign-in",
        }),
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_, values) => {
      setOtpEmail(values.email);
      setDirection(1);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (otp: string) => {
      if (!otpEmail) {
        throw new Error("Email is required");
      }

      return unwrapSafePromise(
        authClient.signIn.emailOtp({
          email: otpEmail,
          otp: otp,
        }),
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Signed in successfully");
      const cb = getCallbackUrl(props.callbackUrl ?? "/orgs");
      window.location.href = cb;
    },
  });

  return (
    <motion.div animate={{ height: bounds.height }}>
      <div ref={ref}>
        <AnimatePresence mode="wait" custom={direction}>
          {otpEmail ? (
            <motion.div
              key="otp-verification-form"
              variants={variants}
              initial="initial"
              animate="active"
              exit="exit"
              transition={{ duration: 0.15 }}
              custom={direction}
            >
              <OtpVerificationForm
                email={otpEmail}
                onVerify={verifyOtpMutation.mutate}
                onResend={() => signInMutation.mutate({ email: otpEmail })}
                isResendPending={signInMutation.isPending}
                isVerifyPending={verifyOtpMutation.isPending}
                variant={props.variant}
                onBack={() => {
                  setDirection(-1);
                  setOtpEmail(null);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="otp-email-form"
              variants={variants}
              animate="active"
              exit="exit"
              transition={{ duration: 0.15 }}
              custom={direction}
            >
              <OtpEmailForm
                onSubmit={(email) => signInMutation.mutate({ email })}
                defaultEmail={props.email ?? ""}
                isPending={signInMutation.isPending}
                formId={props.formId}
                hideSubmit={props.hideSubmit}
                variant={props.variant}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const useMeasure = <TElement extends HTMLElement>() => {
  const ref = useRef<TElement | null>(null);
  const [bounds, setBounds] = useState({ height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const updateBounds = () => {
      setBounds({ height: element.getBoundingClientRect().height });
    };

    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, bounds] as const;
};

const variants = {
  initial: (direction: number) => {
    return { x: `${20 * direction}px`, opacity: 0 };
  },
  active: { x: "0%", opacity: 1 },
  exit: (direction: number) => {
    return { x: `${-20 * direction}px`, opacity: 0 };
  },
};

const OtpEmailForm = (props: {
  onSubmit: (email: string) => void;
  defaultEmail?: string;
  isPending: boolean;
  formId?: string;
  hideSubmit?: boolean;
  variant?: "default" | "split";
}) => {
  const isSplit = props.variant === "split";
  const form = useForm({
    schema: LoginWithEmailOTPScheme,
    defaultValues: {
      email: props.defaultEmail ?? "",
    },
    onSubmit: async (values: LoginWithEmailOTPType) => {
      props.onSubmit(values.email);
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
                data-testid="otp-email-input"
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

      {props.hideSubmit ? null : (
        <LoadingButton
          loading={props.isPending}
          type="submit"
          className={cn(
            "ring-offset-card w-full ring-offset-2",
            isSplit && "h-11",
          )}
        >
          Send code
        </LoadingButton>
      )}
    </Form>
  );
};

const OtpVerificationForm = (props: {
  onVerify: (otp: string) => void;
  onResend: () => void;
  isResendPending: boolean;
  isVerifyPending: boolean;
  email: string;
  onBack: () => void;
  variant?: "default" | "split";
}) => {
  const [value, setValue] = useState("");
  const isSplit = props.variant === "split";

  const setOtpValue = (otp: string) => {
    setValue(otp);
    if (otp.length === 6) {
      props.onVerify(otp);
    }
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-4",
        isSplit && "items-center text-center",
      )}
    >
      <Typography variant="muted" className={cn(isSplit && "leading-6")}>
        A one-time password has been sent to{" "}
        <span className="font-bold">{props.email}</span>{" "}
        <Typography
          variant="link"
          as="button"
          onClick={props.onBack}
          className={cn("underline")}
        >
          Edit email
        </Typography>
      </Typography>
      <div
        className={cn(
          "flex items-center gap-2",
          isSplit && "flex-col justify-center sm:flex-row",
        )}
      >
        <InputOTP
          maxLength={6}
          value={value}
          onChange={setOtpValue}
          className={cn(
            {
              "animate-pulse": props.isVerifyPending,
            },
            isSplit && "justify-center",
          )}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} className={cn(isSplit && "size-10")} />
            <InputOTPSlot index={1} className={cn(isSplit && "size-10")} />
            <InputOTPSlot index={2} className={cn(isSplit && "size-10")} />
            <InputOTPSlot index={3} className={cn(isSplit && "size-10")} />
            <InputOTPSlot index={4} className={cn(isSplit && "size-10")} />
            <InputOTPSlot index={5} className={cn(isSplit && "size-10")} />
          </InputOTPGroup>
        </InputOTP>
        <ResendOtpButton
          isPending={props.isResendPending}
          onResend={props.onResend}
        />
      </div>
    </div>
  );
};

const ResendOtpButton = (props: {
  isPending: boolean;
  onResend: () => void;
}) => {
  const [countdown, setCountdown] = useState(0);

  const handleResend = () => {
    setCountdown(60);
    props.onResend();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <Typography
      variant="link"
      as="button"
      onClick={handleResend}
      disabled={props.isPending || countdown > 0}
      className={cn(
        "underline",
        {
          "animate-pulse": props.isPending,
        },
        "disabled:opacity-50",
      )}
    >
      Resend {countdown > 0 ? `(${countdown})` : ""}
    </Typography>
  );
};
