import Page, { metadata } from "@public-site/(tools)/ab-testing/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/ab-testing")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
