import { useIsClient } from "@/hooks/use-is-client";
import { useIsMac } from "@/hooks/use-is-mac";

export const CmdOrOption = () => {
  const isClient = useIsClient();
  const isMac = useIsMac();

  if (!isClient) return "⌘";

  return isMac ? "⌘" : "Ctrl";
};
