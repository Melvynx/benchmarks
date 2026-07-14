import { Divider } from "@/components/nowts/divider";
import { Typography } from "@/components/nowts/typography";
import Link from "@/compat/link";
import { normalizeAuthCallbackUrl } from "@/lib/auth/auth-utils";
import { useSearchParams } from "@/compat/navigation";
import { cn } from "@/lib/utils";
import { ProviderButton } from "./provider-button";
import { SignInCredentialsAndEmailOTP } from "./sign-in-credentials-and-email-otp";

export const SignInProviders = ({
  providers,
  callbackUrl,
  formId,
  hideCredentialSubmit = false,
  variant = "default",
}: {
  providers: string[];
  callbackUrl?: string;
  formId?: string;
  hideCredentialSubmit?: boolean;
  variant?: "default" | "split";
}) => {
  const searchParams = useSearchParams();
  const callbackUrlParams = searchParams.get("callbackUrl");
  const isSplit = variant === "split";

  callbackUrl = normalizeAuthCallbackUrl(callbackUrl ?? callbackUrlParams);
  const encodedCallbackUrl = encodeURIComponent(callbackUrl);

  return (
    <div className={cn("flex flex-col gap-4", isSplit && "gap-5")}>
      <SignInCredentialsAndEmailOTP
        callbackUrl={callbackUrl}
        formId={formId}
        hideSubmit={hideCredentialSubmit}
        variant={variant}
      />
      {providers.length > 0 && (
        <Divider className={cn(isSplit && "gap-6")}>or</Divider>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-2",
          !isSplit && "lg:grid-cols-2 lg:gap-4",
        )}
      >
        {providers.includes("github") && (
          <ProviderButton providerId="github" callbackUrl={callbackUrl} />
        )}
        {providers.includes("google") && (
          <ProviderButton providerId="google" callbackUrl={callbackUrl} />
        )}
      </div>

      <Typography
        variant="muted"
        className={cn("text-xs", isSplit && "text-center")}
      >
        You don't have an account?{" "}
        <Typography
          variant="link"
          as={Link}
          href={`/auth/signup?callbackUrl=${encodedCallbackUrl}`}
        >
          Sign up
        </Typography>
      </Typography>
    </div>
  );
};
