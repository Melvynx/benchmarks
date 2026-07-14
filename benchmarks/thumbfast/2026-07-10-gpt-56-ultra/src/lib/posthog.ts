import type { PostHogEvent } from "../features/posthog/posthog-events";
import { PostHog } from "posthog-node";

const POSTHOG_API_KEY =
  process.env.VITE_POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;

let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  if (!POSTHOG_API_KEY) return null;

  if (!posthogClient) {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

export async function trackServerEvent(
  userId: string,
  event: PostHogEvent,
  properties?: Record<string, unknown>,
) {
  try {
    const client = getPostHogClient();
    if (!client) return;

    client.capture({
      distinctId: userId,
      event,
      properties,
    });

    await client.flush();
  } catch {
    // Silently ignore - analytics should never break the main flow
  }
}
