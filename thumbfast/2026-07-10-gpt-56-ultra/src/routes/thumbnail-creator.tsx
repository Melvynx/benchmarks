import Page, { metadata } from "@public-site/(tools)/thumbnail-creator/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/thumbnail-creator")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
