import {
  AlertTriangleIcon,
  BotIcon,
  BrainIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  Clock3Icon,
  FilePenLineIcon,
  TerminalIcon,
  WrenchIcon,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

type TranscriptEvent = {
  id: string
  kind: "assistant" | "error" | "marker" | "thinking" | "tool" | "user"
  label: string
  meta?: string
  output?: string
  status?: string
  text: string
  toolId?: string
  toolResult?: boolean
}

type JsonRecord = Record<string, unknown>

type WorkBlock =
  | { id: string; type: "event"; event: TranscriptEvent }
  | { id: string; type: "tools"; events: TranscriptEvent[] }

export function TranscriptViewer({
  transcript,
  prompt,
  durationMs,
}: {
  transcript: string
  prompt?: string
  durationMs?: number | null
}) {
  const events = parseTranscript(transcript)
  let finalIndex = -1
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].kind === "assistant" && events[index].text.trim()) {
      finalIndex = index
      break
    }
  }
  const finalEvent = finalIndex >= 0 ? events[finalIndex] : undefined
  const parsedUser = events.find(
    (event) => event.kind === "user" && Boolean(event.text.trim())
  )
  const userPrompt = prompt?.trim() || parsedUser?.text || ""
  const workEvents = events.filter(
    (event, index) =>
      index !== finalIndex &&
      event !== parsedUser &&
      !(event.kind === "marker" && event.status === "started")
  )
  const blocks = groupWorkEvents(workEvents)

  return (
    <MessageScrollerProvider autoScroll={false} defaultScrollPosition="start">
      <MessageScroller>
        <MessageScrollerViewport aria-label="Model transcript">
          <MessageScrollerContent className="mx-auto w-full max-w-4xl gap-5 p-5 md:p-8">
            {userPrompt && (
              <MessageScrollerItem messageId="benchmark-prompt" scrollAnchor>
                <PromptMessage prompt={userPrompt} />
              </MessageScrollerItem>
            )}
            {blocks.length > 0 && (
              <MessageScrollerItem messageId="benchmark-work">
                <WorkDisclosure blocks={blocks} durationMs={durationMs} />
              </MessageScrollerItem>
            )}
            {finalEvent && (
              <MessageScrollerItem messageId={finalEvent.id}>
                <FinalMessage event={finalEvent} />
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

function PromptMessage({ prompt }: { prompt: string }) {
  const displayPrompt = stripPromptTags(prompt)
  const isLong = displayPrompt.length > 900
  const preview = isLong
    ? `${displayPrompt.slice(0, 900).trimEnd()}…`
    : displayPrompt

  return (
    <Message align="end">
      <MessageContent>
        <Bubble variant="tinted" align="end" className="max-w-[92%]">
          <BubbleContent>
            {isLong ? (
              <Collapsible className="group/prompt">
                <div className="group-data-[state=open]/prompt:hidden">
                  <TranscriptMarkdown>{preview}</TranscriptMarkdown>
                </div>
                <CollapsibleContent className="mt-3">
                  <TranscriptMarkdown>{displayPrompt}</TranscriptMarkdown>
                </CollapsibleContent>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="xs" className="group mt-3">
                    <ChevronRightIcon
                      data-icon="inline-end"
                      className="transition-transform group-data-[state=open]:rotate-90"
                    />
                    <span className="group-data-[state=open]:hidden">
                      Show full prompt
                    </span>
                    <span className="hidden group-data-[state=open]:inline">
                      Hide full prompt
                    </span>
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            ) : (
              <TranscriptMarkdown>{displayPrompt}</TranscriptMarkdown>
            )}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

function WorkDisclosure({
  blocks,
  durationMs,
}: {
  blocks: WorkBlock[]
  durationMs?: number | null
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="group w-full justify-start px-0 active:scale-[0.96]"
        >
          <Clock3Icon data-icon="inline-start" />
          <span>{workedLabel(durationMs)}</span>
          <ChevronRightIcon
            data-icon="inline-end"
            className="transition-transform group-data-[state=open]:rotate-90"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 border-t pt-5">
        <div className="flex flex-col gap-4">
          {blocks.map((block) =>
            block.type === "tools" ? (
              <ToolGroup key={block.id} events={block.events} />
            ) : (
              <WorkEvent key={block.id} event={block.event} />
            )
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function WorkEvent({ event }: { event: TranscriptEvent }) {
  if (event.kind === "marker") {
    return (
      <Marker variant="separator">
        <MarkerIcon>
          <CheckCircle2Icon />
        </MarkerIcon>
        <MarkerContent>{event.text}</MarkerContent>
      </Marker>
    )
  }

  if (event.kind === "error") {
    return (
      <Marker>
        <MarkerIcon>
          <AlertTriangleIcon />
        </MarkerIcon>
        <MarkerContent className="text-destructive">{event.text}</MarkerContent>
      </Marker>
    )
  }

  if (event.kind === "thinking") {
    return (
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="group w-full justify-start px-0"
          >
            <BrainIcon data-icon="inline-start" />
            Thinking
            <ChevronRightIcon
              data-icon="inline-end"
              className="transition-transform group-data-[state=open]:rotate-90"
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-6 pt-2 text-muted-foreground">
          <TranscriptMarkdown>{event.text}</TranscriptMarkdown>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Message align={event.kind === "user" ? "end" : "start"}>
      <MessageContent>
        <Bubble
          variant={event.kind === "user" ? "tinted" : "ghost"}
          align={event.kind === "user" ? "end" : "start"}
          className="max-w-full"
        >
          <BubbleContent>
            <TranscriptMarkdown>{event.text}</TranscriptMarkdown>
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

function ToolGroup({ events }: { events: TranscriptEvent[] }) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="group w-full justify-start px-0"
        >
          <WrenchIcon data-icon="inline-start" />
          <span className="truncate">{summarizeTools(events)}</span>
          <ChevronRightIcon
            data-icon="inline-end"
            className="ml-auto transition-transform group-data-[state=open]:rotate-90"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 pt-2">
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <ToolDetail key={event.id} event={event} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ToolDetail({ event }: { event: TranscriptEvent }) {
  const Icon = toolIcon(event.label)
  return (
    <Bubble
      variant={event.status === "failed" ? "destructive" : "outline"}
      className="max-w-full"
    >
      <BubbleContent className="w-full">
        <div className="flex min-w-0 items-center gap-2">
          <Icon />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">
            {event.label}
          </span>
          {event.status && (
            <Badge
              variant={event.status === "failed" ? "destructive" : "outline"}
            >
              {event.status}
            </Badge>
          )}
        </div>
        {event.text && <ToolCode>{event.text}</ToolCode>}
        {event.output && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="xs" className="group mt-2">
                <ChevronRightIcon
                  data-icon="inline-start"
                  className="transition-transform group-data-[state=open]:rotate-90"
                />
                Output
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ToolCode>{event.output}</ToolCode>
            </CollapsibleContent>
          </Collapsible>
        )}
      </BubbleContent>
    </Bubble>
  )
}

function ToolCode({ children }: { children: string }) {
  return (
    <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
      {children}
    </pre>
  )
}

function FinalMessage({ event }: { event: TranscriptEvent }) {
  return (
    <Message align="start">
      <MessageContent>
        <Bubble variant="ghost" className="max-w-full">
          <BubbleContent>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BotIcon />
              Final response
            </div>
            <TranscriptMarkdown>{event.text}</TranscriptMarkdown>
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

function TranscriptMarkdown({ children }: { children: string }) {
  return (
    <div className="transcript-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

function stripPromptTags(value: string) {
  return value
    .replace(/^\s*<\/?[a-zA-Z][a-zA-Z0-9_-]*>\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function groupWorkEvents(events: TranscriptEvent[]): WorkBlock[] {
  const blocks: WorkBlock[] = []
  let tools: TranscriptEvent[] = []

  const flushTools = () => {
    if (!tools.length) return
    blocks.push({ id: `tools-${tools[0].id}`, type: "tools", events: tools })
    tools = []
  }

  for (const event of events) {
    if (event.kind === "tool") tools.push(event)
    else {
      flushTools()
      if (event.text.trim()) blocks.push({ id: event.id, type: "event", event })
    }
  }
  flushTools()
  return blocks
}

function workedLabel(durationMs?: number | null) {
  if (durationMs === undefined || durationMs === null) return "Work details"
  const totalSeconds = Math.max(0, Math.round(durationMs / 1_000))
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  const parts = [
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    `${seconds}s`,
  ].filter(Boolean)
  return `Worked for ${parts.join(" ")}`
}

function summarizeTools(events: TranscriptEvent[]) {
  const counts = new Map<string, number>()
  for (const event of events) {
    const category = toolCategory(event.label)
    counts.set(category, (counts.get(category) || 0) + 1)
  }
  return [...counts]
    .map(([category, count]) => toolPhrase(category, count))
    .join(", ")
}

function toolCategory(label: string) {
  const value = label.toLowerCase()
  if (/edit|write|file.change|notebook/.test(value)) return "edit"
  if (/read|glob|grep|find/.test(value)) return "read"
  if (/bash|command|terminal/.test(value)) return "command"
  if (/web|search|fetch/.test(value)) return "web"
  if (/skill|toolsearch|mcp|resource/.test(value)) return "load"
  return "tool"
}

function toolPhrase(category: string, count: number) {
  const phrases: Record<string, [string, string]> = {
    command: ["Ran a command", `Ran ${count} commands`],
    edit: ["Edited a file", `Edited ${count} files`],
    load: ["Loaded a tool", `Loaded ${count} tools`],
    read: ["Read a file", `Read ${count} files`],
    tool: ["Used a tool", `Used ${count} tools`],
    web: ["Searched the web", `Searched the web ${count} times`],
  }
  return phrases[category][count === 1 ? 0 : 1]
}

function toolIcon(label: string) {
  const category = toolCategory(label)
  if (category === "command") return TerminalIcon
  if (category === "edit") return FilePenLineIcon
  return WrenchIcon
}

export function parseTranscript(transcript: string): TranscriptEvent[] {
  const events: TranscriptEvent[] = []
  for (const [index, line] of transcript.split("\n").entries()) {
    if (!line.trim()) continue
    try {
      events.push(...normalizeRecord(JSON.parse(line) as JsonRecord, index))
    } catch {
      events.push({
        id: `raw-${index}`,
        kind: "error",
        label: "Unparseable event",
        text: line,
      })
    }
  }
  return mergeToolResults(events)
}

function mergeToolResults(events: TranscriptEvent[]) {
  const calls = new Map<string, TranscriptEvent>()
  const merged: TranscriptEvent[] = []
  for (const event of events) {
    if (event.kind === "tool" && event.toolId && !event.toolResult) {
      calls.set(event.toolId, event)
      merged.push(event)
    } else if (event.toolResult && event.toolId && calls.has(event.toolId)) {
      const call = calls.get(event.toolId)
      if (call) {
        call.output = event.output
        call.status = event.status
      }
    } else merged.push(event)
  }
  return merged
}

function normalizeRecord(record: JsonRecord, index: number): TranscriptEvent[] {
  const type = stringValue(record.type)
  const id = `${index}-${type || "event"}`

  if (["thread.started", "turn.started"].includes(type)) return []
  if (type === "turn.completed") {
    return [
      {
        id,
        kind: "marker",
        label: "Lifecycle",
        status: "completed",
        text: "Run completed",
      },
    ]
  }
  if (type === "item.completed")
    return normalizeCodexItem(objectValue(record.item), id)
  if (type === "item.started") return []
  if (type === "assistant" || type === "user")
    return normalizeRoleMessage(record, type, id)
  if (type === "result" && stringValue(record.subtype) === "error") {
    return [
      {
        id,
        kind: "error",
        label: "Run error",
        text: stringValue(record.result) || "Run failed",
      },
    ]
  }
  return []
}

function normalizeCodexItem(item: JsonRecord, id: string): TranscriptEvent[] {
  const type = stringValue(item.type)
  if (type === "agent_message") {
    return [
      { id, kind: "assistant", label: "Agent", text: stringValue(item.text) },
    ]
  }
  if (type === "error") {
    return [
      { id, kind: "error", label: "Error", text: stringValue(item.message) },
    ]
  }
  if (type === "command_execution") {
    return [
      {
        id,
        kind: "tool",
        label: "Command",
        output: stringValue(item.aggregated_output),
        status: stringValue(item.status),
        text: stringValue(item.command),
      },
    ]
  }
  if (type === "file_change") {
    const changes = arrayValue(item.changes)
      .map((change) => {
        const value = objectValue(change)
        return `${stringValue(value.kind) || "change"}  ${stringValue(value.path)}`
      })
      .join("\n")
    return [
      {
        id,
        kind: "tool",
        label: "Files changed",
        status: stringValue(item.status),
        text: changes,
      },
    ]
  }
  if (type === "reasoning") {
    return [
      { id, kind: "thinking", label: "Thinking", text: stringValue(item.text) },
    ]
  }
  return []
}

function normalizeRoleMessage(record: JsonRecord, role: string, id: string) {
  const content = arrayValue(objectValue(record.message).content)
  const events: TranscriptEvent[] = []

  for (const [contentIndex, rawPart] of content.entries()) {
    const part = objectValue(rawPart)
    const partType = stringValue(part.type)
    const eventId = `${id}-${contentIndex}`
    if (partType === "text") {
      events.push({
        id: eventId,
        kind: role === "user" ? "user" : "assistant",
        label: role === "user" ? "User" : "Agent",
        text: stringValue(part.text),
      })
    } else if (partType === "thinking") {
      events.push({
        id: eventId,
        kind: "thinking",
        label: "Thinking",
        text: stringValue(part.thinking),
      })
    } else if (partType === "tool_use") {
      events.push({
        id: eventId,
        kind: "tool",
        label: stringValue(part.name) || "Tool call",
        text: prettyValue(part.input),
        toolId: stringValue(part.id),
      })
    } else if (partType === "tool_result") {
      events.push({
        id: eventId,
        kind: "tool",
        label: "Tool result",
        output: contentText(part.content),
        status: part.is_error ? "failed" : "completed",
        text: "",
        toolId: stringValue(part.tool_use_id),
        toolResult: true,
      })
    }
  }
  return events
}

function contentText(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    return value
      .map((part) => stringValue(objectValue(part).text) || prettyValue(part))
      .join("\n")
  }
  return prettyValue(value)
}

function prettyValue(value: unknown) {
  if (value === undefined || value === null) return ""
  if (typeof value === "string") return value
  return JSON.stringify(value, null, 2)
}

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {}
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}
