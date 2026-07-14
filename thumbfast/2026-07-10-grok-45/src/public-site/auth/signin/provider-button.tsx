import { Logo } from "@/components/nowts/logo";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/features/form/submit-button";
import { authClient } from "@/lib/auth-client";
import { getCallbackUrl } from "@/lib/auth/auth-utils";
import { useMutation } from "@/hooks/use-async-mutation";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";

const ProviderData: Record<string, { icon: ReactNode; name: string }> = {
  github: {
    icon: <Logo name="github" size={16} />,
    name: "Github",
  },
  google: {
    icon: <Logo name="google" size={16} />,
    name: "Google",
  },
};

const LAST_LOGIN_METHOD_COOKIE = "better-auth.last_used_login_method";

function subscribeToLastUsedLoginMethod() {
  return () => undefined;
}

function getLastUsedLoginMethod() {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LAST_LOGIN_METHOD_COOKIE}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : null;
}

type ProviderButtonProps = {
  providerId: "github" | "google";
  callbackUrl?: string;
};

export const ProviderButton = (props: ProviderButtonProps) => {
  const lastUsedProvider = useSyncExternalStore(
    subscribeToLastUsedLoginMethod,
    getLastUsedLoginMethod,
    () => null,
  );

  const githubSignInMutation = useMutation({
    mutationFn: async () => {
      await authClient.signIn.social({
        provider: props.providerId,
        callbackURL: getCallbackUrl(props.callbackUrl ?? "/orgs"),
      });
    },
  });

  const data = ProviderData[props.providerId];

  const isLastUsed = lastUsedProvider === props.providerId;

  return (
    <div className="relative w-full">
      {isLastUsed && (
        <Badge
          variant="secondary"
          className="absolute -top-2.5 -right-2.5 z-10"
        >
          Last used
        </Badge>
      )}
      <LoadingButton
        loading={githubSignInMutation.isPending}
        className="h-11 w-full border border-neutral-800 bg-black text-white shadow-none hover:border-neutral-700 hover:bg-neutral-950 hover:text-white"
        size="lg"
        onClick={() => {
          githubSignInMutation.mutate();
        }}
      >
        <span className="[&_svg]:text-white [&_svg]:[filter:brightness(0)_invert(1)]">
          {data.icon}
        </span>
        <span className="ml-2 text-white">Sign in with {data.name}</span>
      </LoadingButton>
    </div>
  );
};
