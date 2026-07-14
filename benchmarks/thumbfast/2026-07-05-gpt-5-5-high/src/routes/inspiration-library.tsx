import Page, { metadata } from "@public-site/(tools)/inspiration-library/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/inspiration-library")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
