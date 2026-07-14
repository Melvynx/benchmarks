import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStoredReferralCode } from "@/features/referral/referral-cookie";
import { ClientSessionGuard } from "@/lib/auth/client-route-guard";
import { makeFunctionReference } from "convex/server";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation as useConvexMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

const createOrganizationRef = makeFunctionReference<
  "mutation",
  { name: string; referralCode?: string },
  { redirectTo: string }
>("app:createOrganizationForCurrentUser");

export const Route = createFileRoute("/orgs/new")({
  ssr: false,
  component: NewOrganizationRoute,
});

function NewOrganizationRoute() {
  return (
    <ClientSessionGuard>
      <NewOrganizationForm />
    </ClientSessionGuard>
  );
}

function NewOrganizationForm() {
  const createOrganization = useConvexMutation(createOrganizationRef);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create organization</CardTitle>
          <CardDescription>
            Set up a workspace for your thumbnails, credits, members, and billing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const name = String(formData.get("name") ?? "").trim();
              if (!name) {
                toast.error("Organization name is required");
                return;
              }

              setIsSubmitting(true);
              try {
                const result = await createOrganization({
                  name,
                  referralCode: getStoredReferralCode() ?? undefined,
                });
                window.location.replace(result.redirectTo);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not create organization",
                );
                setIsSubmitting(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Organization name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="organization"
                placeholder="Acme Studio"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
