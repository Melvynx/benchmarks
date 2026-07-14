import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/account/email")({
  component: AccountEmailRoute,
});

function AccountEmailRoute() {
  const getEmailSubscription = useAction(api.app.getEmailSubscription);
  const updateEmailSubscription = useAction(api.app.updateEmailSubscription);
  const [state, setState] = useState<{
    loading: boolean;
    subscribed: boolean;
    error: string | null;
  }>({
    loading: true,
    subscribed: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    void getEmailSubscription({})
      .then((result) => {
        if (!mounted) return;
        setState({
          loading: false,
          subscribed: result.subscribed,
          error: null,
        });
      })
      .catch((error) => {
        if (!mounted) return;
        setState((current) => ({
          ...current,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Email settings are unavailable",
        }));
      });

    return () => {
      mounted = false;
    };
  }, [getEmailSubscription]);

  if (state.loading) {
    return <EmailSettingsSkeleton />;
  }

  if (state.error) {
    return <EmailSettingsError message={state.error} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mail settings</CardTitle>
        <CardDescription>
          Update your email notifications settings to match your preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="data-[loading=true]:bg-muted flex flex-row items-start gap-3 rounded-lg border p-3 shadow-sm">
          <Checkbox
            id="subscribed-checkbox"
            checked={state.subscribed}
            disabled={state.loading}
            onCheckedChange={(checked) => {
              const subscribed = Boolean(checked);
              setState((current) => ({ ...current, subscribed }));
              void updateEmailSubscription({ subscribed })
                .then(() => {
                  toast.success("You've updated your email settings.");
                })
                .catch((error) => {
                  setState((current) => ({
                    ...current,
                    subscribed: !subscribed,
                  }));
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "An error occurred",
                  );
                });
            }}
          />
          <div className="flex flex-col gap-1 leading-none">
            <Label htmlFor="subscribed-checkbox">Product updates</Label>
            <p className="text-muted-foreground text-sm">
              Receive product announcements, tips, and promotional emails from
              ThumbFast.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailSettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mail settings</CardTitle>
        <CardDescription>
          Update your email notifications settings to match your preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

function EmailSettingsError(props: { message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mail settings unavailable</CardTitle>
        <CardDescription>{props.message}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Try again
        </Button>
      </CardFooter>
    </Card>
  );
}
