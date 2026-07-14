import { createActionTools } from "./action-tools";
import { createDataTools } from "./data-tools";
import { createGenerationTools } from "./generation-tools";
import type { ToolContext } from "./types";

export type { ToolContext } from "./types";

export function createAgentTools(ctx: ToolContext) {
  return {
    ...createDataTools(ctx),
    ...createGenerationTools(ctx),
    ...createActionTools(ctx),
  };
}
