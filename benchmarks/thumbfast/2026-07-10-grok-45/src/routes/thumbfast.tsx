import Page, { metadata } from "@public-site/(tools)/thumbfast/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/thumbfast")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
