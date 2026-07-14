import Page, { metadata } from "@public-site/tools/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/")({
  component: Page,
  head: () => metadataToHead(metadata),
});
