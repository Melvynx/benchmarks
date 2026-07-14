# Convex Imports

Always use the `@convex/*` TypeScript path alias when importing from the `convex/` directory.

## Correct

```ts
import { api } from "@convex/_generated/api";
import { internal } from "@convex/_generated/api";
const { api } = await import("@convex/_generated/api");
```

## Wrong

```ts
import { api } from "../../../convex/_generated/api";
import { api } from "@/../convex/_generated/api";
const { api } = await import("../../convex/_generated/api");
```

This applies to all imports from the `convex/` directory, not just `_generated/api`.
