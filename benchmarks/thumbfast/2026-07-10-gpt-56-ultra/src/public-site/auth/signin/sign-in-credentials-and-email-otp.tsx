import { Typography } from "@/components/nowts/typography";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { SignInWithEmailOTP } from "./_components/sign-in-otp-form";
import { SignInPasswordForm } from "./_components/sign-in-password-form";

export const SignInCredentialsAndEmailOTP = (props: {
  callbackUrl?: string;
  formId?: string;
  hideSubmit?: boolean;
  variant?: "default" | "split";
}) => {
  const [isUsingCredentials, setIsUsingCredentials] = useLocalStorage(
    "sign-in-with-credentials",
    false,
  );
  const isSplit = props.variant === "split";

  if (!isUsingCredentials) {
    return (
      <div className={cn("max-w-lg space-y-4", isSplit && "max-w-none")}>
        <SignInWithEmailOTP
          callbackUrl={props.callbackUrl}
          formId={props.formId}
          hideSubmit={props.hideSubmit}
          variant={props.variant}
        />
        <Typography
          variant="muted"
          className={cn("text-xs", isSplit && "text-center")}
        >
          Prefer password sign in?{" "}
          <Typography
            variant="link"
            as="button"
            type="button"
            onClick={() => {
              setIsUsingCredentials(true);
            }}
          >
            Use password
          </Typography>
        </Typography>
      </div>
    );
  }

  return (
    <div className={cn("max-w-lg space-y-4", isSplit && "max-w-none")}>
      <SignInPasswordForm
        callbackUrl={props.callbackUrl}
        formId={props.formId}
        hideSubmit={props.hideSubmit}
        variant={props.variant}
      />
      <Typography
        variant="muted"
        className={cn("text-xs", isSplit && "text-center")}
      >
        Want faster sign in?{" "}
        <Typography
          variant="link"
          as="button"
          type="button"
          onClick={() => {
            setIsUsingCredentials(false);
          }}
        >
          Login with OTP code
        </Typography>
      </Typography>
    </div>
  );
};

const useLocalStorage = (key: string, defaultValue: boolean) => {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue;
    const storedValue = window.localStorage.getItem(key);
    return storedValue === null ? defaultValue : storedValue === "true";
  });

  const setStoredValue = (nextValue: boolean) => {
    window.localStorage.setItem(key, String(nextValue));
    setValue(nextValue);
  };

  return [value, setStoredValue] as const;
};
