import Page, { metadata } from "@public-site/tools/youtube-video-card/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/youtube-video-card")({
  component: Page,
  head: () => metadataToHead(metadata),
});
