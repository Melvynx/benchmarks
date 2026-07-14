import Page, { metadata } from "@public-site/(tools)/agents/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/agents")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
