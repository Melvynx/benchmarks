import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { useIsClient } from "@/hooks/use-is-client";
import { normalizeAuthCallbackUrl } from "@/lib/auth/auth-utils";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { UserDropdown } from "./user-dropdown";

type SignInButtonProps = VariantProps<typeof buttonVariants> & {
  callbackUrl?: string;
  children?: ReactNode;
  className?: string;
};

export const SignInButton = ({
  callbackUrl,
  children = "Sign in",
  className,
  ...props
}: SignInButtonProps) => {
  const isReady = useIsClient();
  const location = useLocation();
  const currentUrl = `${location.pathname}${location.searchStr}`;
  const resolvedCallbackUrl = normalizeAuthCallbackUrl(
    callbackUrl ?? currentUrl,
  );
  const classNames = cn(
    buttonVariants({ size: "sm", variant: "outline", ...props }),
    className,
  );

  return (
    <Link
      className={classNames}
      data-sign-in-route-mask="true"
      data-sign-in-ready={isReady ? "true" : undefined}
      mask={{ to: "/auth/signin", unmaskOnReload: true }}
      resetScroll={false}
      search={(previous: Record<string, unknown>) => ({
        ...previous,
        callbackUrl: resolvedCallbackUrl,
        modal: "signin",
      })}
      to="."
    >
      {children}
    </Link>
  );
};

export const LoggedInButton = ({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}) => {
  return (
    <UserDropdown>
      <button className="group size-9 rounded-full">
        <Avatar className="mr-2 size-full group-active:scale-95">
          <AvatarFallback className="bg-card">
            {user.email?.slice(0, 1).toUpperCase() ?? "U"}
          </AvatarFallback>
          {user.image && <AvatarImage src={user.image} />}
        </Avatar>
      </button>
    </UserDropdown>
  );
};
