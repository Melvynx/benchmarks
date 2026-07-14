import Page, { metadata } from "@public-site/(layout)/legal/privacy/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withBaseLayout } from "../-layout-wrappers";

export const Route = createFileRoute("/legal/privacy")({
  component: withBaseLayout(Page),
  head: () => metadataToHead(metadata),
});
