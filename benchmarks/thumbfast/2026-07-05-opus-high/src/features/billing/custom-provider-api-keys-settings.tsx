import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, useForm } from "@/features/form/tanstack-form";
import { useSession } from "@/lib/auth-client";
import {
  Layout,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { Typography } from "@/components/nowts/typography";
import { getApiKeyMode } from "@/lib/validation/plan-validation";
import { api } from "@convex/_generated/api";
import type { FunctionReference } from "convex/server";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  Key,
  Loader2,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";
import { z } from "zod";

type Provider = "openai" | "gemini" | "apiyi";

type UsageStats = {
  openai: { total: number; thisMonth: number };
  gemini: { total: number; thisMonth: number };
  apiyi: { total: number; thisMonth: number };
};

type ChartDataPoint = {
  date: string;
  openai: number;
  gemini: number;
  apiyi: number;
};

type ProviderKey = {
  id: string;
  provider: Provider;
  label: string;
  maskedKey: string | null;
  updatedAt: string;
};

type BillingSummary = {
  plan: string;
  providerKeys: ProviderKey[];
  customApiKeyUsage: {
    totals: UsageStats;
    chartData: ChartDataPoint[];
  };
};

type ProviderKeysApi = {
  billing: {
    getBillingSummary: FunctionReference<
      "query",
      "public",
      { orgSlug: string },
      BillingSummary
    >;
    deleteCustomProviderApiKey: FunctionReference<
      "mutation",
      "public",
      { orgSlug: string; provider: Provider },
      { success: boolean }
    >;
  };
  billingNode: {
    upsertCustomProviderApiKey: FunctionReference<
      "action",
      "public",
      {
        orgSlug: string;
        provider: Provider;
        apiKey: string;
        label?: string;
      },
      { success: boolean }
    >;
  };
};

const providerKeysApi = api as unknown as ProviderKeysApi;
const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  apiyi: "APIYI",
};

const chartConfig = {
  openai: {
    label: "OpenAI",
    color: "var(--chart-1)",
  },
  gemini: {
    label: "Gemini",
    color: "var(--chart-2)",
  },
  apiyi: {
    label: "APIYI",
    color: "var(--chart-3)",
  },
};

const ProviderKeySchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

export function CustomProviderApiKeysSettings({
  orgSlug,
}: {
  orgSlug: string;
}) {
  const session = useSession();
  const summary = useQuery(providerKeysApi.billing.getBillingSummary, {
    orgSlug,
  });

  if (!summary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const apiKeyMode = getApiKeyMode(summary.plan);
  const openaiKey = summary.providerKeys.find(
    (key) => key.provider === "openai",
  );
  const geminiKey = summary.providerKeys.find(
    (key) => key.provider === "gemini",
  );
  const apiyiKey = summary.providerKeys.find((key) => key.provider === "apiyi");
  const isProductAdmin = session.data?.user.role === "admin";

  if (apiKeyMode === "disabled") {
    return (
      <Layout size="lg">
        <LayoutHeader>
          <LayoutTitle>API Keys</LayoutTitle>
          <LayoutDescription>
            Manage your custom API keys for AI generation.
          </LayoutDescription>
        </LayoutHeader>
        <LayoutContent className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom API Keys</CardTitle>
              <CardDescription>
                Custom API keys are only available for Pro and Ultra plans. When
                you run out of thumbnails, your own API keys will be used
                automatically.
              </CardDescription>
            </CardHeader>
          </Card>
          <Alert>
            <Info className="size-4" />
            <AlertTitle>Upgrade to Pro</AlertTitle>
            <AlertDescription>
              <Link
                to="/orgs/$orgSlug/settings/billing"
                params={{ orgSlug }}
                className="underline"
              >
                Upgrade to Pro or Ultra
              </Link>{" "}
              to use your own OpenAI and Gemini API keys.
            </AlertDescription>
          </Alert>
        </LayoutContent>
      </Layout>
    );
  }

  const isRequired = apiKeyMode === "required";

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>API Keys</LayoutTitle>
        <LayoutDescription>
          {isRequired
            ? "Your Poweruser plan requires custom API keys for all generations."
            : "Use your own API keys when you run out of thumbnails."}
        </LayoutDescription>
      </LayoutHeader>
      <LayoutContent className="flex flex-col gap-4 lg:gap-6">
        <Alert variant={isRequired ? "destructive" : "default"}>
          {isRequired ? (
            <AlertTriangle className="size-4" />
          ) : (
            <Info className="size-4" />
          )}
          <AlertTitle>
            {isRequired ? "Required API Keys" : "Fallback API Keys"}
          </AlertTitle>
          <AlertDescription>
            {isRequired
              ? "Add your OpenAI or Gemini API key below to start generating thumbnails."
              : "When you run out of thumbnails, your custom API keys will be used automatically for AI generation. This allows unlimited generations using your own API quota."}
          </AlertDescription>
        </Alert>

        <ProviderKeyCard
          orgSlug={orgSlug}
          provider="openai"
          title="OpenAI API Key"
          description="Your OpenAI API key for GPT Image 2 generation."
          docsUrl="https://platform.openai.com/api-keys"
          placeholder={openaiKey ? "Enter new key to replace" : "sk-..."}
          savedKey={openaiKey}
          usage={summary.customApiKeyUsage.totals.openai}
        />
        <ProviderKeyCard
          orgSlug={orgSlug}
          provider="gemini"
          title="Gemini API Key"
          description="Your Google Gemini API key for image generation."
          docsUrl="https://aistudio.google.com/apikey"
          placeholder={geminiKey ? "Enter new key to replace" : "AIza..."}
          savedKey={geminiKey}
          usage={summary.customApiKeyUsage.totals.gemini}
        />
        {isProductAdmin ? (
          <ProviderKeyCard
            orgSlug={orgSlug}
            provider="apiyi"
            title="APIYI API Key"
            description="Your APIYI key for efficient image generation routing."
            docsUrl="https://docs.apiyi.com/"
            placeholder={apiyiKey ? "Enter new key to replace" : "sk-..."}
            savedKey={apiyiKey}
            usage={summary.customApiKeyUsage.totals.apiyi}
          />
        ) : null}

        {summary.customApiKeyUsage.chartData.length > 0 ? (
          <Card className="py-0">
            <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
              <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-6">
                <CardTitle>Usage History</CardTitle>
                <CardDescription>
                  Generations using your custom API keys (last 30 days)
                </CardDescription>
              </div>
              <div className="flex">
                <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
                  <Typography variant="muted" className="text-xs">
                    OpenAI
                  </Typography>
                  <Typography variant="h2" className="font-bold">
                    {summary.customApiKeyUsage.totals.openai.thisMonth}
                  </Typography>
                  <Typography variant="small" className="text-muted-foreground">
                    Total: {summary.customApiKeyUsage.totals.openai.total}
                  </Typography>
                </div>
                <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
                  <Typography variant="muted" className="text-xs">
                    Gemini
                  </Typography>
                  <Typography variant="h2" className="font-bold">
                    {summary.customApiKeyUsage.totals.gemini.thisMonth}
                  </Typography>
                  <Typography variant="small" className="text-muted-foreground">
                    Total: {summary.customApiKeyUsage.totals.gemini.total}
                  </Typography>
                </div>
                {isProductAdmin ? (
                  <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
                    <Typography variant="muted" className="text-xs">
                      APIYI
                    </Typography>
                    <Typography variant="h2" className="font-bold">
                      {summary.customApiKeyUsage.totals.apiyi.thisMonth}
                    </Typography>
                    <Typography
                      variant="small"
                      className="text-muted-foreground"
                    >
                      Total: {summary.customApiKeyUsage.totals.apiyi.total}
                    </Typography>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={summary.customApiKeyUsage.chartData}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value) =>
                      new Date(String(value)).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <ChartTooltip
                    content={(props) => <ChartTooltipContent {...props} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="openai"
                    fill="var(--color-openai)"
                    radius={[4, 4, 0, 0]}
                    stackId="usage"
                  />
                  <Bar
                    dataKey="gemini"
                    fill="var(--color-gemini)"
                    radius={[4, 4, 0, 0]}
                    stackId="usage"
                  />
                  {isProductAdmin ? (
                    <Bar
                      dataKey="apiyi"
                      fill="var(--color-apiyi)"
                      radius={[4, 4, 0, 0]}
                      stackId="usage"
                    />
                  ) : null}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : null}
      </LayoutContent>
    </Layout>
  );
}

function ProviderKeyCard({
  orgSlug,
  provider,
  title,
  description,
  docsUrl,
  placeholder,
  savedKey,
  usage,
}: {
  orgSlug: string;
  provider: Provider;
  title: string;
  description: string;
  docsUrl: string;
  placeholder: string;
  savedKey?: ProviderKey;
  usage: { total: number; thisMonth: number };
}) {
  const upsertKey = useAction(
    providerKeysApi.billingNode.upsertCustomProviderApiKey,
  );
  const deleteKey = useMutation(
    providerKeysApi.billing.deleteCustomProviderApiKey,
  );
  const form = useForm({
    schema: ProviderKeySchema,
    defaultValues: {
      apiKey: "",
    },
    onSubmit: async (values) => {
      await upsertKey({
        orgSlug,
        provider,
        label: `${PROVIDER_LABELS[provider]} API key`,
        apiKey: values.apiKey,
      });
      form.reset();
      toast.success(`${PROVIDER_LABELS[provider]} API key added successfully`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="size-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {description} Get one from{" "}
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {new URL(docsUrl).hostname}
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {savedKey ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-500" />
              <span className="font-mono text-sm">
                {savedKey.maskedKey ?? getMaskedKey(provider)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                await deleteKey({ orgSlug, provider });
                toast.success("API key removed successfully");
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}

        {usage.total > 0 || savedKey ? (
          <div className="bg-muted/50 flex items-center gap-4 rounded-md p-3">
            <Activity className="text-muted-foreground size-4" />
            <div className="flex gap-4 text-sm">
              <span>
                <span className="text-muted-foreground">This month:</span>{" "}
                <Badge variant="secondary">{usage.thisMonth}</Badge>
              </span>
              <span>
                <span className="text-muted-foreground">Total:</span>{" "}
                <Badge variant="outline">{usage.total}</Badge>
              </span>
            </div>
          </div>
        ) : null}

        <Form form={form}>
          <form.AppField name="apiKey">
            {(field) => (
              <field.Field>
                <field.Content>
                  <div className="flex gap-2">
                    <field.Input
                      type="password"
                      placeholder={placeholder}
                      className="flex-1 font-mono"
                    />
                    <form.Subscribe selector={(state) => state.isSubmitting}>
                      {(isSubmitting) => (
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Test and add"
                          )}
                        </Button>
                      )}
                    </form.Subscribe>
                  </div>
                  <field.Message />
                </field.Content>
              </field.Field>
            )}
          </form.AppField>
        </Form>
      </CardContent>
    </Card>
  );
}

function getMaskedKey(provider: Provider) {
  return provider === "openai" ? "sk-...configured" : "AIza...configured";
}
