import Page, { metadata } from "@public-site/(tools)/video-management/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/video-management")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
