import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralMe } from "@/features/referral/referral.query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Gift } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/orgs/$orgSlug/settings/referral")({
  component: OrgReferralSettingsRoute,
});

function OrgReferralSettingsRoute() {
  const { orgSlug } = Route.useParams();
  const { data, isLoading } = useReferralMe(orgSlug);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!data?.link) return;
    await navigator.clipboard.writeText(data.link);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="size-5" />
          Earn Free Thumbnails
        </CardTitle>
        <CardDescription>
          Share your referral link and earn 1 thumbnail for each successful
          referral
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
        ) : data ? (
          <>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={data.link}
                className="text-muted-foreground"
              />
              <Button type="button" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="mr-1 size-4" />
                ) : (
                  <Copy className="mr-1 size-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Total" value={data.stats.total} />
              <Stat label="Pending" value={data.stats.pending} />
              <Stat label="Earned" value={data.stats.credited} />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Could not load your referral link right now.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
