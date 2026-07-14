import Page, { metadata } from "@public-site/tools/anonymize/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/anonymize")({
  component: Page,
  head: () => metadataToHead(metadata),
});
