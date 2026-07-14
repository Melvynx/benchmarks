import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateApiKeySchema } from "@/features/api-keys/api-keys.schema";
import { Form, useForm } from "@/features/form/tanstack-form";
import {
  Layout,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { api } from "@convex/_generated/api";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { Copy, Key, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/orgs/$orgSlug/settings/developer")({
  component: DeveloperRoute,
});

type ApiKeyItem = {
  id: string;
  name: string;
  start: string | null;
  prefix: string | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

type DeveloperApi = {
  billing: {
    listApiKeys: FunctionReference<
      "query",
      "public",
      { orgSlug: string },
      { keys: ApiKeyItem[] }
    >;
    createApiKey: FunctionReference<
      "action",
      "public",
      { orgSlug: string; name: string },
      ApiKeyItem & { key: string }
    >;
    deleteApiKey: FunctionReference<
      "mutation",
      "public",
      { orgSlug: string; keyId: string },
      { success: boolean }
    >;
  };
};

const developerApi = api as unknown as DeveloperApi;

function DeveloperRoute() {
  const { orgSlug } = useParams({
    from: "/orgs/$orgSlug/settings/developer",
  });
  const result = useQuery(developerApi.billing.listApiKeys, { orgSlug });
  const createApiKey = useAction(developerApi.billing.createApiKey);
  const deleteApiKey = useMutation(developerApi.billing.deleteApiKey);
  const [keys, setKeys] = useState<ApiKeyItem[] | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const visibleKeys = keys ?? result?.keys ?? [];

  const form = useForm({
    schema: CreateApiKeySchema,
    defaultValues: { name: "" },
    onSubmit: async (values) => {
      const created = await createApiKey({ orgSlug, name: values.name });
      setNewKey(created.key);
      setKeys((previous) => [created, ...(previous ?? visibleKeys)]);
      form.reset();
    },
  });

  async function handleDelete(keyId: string) {
    try {
      await deleteApiKey({ orgSlug, keyId });
      setKeys((previous) =>
        (previous ?? visibleKeys).filter((key) => key.id !== keyId),
      );
      toast.success("API key deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete API key",
      );
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <Layout>
      <LayoutHeader>
        <LayoutTitle>Developer</LayoutTitle>
        <LayoutDescription>
          Manage API keys for REST API and MCP integrations.
        </LayoutDescription>
      </LayoutHeader>
      <LayoutContent className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Use API keys to authenticate REST API and MCP requests.
              </CardDescription>
            </div>
            <Dialog
              open={isCreateOpen}
              onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) {
                  setNewKey(null);
                  form.reset();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 size-4" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    {newKey
                      ? "Your API key has been created. Copy it now - you won't be able to see it again."
                      : "Give your API key a name to help you identify it later."}
                  </DialogDescription>
                </DialogHeader>
                {newKey ? (
                  <div className="flex flex-col gap-4">
                    <div className="bg-muted flex items-center gap-2 rounded-lg p-3 font-mono text-sm">
                      <Key className="text-muted-foreground size-4 shrink-0" />
                      <code className="flex-1 break-all">{newKey}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async () => copyToClipboard(newKey)}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                    <Button onClick={() => setIsCreateOpen(false)}>Done</Button>
                  </div>
                ) : (
                  <Form form={form}>
                    <form.AppField name="name">
                      {(field) => (
                        <field.Field>
                          <field.Label>Name</field.Label>
                          <field.Content>
                            <field.Input placeholder="My API Key" />
                            <field.Message />
                          </field.Content>
                        </field.Field>
                      )}
                    </form.AppField>
                    <form.SubmitButton className="mt-4 w-full">
                      Create Key
                    </form.SubmitButton>
                  </Form>
                )}
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {result === undefined ? (
              <div className="text-muted-foreground py-8 text-center">
                Loading API keys...
              </div>
            ) : visibleKeys.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                No API keys yet. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {getMaskedKey(key)}
                      </TableCell>
                      <TableCell>Never</TableCell>
                      <TableCell>
                        {new Date(key.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => handleDelete(key.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              How to use your API key with different integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h4 className="mb-2 font-medium">REST API</h4>
              <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-sm">
                {`curl -X POST https://thumbfa.st/api/v1/tools/generate_thumbnail \\
  -H "Authorization: Bearer tf_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "A YouTuber looking shocked"}'`}
              </pre>
            </div>
            <div>
              <h4 className="mb-2 font-medium">
                MCP (Claude Code / Claude Desktop)
              </h4>
              <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-sm">
                {`{
  "mcpServers": {
    "thumbfast": {
      "command": "pnpm",
      "args": [
        "dlx",
        "mcp-remote",
        "https://thumbfa.st/api/mcp/sse",
        "--header",
        "Authorization:\${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer tf_your_api_key"
      }
    }
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </LayoutContent>
    </Layout>
  );
}

function getMaskedKey(key: ApiKeyItem) {
  const prefix = key.prefix ?? "tf";
  const start = key.start ?? "";
  return start ? `${start}****` : `${prefix}_****`;
}
