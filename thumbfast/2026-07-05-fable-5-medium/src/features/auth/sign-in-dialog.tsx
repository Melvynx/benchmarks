import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BorderedDialogBody,
  BorderedDialogContent,
  BorderedDialogFooter,
  BorderedDialogHeader,
} from "@/components/bordered-dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Dialog,
  DialogDescription,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeAuthCallbackUrl } from "@/lib/auth/auth-utils";
import { useSession } from "@/lib/auth-client";
import { SiteConfig } from "@/site-config";
import { SignInProviders } from "@public-site/auth/signin/sign-in-providers";
import { useLocation, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const socialProviders = ["github", "google"];

type SignInSearch = {
  callbackUrl?: string;
  modal?: string;
};

export function SignInDialog() {
  const [isMounted, setIsMounted] = useState(false);
  const search = useSearch({ strict: false }) as SignInSearch;
  const isOpen = search.modal === "signin";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsMounted(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!isMounted || !isOpen) {
    return null;
  }

  return <MountedSignInDialog search={search} />;
}

function MountedSignInDialog({ search }: { search: SignInSearch }) {
  const location = useLocation();
  const router = useRouter();
  const isOpen = search.modal === "signin";
  const callbackUrl = normalizeAuthCallbackUrl(search.callbackUrl);
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user);

  const closeDialog = () => {
    if (location.maskedLocation) {
      router.history.back();
      return;
    }

    void router.navigate({
      to: ".",
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        callbackUrl: undefined,
        modal: undefined,
      }),
      replace: true,
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        }
      }}
    >
      <BorderedDialogContent maxWidth="sm:max-w-md lg:max-w-lg">
        <BorderedDialogHeader title="">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <Avatar className="size-8 rounded-md">
                <AvatarImage src={SiteConfig.appIcon} alt="app logo" />
                <AvatarFallback>
                  {SiteConfig.title.substring(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <DialogTitle className="text-lg">{SiteConfig.title}</DialogTitle>
            </div>
            <DialogDescription className="text-center">
              {isSignedIn
                ? "You are already signed in. Continue to your dashboard or stay on this page."
                : "Please sign in to your account to continue."}
            </DialogDescription>
          </div>
        </BorderedDialogHeader>
        {!isSignedIn && (
          <BorderedDialogBody>
            <SignInProviders
              callbackUrl={callbackUrl}
              providers={socialProviders}
            />
          </BorderedDialogBody>
        )}
        <BorderedDialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-auto gap-1.5 px-1.5 py-1 text-xs font-medium"
            >
              <Kbd className="size-5 text-[10px]">Esc</Kbd>
              <span>Cancel</span>
            </Button>
          </DialogClose>
          {isSignedIn && (
            <Button
              type="button"
              size="sm"
              autoFocus
              onClick={() => {
                void router.navigate({ to: "/orgs" });
              }}
            >
              Continue
            </Button>
          )}
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}
