import Page, { metadata } from "@public-site/(tools)/for-enterprise/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/for-enterprise")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
