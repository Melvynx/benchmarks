import Page, {
  metadata,
} from "@public-site/(tools)/youtube-thumbnail-generator/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/youtube-thumbnail-generator")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
