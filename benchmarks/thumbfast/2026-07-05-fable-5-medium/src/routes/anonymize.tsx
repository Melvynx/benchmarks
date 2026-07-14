import Page, { metadata } from "@public-site/(tools)/anonymize/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/anonymize")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
