import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Typography } from "@/components/nowts/typography";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/features/form/submit-button";
import { authClient } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Building2, UserX2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/account/danger")({
  component: AccountDangerRoute,
});

function AccountDangerRoute() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const canDelete = confirmation === "Delete" && password.length > 0;

  async function deleteAccount() {
    if (!canDelete) return;

    setLoading(true);
    try {
      const result = await authClient.deleteUser({
        password,
        callbackURL: "/auth/goodbye",
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Account deletion failed");
      }

      setOpen(false);
      toast.success("Your deletion has been asked.", {
        description: "Please check your email for further instructions.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Account deletion failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="bg-muted flex size-9 items-center justify-center rounded-md">
              <UserX2 className="text-muted-foreground size-4" />
            </div>
            <div className="space-y-0.5">
              <Typography variant="small">Personal Data</Typography>
              <Typography variant="muted" className="text-sm">
                All your personal information and settings will be permanently
                erased.
              </Typography>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="bg-muted flex size-9 items-center justify-center rounded-md">
              <Building2 className="text-muted-foreground size-4" />
            </div>
            <div className="space-y-0.5">
              <Typography variant="small">Organization Data</Typography>
              <Typography variant="muted" className="text-sm">
                If you&apos;re an organization owner, all organization data will
                be deleted and subscriptions cancelled.
              </Typography>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-4">
          <LoadingButton
            variant="destructive"
            size="sm"
            loading={loading}
            onClick={() => setOpen(true)}
          >
            Delete account
          </LoadingButton>
        </CardFooter>
      </Card>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent aria-label="Delete your account ?">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account ?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="inline-flex items-start gap-2">
                <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
                <span>
                  Are you sure you want to delete your profile? This requires
                  your password and email confirmation from Better Auth.
                </span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Type Delete to confirm this action.
              </Label>
              <Input
                id="delete-confirmation"
                aria-label="Confirm deletion"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-password">Password</Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              loading={loading}
              disabled={!canDelete}
              onClick={deleteAccount}
            >
              Delete
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
