import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Typography } from "@/components/nowts/typography";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Check, Copy } from "lucide-react";

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

type ApiExamplesProps = {
  method?: ApiMethod;
  endpoint?: string;
  examples?: Record<string, string>;
  results?: Record<string, string>;
  className?: string;
};

const methodColors: Record<ApiMethod, string> = {
  GET: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  POST: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  PATCH:
    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
  DELETE: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  PUT: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
};

export function DocsApiExamples({
  method,
  endpoint,
  examples,
  results,
  className,
}: ApiExamplesProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);

  if (!examples && !results && !method && !endpoint) {
    return null;
  }

  const exampleKeys = examples ? Object.keys(examples) : [];
  const resultKeys = results ? Object.keys(results) : [];

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {(method ?? endpoint) && (
        <button
          type="button"
          onClick={() => endpoint && copyToClipboard(endpoint)}
          className="bg-muted hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-lg p-4 transition-colors"
        >
          {method && (
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-sm font-semibold",
                methodColors[method],
              )}
            >
              {method}
            </Badge>
          )}
          {endpoint && (
            <code className="text-foreground flex-1 text-left font-mono text-sm">
              {endpoint}
            </code>
          )}
          {isCopied ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Copy className="text-muted-foreground size-4" />
          )}
        </button>
      )}

      {examples && exampleKeys.length > 0 && (
        <div className="flex flex-col gap-2">
          <Typography variant="muted" className="text-xs">
            Request Examples
          </Typography>
          <Tabs defaultValue={exampleKeys[0]} className="w-full">
            <TabsList
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(${exampleKeys.length}, 1fr)`,
              }}
            >
              {exampleKeys.map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="whitespace-nowrap capitalize"
                >
                  {key}
                </TabsTrigger>
              ))}
            </TabsList>
            {exampleKeys.map((key) => (
              <TabsContent key={key} value={key} className="mt-2">
                <pre className="bg-muted text-foreground overflow-x-auto rounded-lg p-4 text-xs">
                  <code>{examples[key].trim()}</code>
                </pre>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {results && resultKeys.length > 0 && (
        <div className="flex flex-col gap-2">
          <Typography variant="muted" className="text-xs">
            Response Examples
          </Typography>
          <Tabs defaultValue={resultKeys[0]} className="w-full">
            <TabsList
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(${resultKeys.length}, 1fr)`,
              }}
            >
              {resultKeys.map((key) => (
                <TabsTrigger key={key} value={key} className="capitalize">
                  {key}
                </TabsTrigger>
              ))}
            </TabsList>
            {resultKeys.map((key) => (
              <TabsContent key={key} value={key} className="mt-2">
                <pre className="bg-muted text-foreground overflow-x-auto rounded-lg p-4 text-xs">
                  <code>{results[key].trim()}</code>
                </pre>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}
