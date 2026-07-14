import Page, { metadata } from "@public-site/(tools)/face-consistency/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/face-consistency")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
