# Unified Tools System for Thumbfa.st

## Concept

Créer un système de tools unifié qui peut être exposé via:

1. **MCP** (Model Context Protocol) - Pour les AI agents (Claude, etc.)
2. **REST API** (`/api/v1/tools/[toolName]`) - Pour les intégrations classiques

```
┌─────────────────────────────────────────────────────────┐
│                   TOOL DEFINITIONS                       │
│              (Single Source of Truth)                    │
│                                                         │
│   tools/definitions/generation.tools.ts                 │
│   tools/definitions/person.tools.ts                     │
│   tools/definitions/inspiration.tools.ts                │
│   ...                                                   │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│    MCP ADAPTER      │     │   REST API ADAPTER  │
│                     │     │                     │
│ @modelcontextprotocol│     │  zod-route.ts       │
│ /sdk (official)     │     │  safe-actions.ts    │
│                     │     │                     │
│ /api/mcp/[transport]│     │ /api/v1/tools/[tool]   │
└─────────────────────┘     └─────────────────────┘
```

---

## Architecture

### 1. Tool Definition Type

```typescript
// src/lib/tools/types.ts
import { z } from "zod";

export type ToolDefinition<
  TInput extends z.ZodType = z.ZodType,
  TOutput = unknown,
> = {
  name: string;
  description: string;
  category: "generation" | "person" | "inspiration" | "image" | "credits";

  // Zod schema for input validation
  inputSchema: TInput;

  // Handler function
  handler: (input: z.infer<TInput>, ctx: ToolContext) => Promise<TOutput>;

  // Optional metadata
  meta?: {
    creditCost?: number;
    rateLimit?: number; // requests per minute
    requiresAuth?: boolean;
  };
};

export type ToolContext = {
  org: Organization;
  user: User;
  limits: PlanLimits;
};

export type ToolResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
```

### 2. Tool Registry

```typescript
// src/lib/tools/registry.ts
import { ToolDefinition } from "./types";

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register<T extends ToolDefinition>(tool: T): T {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" already registered`);
    }
    this.tools.set(tool.name, tool);
    return tool;
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): ToolDefinition[] {
    return this.getAll().filter((t) => t.category === category);
  }
}

export const toolRegistry = new ToolRegistry();
```

### 3. File Structure

```
src/lib/tools/
├── types.ts                    # ToolDefinition type
├── registry.ts                 # Tool registry singleton
├── index.ts                    # Export all + register
│
├── definitions/                # Tool definitions (source of truth)
│   ├── generation.tools.ts     # 5 tools
│   ├── person.tools.ts         # 4 tools
│   ├── inspiration.tools.ts    # 4 tools
│   ├── image.tools.ts          # 3 tools
│   └── credits.tools.ts        # 2 tools
│
└── adapters/
    ├── mcp.adapter.ts          # → MCP SDK
    └── rest.adapter.ts         # → Zod Route / Safe Actions

app/api/
├── mcp/
│   └── [transport]/
│       └── route.ts            # MCP endpoint (official SDK)
│
└── v1/
    └── tools/
        ├── route.ts            # GET /api/v1/tools (discovery)
        └── [toolName]/
            └── route.ts        # REST API endpoint
```

---

## Tool Definitions

### Example: generate_thumbnail

```typescript
// src/lib/tools/definitions/generation.tools.ts
import { z } from "zod";
import { toolRegistry, ToolDefinition } from "../registry";
import { createPromptWithPendingGenerationAction } from "@/features/editor/editor.action";

export const generateThumbnail = toolRegistry.register({
  name: "generate_thumbnail",
  description:
    "Generate YouTube thumbnails from a text prompt. Optionally include reference persons, inspiration styles, and images.",
  category: "generation",

  inputSchema: z.object({
    prompt: z.string().max(2000).describe("Text description of the thumbnail"),
    count: z
      .number()
      .int()
      .min(1)
      .max(4)
      .default(1)
      .describe("Number of variations (1-4)"),
    personIds: z
      .array(z.string().uuid())
      .optional()
      .describe("IDs of reference persons"),
    inspirationIds: z
      .array(z.string().uuid())
      .optional()
      .describe("IDs of inspiration thumbnails"),
    imageIds: z
      .array(z.string().uuid())
      .optional()
      .describe("IDs of uploaded images"),
    model: z
      .enum(["gemini", "gpt-image"])
      .default("gemini")
      .describe("AI model to use"),
  }),

  meta: {
    creditCost: 1, // per thumbnail
    rateLimit: 10,
    requiresAuth: true,
  },

  handler: async (input, ctx) => {
    // Validate credits
    const totalCost = input.count * 1;
    const hasCredits = await hasEnoughCredits(ctx.org.id, totalCost);
    if (!hasCredits) {
      return {
        success: false,
        error: "Insufficient credits",
        code: "INSUFFICIENT_CREDITS",
      };
    }

    // Call existing action
    const result = await createPromptWithPendingGenerationAction({
      name: null,
      textPrompt: input.prompt,
      personIds: input.personIds ?? [],
      inspirationIds: input.inspirationIds ?? [],
      userImageIds: input.imageIds ?? [],
      count: input.count,
      model: input.model,
    });

    if (!result.data) {
      return {
        success: false,
        error: result.serverError ?? "Generation failed",
      };
    }

    return {
      success: true,
      data: {
        promptId: result.data.promptId,
        generationId: result.data.generationId,
        message: `Generating ${input.count} thumbnail(s). Use get_generation_status to check progress.`,
      },
    };
  },
});
```

---

## Adapter 1: MCP (Official SDK)

```typescript
// src/lib/tools/adapters/mcp.adapter.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toolRegistry, ToolDefinition, ToolContext } from "../registry";

export function registerToolsToMcp(server: McpServer, ctx: ToolContext) {
  const tools = toolRegistry.getAll();

  for (const tool of tools) {
    server.tool(tool.name, tool.inputSchema, async (input) => {
      const result = await tool.handler(input, ctx);

      if (!result.success) {
        return {
          content: [{ type: "text", text: `Error: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
      };
    });
  }
}

// Get tool list for MCP discovery
export function getToolListForMcp() {
  return toolRegistry.getAll().map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}
```

### MCP Route

```typescript
// app/api/mcp/[transport]/route.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getCurrentOrgFromApiKey } from "@/lib/organizations/get-current-org-api-limit";
import { registerToolsToMcp } from "@/lib/tools/adapters/mcp.adapter";
import { NextRequest, NextResponse } from "next/server";

// Store active transports for session management
const transports = new Map<string, StreamableHTTPServerTransport>();

export async function POST(
  request: NextRequest,
  { params }: { params: { transport: string } },
) {
  const { transport: transportType } = params;

  // Only handle /mcp (Streamable HTTP)
  if (transportType !== "mcp") {
    return NextResponse.json({ error: "Invalid transport" }, { status: 400 });
  }

  // Authenticate via API key
  const authResult = await getCurrentOrgFromApiKey(request);
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { org, user } = authResult;

  // Create context
  const ctx = {
    org,
    user,
    limits: org.limits,
  };

  // Handle session
  const sessionId = request.headers.get("mcp-session-id");
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.has(sessionId)) {
    transport = transports.get(sessionId)!;
  } else {
    // Create new session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    const server = new McpServer({
      name: "thumbfast",
      version: "1.0.0",
    });

    // Register all tools
    registerToolsToMcp(server, ctx);

    await server.connect(transport);

    // Store transport
    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }
  }

  // Handle request
  const body = await request.json();

  // Create a mock response object for the SDK
  const responseChunks: string[] = [];
  const mockRes = {
    write: (chunk: string) => responseChunks.push(chunk),
    end: () => {},
    setHeader: () => {},
  };

  await transport.handleRequest(
    { body, headers: Object.fromEntries(request.headers) },
    mockRes,
    body,
  );

  return new NextResponse(responseChunks.join(""), {
    headers: {
      "Content-Type": "application/json",
      "mcp-session-id": transport.sessionId ?? "",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { transport: string } },
) {
  // Handle SSE or session status
  const sessionId = request.headers.get("mcp-session-id");
  if (!sessionId || !transports.has(sessionId)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  // ... handle GET for SSE streaming
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { transport: string } },
) {
  // Clean up session
  const sessionId = request.headers.get("mcp-session-id");
  if (sessionId) {
    transports.delete(sessionId);
  }
  return NextResponse.json({ success: true });
}
```

---

## Adapter 2: REST API (zod-route)

```typescript
// src/lib/tools/adapters/rest.adapter.ts
import { toolRegistry, ToolDefinition, ToolContext } from "../registry";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrgFromApiKey } from "@/lib/organizations/get-current-org-api-limit";

export async function handleToolRequest(
  toolName: string,
  request: NextRequest,
): Promise<NextResponse> {
  // Get tool
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    return NextResponse.json(
      { success: false, error: `Tool "${toolName}" not found` },
      { status: 404 },
    );
  }

  // Authenticate
  const authResult = await getCurrentOrgFromApiKey(request);
  if (!authResult) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const ctx: ToolContext = {
    org: authResult.org,
    user: authResult.user,
    limits: authResult.org.limits,
  };

  // Parse and validate input
  let input: unknown;
  if (request.method === "POST") {
    input = await request.json();
  } else {
    // GET: parse from query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    input = searchParams;
  }

  const parseResult = tool.inputSchema.safeParse(input);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  // Execute handler
  try {
    const result = await tool.handler(parseResult.data, ctx);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Tool ${toolName} error:`, error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Get OpenAPI spec for a tool
export function getToolOpenApiSpec(tool: ToolDefinition) {
  return {
    summary: tool.description,
    tags: [tool.category],
    requestBody: {
      content: {
        "application/json": {
          schema: tool.inputSchema,
        },
      },
    },
    responses: {
      200: { description: "Success" },
      400: { description: "Validation error or tool error" },
      401: { description: "Unauthorized" },
    },
  };
}
```

### REST API Route

```typescript
// app/api/v1/tools/[toolName]/route.ts
import { handleToolRequest } from "@/lib/tools/adapters/rest.adapter";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { toolName: string } },
) {
  return handleToolRequest(params.toolName, request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { toolName: string } },
) {
  return handleToolRequest(params.toolName, request);
}
```

### Tool Discovery Endpoint

```typescript
// app/api/v1/tools/route.ts
import { toolRegistry } from "@/lib/tools";
import { NextResponse } from "next/server";

export async function GET() {
  const tools = toolRegistry.getAll().map((tool) => ({
    name: tool.name,
    description: tool.description,
    category: tool.category,
    endpoint: `/api/v1/tools/${tool.name}`,
    method: "POST",
    meta: tool.meta,
  }));

  return NextResponse.json({
    tools,
    totalCount: tools.length,
  });
}
```

---

## Complete Tool Definitions

### Generation Tools (5)

| Tool                 | Endpoint                              | Description                     |
| -------------------- | ------------------------------------- | ------------------------------- |
| `generate_thumbnail` | POST /api/v1/tools/generate_thumbnail | Generate thumbnails from prompt |
| `generate_variation` | POST /api/v1/tools/generate_variation | Create variations of existing   |
| `edit_thumbnail`     | POST /api/v1/tools/edit_thumbnail     | Edit existing thumbnail         |
| `list_generations`   | GET /api/v1/tools/list_generations    | List generated thumbnails       |
| `cancel_generation`  | POST /api/v1/tools/cancel_generation  | Cancel pending generation       |

### Person Tools (4)

| Tool            | Endpoint                         | Description             |
| --------------- | -------------------------------- | ----------------------- |
| `create_person` | POST /api/v1/tools/create_person | Create reference person |
| `list_persons`  | GET /api/v1/tools/list_persons   | List all persons        |
| `get_person`    | GET /api/v1/tools/get_person     | Get person details      |
| `delete_person` | POST /api/v1/tools/delete_person | Delete person           |

### Inspiration Tools (4)

| Tool                 | Endpoint                              | Description               |
| -------------------- | ------------------------------------- | ------------------------- |
| `create_inspiration` | POST /api/v1/tools/create_inspiration | Create from YouTube/image |
| `list_inspirations`  | GET /api/v1/tools/list_inspirations   | List inspirations         |
| `get_inspiration`    | GET /api/v1/tools/get_inspiration     | Get inspiration details   |
| `delete_inspiration` | POST /api/v1/tools/delete_inspiration | Delete inspiration        |

### Image Tools (3)

| Tool           | Endpoint                        | Description            |
| -------------- | ------------------------------- | ---------------------- |
| `upload_image` | POST /api/v1/tools/upload_image | Upload reference image |
| `list_images`  | GET /api/v1/tools/list_images   | List uploaded images   |
| `delete_image` | POST /api/v1/tools/delete_image | Delete image           |

### Credit Tools (2)

| Tool                 | Endpoint                             | Description         |
| -------------------- | ------------------------------------ | ------------------- |
| `get_credits`        | GET /api/v1/tools/get_credits        | Get balance & costs |
| `get_credit_history` | GET /api/v1/tools/get_credit_history | Transaction history |

---

## Usage Examples

### MCP (Claude Desktop)

```json
{
  "mcpServers": {
    "thumbfast": {
      "url": "https://thumbfa.st/api/mcp/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

### REST API (curl)

```bash
# List all tools
curl https://thumbfa.st/api/tools \
  -H "Authorization: Bearer YOUR_API_KEY"

# Generate thumbnail
curl -X POST https://thumbfa.st/api/v1/tools/generate_thumbnail \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A YouTuber looking shocked at a laptop",
    "count": 2,
    "model": "gemini"
  }'

# List persons
curl https://thumbfa.st/api/v1/tools/list_persons \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### REST API (TypeScript)

```typescript
import { upfetch } from "@/lib/up-fetch";

// Generate thumbnail
const result = await upfetch("/api/v1/tools/generate_thumbnail", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: {
    prompt: "A YouTuber looking shocked",
    count: 2,
  },
  schema: z.object({
    success: z.boolean(),
    data: z.object({
      promptId: z.string(),
      generationId: z.string(),
    }),
  }),
});
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Day 1)

1. **Create tool types** (`src/lib/tools/types.ts`)
2. **Create registry** (`src/lib/tools/registry.ts`)
3. **Create MCP adapter** (`src/lib/tools/adapters/mcp.adapter.ts`)
4. **Create REST adapter** (`src/lib/tools/adapters/rest.adapter.ts`)

### Phase 2: Tool Definitions (Day 1-2)

1. **Generation tools** (5) - Most important
2. **Person tools** (4)
3. **Inspiration tools** (4)
4. **Image tools** (3)
5. **Credit tools** (2)

### Phase 3: Routes (Day 2)

1. **MCP route** (`app/api/mcp/[transport]/route.ts`)
2. **REST route** (`app/api/v1/tools/[toolName]/route.ts`)
3. **Discovery route** (`app/api/v1/tools/route.ts`)

### Phase 4: API Key Management (Day 3)

1. Add Better Auth API key plugin
2. Create `/settings/api-keys` UI
3. Add usage tracking

### Phase 5: Documentation (Day 4)

1. **MCP Documentation** (`/docs/mcp`)
   - Integration methods (Direct HTTPS vs mcp-remote)
   - Client-specific setup (Claude Desktop, Claude Code, Cursor, Windsurf)
   - Available tools list
   - Example conversations
   - Troubleshooting guide

2. **REST API Documentation** (`/docs/api`)
   - Authentication guide
   - Tool discovery endpoint
   - All 18 tools with request/response examples
   - Error handling reference
   - Rate limits
   - Code examples (Node.js, Python, cURL)

---

## Benefits of This Architecture

| Benefit                    | Description                                      |
| -------------------------- | ------------------------------------------------ |
| **Single Source of Truth** | Tools defined once, used everywhere              |
| **Type Safety**            | Zod schemas enforce types across all adapters    |
| **Easy Testing**           | Test tool handlers directly, adapters separately |
| **Extensible**             | Add new adapters (WebSocket, GraphQL, etc.)      |
| **Consistent Auth**        | Same API key works for MCP and REST              |
| **Auto Documentation**     | Generate OpenAPI spec from tool definitions      |

---

## Security Checklist

- [ ] Input validation via Zod on all tools
- [ ] API key authentication on both adapters
- [ ] Rate limiting per tool (meta.rateLimit)
- [ ] Credit checks before expensive operations
- [ ] Org isolation (all queries scoped to ctx.org)
- [ ] Audit logging for tool calls
- [ ] No sensitive data in tool descriptions

---

## Files to Create

```
src/lib/tools/
├── types.ts                    # ToolDefinition, ToolContext, ToolResult
├── registry.ts                 # ToolRegistry class
├── index.ts                    # Export + register all tools
├── definitions/
│   ├── generation.tools.ts     # generate_thumbnail, etc.
│   ├── person.tools.ts
│   ├── inspiration.tools.ts
│   ├── image.tools.ts
│   └── credits.tools.ts
└── adapters/
    ├── mcp.adapter.ts          # registerToolsToMcp()
    └── rest.adapter.ts         # handleToolRequest()

app/api/
├── mcp/
│   └── [transport]/
│       └── route.ts            # MCP endpoint (POST/GET/DELETE)
└── v1/
    └── tools/
        ├── route.ts            # GET /api/v1/tools (discovery)
        └── [toolName]/
            └── route.ts        # POST/GET tool execution

app/(marketing)/docs/
├── page.tsx                    # Docs landing
├── mcp/page.tsx               # MCP integration guide
├── api/page.tsx               # REST API reference
└── layout.tsx                  # Docs layout with sidebar
```

---

## Documentation Pages

### Page 1: MCP Integration (`/docs/mcp`)

````markdown
# MCP Integration

Connect Thumbfa.st to AI assistants like Claude, Cursor, or any MCP-compatible client.

## Getting Your API Key

1. Go to **Settings → API Keys** in your dashboard
2. Click **Create API Key**
3. Copy your key (starts with `tf_`)

> ⚠️ Keep your API key secret. It provides full access to your account.

---

## Integration Methods

### Method 1: Direct HTTPS (Recommended)

For clients that support Streamable HTTP MCP (Claude Desktop 2025+, newer clients):

```json
{
  "mcpServers": {
    "thumbfast": {
      "url": "https://thumbfa.st/api/mcp/mcp",
      "headers": {
        "Authorization": "Bearer tf_your_api_key_here"
      }
    }
  }
}
```
````

### Method 2: Using mcp-remote (Legacy)

For clients that only support stdio transport (older Claude Desktop, some IDEs):

```json
{
  "mcpServers": {
    "thumbfast": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://thumbfa.st/api/mcp/sse",
        "--header",
        "Authorization: Bearer tf_your_api_key_here"
      ]
    }
  }
}
```

---

## Client-Specific Setup

### Claude Desktop

1. Open Claude Desktop settings
2. Go to **Developer → MCP Servers**
3. Add configuration:

```json
{
  "mcpServers": {
    "thumbfast": {
      "url": "https://thumbfa.st/api/mcp/mcp",
      "headers": {
        "Authorization": "Bearer tf_abc123..."
      }
    }
  }
}
```

4. Restart Claude Desktop

### Claude Code (CLI)

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "thumbfast": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://thumbfa.st/api/mcp/sse",
        "--header",
        "Authorization: Bearer tf_abc123..."
      ]
    }
  }
}
```

### Cursor

Add to Cursor MCP settings:

```json
{
  "mcpServers": {
    "thumbfast": {
      "url": "https://thumbfa.st/api/mcp/mcp",
      "headers": {
        "Authorization": "Bearer tf_abc123..."
      }
    }
  }
}
```

### Windsurf / Continue.dev

Use the mcp-remote method:

```json
{
  "mcpServers": {
    "thumbfast": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://thumbfa.st/api/mcp/sse",
        "--header",
        "Authorization: Bearer tf_abc123..."
      ]
    }
  }
}
```

---

## Available Tools

Once connected, you'll have access to these tools:

| Tool                 | Description                                  |
| -------------------- | -------------------------------------------- |
| `generate_thumbnail` | Generate thumbnails from a text prompt       |
| `generate_variation` | Create variations of existing thumbnails     |
| `edit_thumbnail`     | Edit an existing thumbnail with instructions |
| `list_generations`   | List your generated thumbnails               |
| `cancel_generation`  | Cancel pending generations                   |
| `create_person`      | Create a reference person                    |
| `list_persons`       | List your reference persons                  |
| `get_person`         | Get person details                           |
| `delete_person`      | Delete a person                              |
| `create_inspiration` | Save inspiration from YouTube/image          |
| `list_inspirations`  | List your inspirations                       |
| `get_inspiration`    | Get inspiration details                      |
| `delete_inspiration` | Delete an inspiration                        |
| `upload_image`       | Upload a reference image                     |
| `list_images`        | List your uploaded images                    |
| `delete_image`       | Delete an image                              |
| `get_credits`        | Check your credit balance                    |
| `get_credit_history` | View credit transaction history              |

---

## Example Conversation

```
You: Generate a thumbnail with me looking shocked, MrBeast style

Claude: I'll help you create that thumbnail. Let me first check your
available persons and inspirations...

[Calling list_persons...]
[Calling list_inspirations...]

Found your person "John" and a MrBeast-style inspiration.
Now generating the thumbnail...

[Calling generate_thumbnail with personIds and inspirationIds...]

✅ Started generating 1 thumbnail!
- Generation ID: gen_abc123
- Estimated time: ~10 seconds

The thumbnail will appear in your dashboard once ready.
```

---

## Troubleshooting

### "Unauthorized" error

- Check your API key is correct
- Ensure the key hasn't been revoked
- Verify the `Authorization: Bearer` prefix

### "Connection refused"

- Try the mcp-remote method instead of direct HTTPS
- Check your firewall settings

### Tools not appearing

- Restart your MCP client after configuration
- Check the MCP server logs for errors

````

---

### Page 2: REST API Documentation (`/docs/api`)

```markdown
# REST API

The Thumbfa.st API lets you integrate thumbnail generation into any application.

**Base URL:** `https://thumbfa.st/api/v1`

---

## Authentication

All requests require an API key in the `Authorization` header:

```bash
Authorization: Bearer tf_your_api_key_here
````

Get your API key from **Settings → API Keys** in your dashboard.

---

## Tool Discovery

### List All Tools

```http
GET /api/v1/tools
```

Returns all available tools with their schemas.

**Response:**

```json
{
  "tools": [
    {
      "name": "generate_thumbnail",
      "description": "Generate YouTube thumbnails from a text prompt",
      "category": "generation",
      "endpoint": "/api/v1/tools/generate_thumbnail",
      "method": "POST",
      "meta": {
        "creditCost": 1,
        "rateLimit": 10
      }
    }
    // ... more tools
  ],
  "totalCount": 18
}
```

---

## Generation Tools

### Generate Thumbnail

Create new thumbnails from a text prompt.

```http
POST /api/v1/tools/generate_thumbnail
```

**Request Body:**

```json
{
  "prompt": "A YouTuber looking shocked at their laptop screen",
  "count": 2,
  "personIds": ["person_abc123"],
  "inspirationIds": ["insp_xyz789"],
  "imageIds": [],
  "model": "gemini"
}
```

| Field            | Type     | Required | Description                                   |
| ---------------- | -------- | -------- | --------------------------------------------- |
| `prompt`         | string   | Yes      | Text description (max 2000 chars)             |
| `count`          | number   | No       | Number of variations 1-4 (default: 1)         |
| `personIds`      | string[] | No       | IDs of reference persons to include           |
| `inspirationIds` | string[] | No       | IDs of inspiration styles                     |
| `imageIds`       | string[] | No       | IDs of uploaded reference images              |
| `model`          | string   | No       | `"gemini"` or `"gpt-image"` (default: gemini) |

**Response:**

```json
{
  "success": true,
  "data": {
    "promptId": "prompt_abc123",
    "generationId": "gen_xyz789",
    "message": "Generating 2 thumbnail(s). Use get_generation_status to check progress."
  }
}
```

**Cost:** 1 credit per thumbnail

---

### Generate Variation

Create variations of an existing prompt.

```http
POST /api/v1/tools/generate_variation
```

**Request Body:**

```json
{
  "promptId": "prompt_abc123",
  "count": 2,
  "newPrompt": "Make it more dramatic",
  "model": "gemini"
}
```

---

### Edit Thumbnail

Modify an existing generated thumbnail.

```http
POST /api/v1/tools/edit_thumbnail
```

**Request Body:**

```json
{
  "thumbnailId": "thumb_abc123",
  "editPrompt": "Add more contrast and make the text bigger",
  "model": "gemini"
}
```

---

### List Generations

Get your generated thumbnails.

```http
GET /api/v1/tools/list_generations?limit=20&cursor=xxx
```

| Param    | Type   | Description                     |
| -------- | ------ | ------------------------------- |
| `limit`  | number | Max results (1-50, default: 20) |
| `cursor` | string | Pagination cursor               |
| `search` | string | Search in prompt text           |

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "prompt_abc123",
        "name": "Shocked YouTuber",
        "textPrompt": "A YouTuber looking shocked...",
        "generations": [...],
        "createdAt": "2025-01-29T10:00:00Z"
      }
    ],
    "nextCursor": "cursor_xyz"
  }
}
```

---

### Cancel Generation

Cancel pending generations and get credits refunded.

```http
POST /api/v1/tools/cancel_generation
```

**Request Body:**

```json
{
  "generationId": "gen_abc123"
}
```

---

## Person Tools

### Create Person

```http
POST /api/v1/tools/create_person
```

**Request Body:**

```json
{
  "name": "John Doe",
  "description": "Male, 30s, short brown hair, friendly smile",
  "imageUrls": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ]
}
```

**Note:** If `description` is omitted, AI will auto-generate it from the images.

---

### List Persons

```http
GET /api/v1/tools/list_persons
```

---

### Get Person

```http
GET /api/v1/tools/get_person?personId=person_abc123
```

---

### Delete Person

```http
POST /api/v1/tools/delete_person
```

**Request Body:**

```json
{
  "personId": "person_abc123"
}
```

---

## Inspiration Tools

### Create Inspiration

```http
POST /api/v1/tools/create_inspiration
```

**From YouTube:**

```json
{
  "source": {
    "type": "youtube",
    "youtubeUrl": "https://youtube.com/watch?v=abc123"
  }
}
```

**From Images:**

```json
{
  "source": {
    "type": "image",
    "imageUrls": ["https://example.com/thumbnail.jpg"]
  }
}
```

**Cost:** 0.1 credits (AI analyzes and describes the style)

---

### List Inspirations

```http
GET /api/v1/tools/list_inspirations?filter=mine&category=Gaming&limit=20
```

| Param      | Type   | Description            |
| ---------- | ------ | ---------------------- |
| `filter`   | string | `"mine"` or `"public"` |
| `category` | string | Filter by category     |
| `search`   | string | Search in descriptions |
| `limit`    | number | Max results (1-50)     |
| `cursor`   | string | Pagination cursor      |

---

### Get Inspiration

```http
GET /api/v1/tools/get_inspiration?inspirationId=insp_abc123
```

---

### Delete Inspiration

```http
POST /api/v1/tools/delete_inspiration
```

---

## Image Tools

### Upload Image

```http
POST /api/v1/tools/upload_image
```

**Request Body:**

```json
{
  "imageUrl": "https://example.com/reference.jpg",
  "name": "Product shot"
}
```

**Cost:** 0.05 credits (AI analyzes and describes the image)

---

### List Images

```http
GET /api/v1/tools/list_images
```

---

### Delete Image

```http
POST /api/v1/tools/delete_image
```

---

## Credit Tools

### Get Credits

```http
GET /api/v1/tools/get_credits
```

**Response:**

```json
{
  "success": true,
  "data": {
    "balance": 47.5,
    "costs": {
      "generation": 1,
      "enhance": 0.1,
      "inspiration": 0.1,
      "imageDescription": 0.05
    }
  }
}
```

---

### Get Credit History

```http
GET /api/v1/tools/get_credit_history?limit=20
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_abc123",
        "type": "generation",
        "amount": -2,
        "metadata": { "promptId": "prompt_xyz" },
        "createdAt": "2025-01-29T10:00:00Z"
      },
      {
        "id": "tx_def456",
        "type": "refund",
        "amount": 1,
        "metadata": { "reason": "generation_failed" },
        "createdAt": "2025-01-29T09:55:00Z"
      }
    ]
  }
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common Error Codes

| Code                   | HTTP Status | Description                     |
| ---------------------- | ----------- | ------------------------------- |
| `UNAUTHORIZED`         | 401         | Invalid or missing API key      |
| `FORBIDDEN`            | 403         | No permission for this resource |
| `NOT_FOUND`            | 404         | Resource not found              |
| `VALIDATION_ERROR`     | 400         | Invalid request body            |
| `INSUFFICIENT_CREDITS` | 400         | Not enough credits              |
| `RATE_LIMITED`         | 429         | Too many requests               |
| `INTERNAL_ERROR`       | 500         | Server error                    |

---

## Rate Limits

| Plan       | Requests/minute |
| ---------- | --------------- |
| Free       | 10              |
| Pro        | 60              |
| Enterprise | 300             |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1706526000
```

---

## Code Examples

### Node.js / TypeScript

```typescript
const response = await fetch(
  "https://thumbfa.st/api/v1/tools/generate_thumbnail",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer tf_your_api_key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: "A YouTuber looking shocked",
      count: 2,
      model: "gemini",
    }),
  },
);

const result = await response.json();
console.log(result.data.generationId);
```

### Python

```python
import requests

response = requests.post(
    "https://thumbfa.st/api/v1/tools/generate_thumbnail",
    headers={
        "Authorization": "Bearer tf_your_api_key",
        "Content-Type": "application/json",
    },
    json={
        "prompt": "A YouTuber looking shocked",
        "count": 2,
        "model": "gemini",
    },
)

result = response.json()
print(result["data"]["generationId"])
```

### cURL

```bash
curl -X POST https://thumbfa.st/api/v1/tools/generate_thumbnail \
  -H "Authorization: Bearer tf_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A YouTuber looking shocked",
    "count": 2,
    "model": "gemini"
  }'
```

```

---

### Documentation Files Structure

```

app/(marketing)/docs/
├── page.tsx # Docs landing page
├── mcp/
│ └── page.tsx # MCP integration guide
├── api/
│ └── page.tsx # REST API reference
└── layout.tsx # Docs layout with sidebar

src/features/docs/
├── docs-sidebar.tsx # Navigation sidebar
├── docs-content.tsx # MDX rendering
└── code-block.tsx # Syntax highlighted code

```

---

## Summary

- **18 tools** définis une seule fois
- **2 adapters**: MCP (SDK officiel) + REST API (`/api/v1/tools`)
- **Single auth**: Better Auth API keys pour les deux
- **Type-safe**: Zod schemas partagés
- **Extensible**: Ajouter d'autres adapters facilement
- **Documentation complète**: MCP setup + REST API reference
```
