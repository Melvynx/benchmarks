import Page, { metadata } from "@public-site/(tools)/generate-thumbnail/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/generate-thumbnail")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
