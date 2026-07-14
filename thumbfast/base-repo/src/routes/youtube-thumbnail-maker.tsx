import Page, {
  metadata,
} from "@public-site/(tools)/youtube-thumbnail-maker/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/youtube-thumbnail-maker")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
