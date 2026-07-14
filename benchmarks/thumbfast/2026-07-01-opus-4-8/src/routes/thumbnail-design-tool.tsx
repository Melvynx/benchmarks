import Page, {
  metadata,
} from "@public-site/(tools)/thumbnail-design-tool/page";
import { metadataToHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { withToolsLayout } from "./-layout-wrappers";

export const Route = createFileRoute("/thumbnail-design-tool")({
  component: withToolsLayout(Page),
  head: () => metadataToHead(metadata),
});
