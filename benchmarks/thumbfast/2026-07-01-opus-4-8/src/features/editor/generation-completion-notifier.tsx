import { Button } from "@/components/ui/button";
import Image from "@/compat/image";
import { usePathname, useRouter } from "@/compat/navigation";
import { useSession } from "@/lib/auth-client";
import { useMutation as useConvexMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

type GenerationNotification = {
  id: string;
  promptId: string | null;
  imageUrl: string | null;
  completedAt: number | null;
};

const recentGenerationNotificationsRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  GenerationNotification[]
>("editor:recentGenerationNotifications");

const markGenerationNotifiedRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; generationId: string },
  { ok: boolean }
>("editor:markGenerationNotified");

export function GenerationCompletionNotifier({ orgSlug }: { orgSlug: string }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const userId = session.data?.user.id;

  const notifications = useQuery(
    recentGenerationNotificationsRef,
    orgSlug && userId ? { orgSlug } : "skip",
  );
  const markNotified = useConvexMutation(markGenerationNotifiedRef);

  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notifications) return;

    for (const notification of notifications) {
      if (processedRef.current.has(notification.id)) continue;
      processedRef.current.add(notification.id);

      // The client is in the app, so the user is reachable: acknowledge the
      // completion to suppress the fallback email.
      void markNotified({ orgSlug, generationId: notification.id }).catch(
        () => undefined,
      );

      const generationPath = notification.promptId
        ? `/orgs/${orgSlug}/thumbnails/${notification.promptId}`
        : null;

      // The user is already watching this generation: no toast needed.
      if (generationPath && pathname === generationPath) continue;
      if (!notification.imageUrl) continue;

      const imageUrl = notification.imageUrl;
      toast.custom(
        (toastId) => (
          <GenerationCompletedToast
            imageUrl={imageUrl}
            onView={() => {
              if (generationPath) router.push(generationPath);
              toast.dismiss(toastId);
            }}
          />
        ),
        { duration: 10_000 },
      );
    }
  }, [notifications, orgSlug, markNotified, router, pathname]);

  return null;
}

function GenerationCompletedToast({
  imageUrl,
  onView,
}: {
  imageUrl: string;
  onView: () => void;
}) {
  return (
    <div className="bg-popover text-popover-foreground border-border flex w-full items-center gap-3 rounded-lg border p-3 shadow-lg">
      <Image
        src={imageUrl}
        alt="Generated thumbnail"
        width={56}
        height={56}
        className="size-14 shrink-0 rounded-md object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">Your thumbnail is ready</p>
      </div>
      <Button size="sm" onClick={onView} className="shrink-0">
        View
      </Button>
    </div>
  );
}
