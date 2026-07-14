import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralMe } from "./referral.query";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ReferralModalContent({ orgSlug }: { orgSlug: string }) {
  const { data, isLoading } = useReferralMe(orgSlug);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!data?.link) return;
    await navigator.clipboard.writeText(data.link);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-muted-foreground text-sm">
        We couldn&apos;t load your referral link right now.
      </p>
    );
  }

  const shareText = `Join me on Thumbfa.st and earn free thumbnails.`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}&url=${encodeURIComponent(data.link)}`;
  const whatsAppHref = `https://wa.me/?text=${encodeURIComponent(
    `${shareText} ${data.link}`,
  )}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input readOnly value={data.link} className="text-muted-foreground" />
        <Button type="button" onClick={handleCopy}>
          {copied ? (
            <Check className="mr-2 size-4" />
          ) : (
            <Copy className="mr-2 size-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild type="button" variant="outline" className="w-full">
          <a href={twitterHref} target="_blank" rel="noopener noreferrer">
            Share on Twitter
          </a>
        </Button>
        <Button asChild type="button" variant="outline" className="w-full">
          <a href={whatsAppHref} target="_blank" rel="noopener noreferrer">
            Share on WhatsApp
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={data.stats.total} />
        <Stat label="Pending" value={data.stats.pending} />
        <Stat label="Credited" value={data.stats.credited} />
      </div>

      <p className="text-muted-foreground text-xs">
        Earn {data.settings.creditsPerReferral} free thumbnail
        {data.settings.creditsPerReferral > 1 ? "s" : ""} per successful
        referral.
      </p>
    </div>
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
