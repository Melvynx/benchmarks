import Page, { metadata } from "@public-site/tools/youtube-thumbnail/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/youtube-thumbnail")({
  component: Page,
  head: () => metadataToHead(metadata),
});
