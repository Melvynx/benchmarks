import Page, { metadata } from "@public-site/(tools)/create-thumbnail/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/create-thumbnail")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
