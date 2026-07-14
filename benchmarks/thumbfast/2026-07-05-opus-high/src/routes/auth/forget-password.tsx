import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forget-password")({
  component: ForgetPasswordRoute,
});

function ForgetPasswordRoute() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "password">("email");

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const result = await authClient.forgetPassword.emailOtp({
                  email,
                });
                if (result.error) {
                  throw new Error(
                    result.error.message ?? "Unable to send reset code",
                  );
                }
                setStep("otp");
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button type="submit">Send reset code</Button>
            </form>
          ) : null}

          {step === "otp" ? (
            <div className="space-y-4">
              <p>One-time password has been sent to your email.</p>
              <Input
                data-slot="input-otp"
                value={otp}
                onChange={(event) => {
                  const value = event.target.value;
                  setOtp(value);
                  if (value.length >= 6) {
                    setStep("password");
                  }
                }}
              />
            </div>
          ) : null}

          {step === "password" ? (
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const nextPassword = String(formData.get("newPassword") ?? "");
                const result = await authClient.emailOtp.resetPassword({
                  email,
                  otp,
                  password: nextPassword,
                });
                if (result.error) {
                  throw new Error(
                    result.error.message ?? "Unable to reset password",
                  );
                }
                toast.success("Password reset");
                window.location.href = "/auth/signin";
              }}
            >
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="otp" value={otp} />
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <Button type="submit">Reset password</Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
