import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImageIcon, Key } from "lucide-react";
import Link from "@/compat/link";
import { useParams } from "@/compat/navigation";
import { useCredits } from "./credits.query";

type CreditBalanceProps = {
  showLabel?: boolean;
};

export function CreditBalance({ showLabel = true }: CreditBalanceProps) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { data, isLoading } = useCredits(orgSlug);

  if (isLoading) {
    return <Skeleton className="h-6 w-20" />;
  }

  if (data?.apiKeyMode === "required" || data?.plan === "poweruser") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/orgs/${orgSlug}/settings/api-keys`}
            className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
          >
            <Key className="text-primary size-4" />
            <span className="font-medium">API Keys</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground border">
          <p>Manage the API keys required by your Poweruser plan.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const balance = data?.balance ?? 0;
  const approximateThumbnails = Math.floor(balance);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/orgs/${orgSlug}/settings/billing`}
          className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
        >
          <ImageIcon className="text-primary size-4" />
          <span className="font-medium">~{approximateThumbnails}</span>
          {showLabel && (
            <span className="text-muted-foreground text-sm">thumbnails</span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent className="bg-popover text-popover-foreground border">
        <p>You have {Math.round(balance * 10) / 10} credits remaining.</p>
        <p className="text-muted-foreground text-xs">
          Credit cost depends on the selected model.
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Subscription credits reset each month (unused ones expire). Purchased
          & bonus credits never expire.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
