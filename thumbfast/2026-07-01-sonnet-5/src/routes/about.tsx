import Page, { metadata } from "@public-site/(layout)/about/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withBaseLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/about")({
  component: withBaseLayout(Page),
  head: () => metadataToHead(metadata),
});
