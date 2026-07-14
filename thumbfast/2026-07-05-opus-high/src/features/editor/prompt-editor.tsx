import { cn } from "@/lib/utils";
import { Mention } from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import {
  SuggestionList,
  type MentionType,
  type SuggestionItem,
  type SuggestionListRef,
} from "./mention-suggestion";
import { getEditorStore, useEditorStore } from "./editor.store";
import { showImageLimitDialog } from "./show-image-limit-dialog";
import {
  PROMPT_MENTION_RE,
  promptMentionsToAiFormat,
} from "@/lib/prompt-mentions";

const orgSlugRef: { current: string } = { current: "" };

export function setOrgSlug(slug: string) {
  orgSlugRef.current = slug;
}

function matchesQuery(query: string, ...values: (string | null | undefined)[]) {
  if (!query) return true;
  return values.some((value) => value?.toLowerCase().includes(query));
}

export async function getMentionSuggestionItems(
  query: string,
): Promise<SuggestionItem[]> {
  const store = getEditorStore();
  const lowerQuery = query.toLowerCase();
  const results: SuggestionItem[] = [];
  const addedImageIds = new Set(store.userImages.map((img) => img.id));

  const knownImages = [...store.userImages, ...store.availableUserImages];
  const seenImageIds = new Set<string>();

  for (const img of knownImages) {
    if (seenImageIds.has(img.id)) continue;
    seenImageIds.add(img.id);
    if (!matchesQuery(lowerQuery, img.name, img.description)) continue;
    results.push({
      id: img.id,
      label: img.name,
      type: "image",
      imageUrl: img.imageUrl,
      subtitle: img.description ?? undefined,
      isAdded: addedImageIds.has(img.id),
    });
  }

  for (const p of store.persons) {
    if (!matchesQuery(lowerQuery, p.name, p.description)) continue;
    results.push({
      id: p.id,
      label: p.name,
      type: "person",
      imageUrl: p.images[0],
      subtitle: p.description,
      isAdded: store.personIds.includes(p.id),
    });
  }

  for (const i of store.inspirations) {
    if (!matchesQuery(lowerQuery, i.name, i.aiDescription)) continue;
    results.push({
      id: i.id,
      label: i.name,
      type: "inspiration",
      imageUrl: i.thumbnailUrls[0],
      subtitle: i.aiDescription,
      isAdded: store.inspirationIds.includes(i.id),
    });
  }

  return results.slice(0, 15);
}

function handleMentionSelected(mentionType: MentionType, id: string) {
  const store = getEditorStore();

  if (mentionType === "person") {
    const added = store.addPersonId(id);
    if (!added) showImageLimitDialog();
  } else if (mentionType === "inspiration") {
    const added = store.addInspirationId(id);
    if (!added) showImageLimitDialog();
  } else {
    const fromSearch = store.availableUserImages.find((img) => img.id === id);
    if (fromSearch) {
      const added = store.addUserImage({
        id: fromSearch.id,
        imageUrl: fromSearch.imageUrl,
        name: fromSearch.name,
        description: fromSearch.description ?? "Uploaded image",
      });
      if (!added) showImageLimitDialog();
    }
  }
}

const MENTION_COLORS: Record<MentionType, string> = {
  person: "mention-person",
  inspiration: "mention-inspiration",
  image: "mention-image",
};

const CustomMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mentionType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mention-type"),
        renderHTML: (attributes) => {
          if (!attributes.mentionType) return {};
          return { "data-mention-type": attributes.mentionType };
        },
      },
    };
  },
});

export type PromptEditorHandle = {
  setContentWithMentions: (text: string) => void;
};

type PromptEditorProps = {
  onMetaEnter?: () => void;
  onPaste?: (e: ClipboardEvent) => void;
  className?: string;
  editorRef?: React.MutableRefObject<PromptEditorHandle | null>;
};

export function PromptEditor({
  onMetaEnter,
  onPaste,
  className,
}: PromptEditorProps) {
  const { textPrompt, setTextPrompt } = useEditorStore();
  const isInternalUpdate = useRef(false);
  const onMetaEnterRef = useRef(onMetaEnter);
  useEffect(() => {
    onMetaEnterRef.current = onMetaEnter;
  }, [onMetaEnter]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        listItem: false,
        hardBreak: {},
      }),
      Placeholder.configure({
        placeholder: "What will you imagine? Use @ to add references",
      }),
      CustomMention.configure({
        HTMLAttributes: {
          class: "mention-tag",
        },
        renderHTML({ node }) {
          /* eslint-disable @typescript-eslint/no-unnecessary-condition */
          const type = (node.attrs.mentionType as MentionType) ?? "person";
          const colorClass = MENTION_COLORS[type] ?? "";
          /* eslint-enable @typescript-eslint/no-unnecessary-condition */
          return [
            "span",
            {
              class: `mention-tag ${colorClass}`,
              "data-type": "mention",
              "data-id": node.attrs.id,
              "data-mention-type": type,
            },
            `@${node.attrs.label ?? node.attrs.id}`,
          ];
        },
        renderText({ node }) {
          /* eslint-disable @typescript-eslint/no-unnecessary-condition */
          const type = (node.attrs.mentionType as MentionType) ?? "person";
          const id = node.attrs.id as string;
          const label = (node.attrs.label as string) ?? id;
          /* eslint-enable @typescript-eslint/no-unnecessary-condition */
          return `@{{${type}:${id}:${label}}}`;
        },
        suggestion: {
          items: async ({ query }) => getMentionSuggestionItems(query),
          char: "@",
          allowSpaces: true,
          render: () => {
            let component: ReactRenderer<SuggestionListRef> | null = null;
            let popup: HTMLDivElement | null = null;

            type MentionCommandAttrs = {
              id: string;
              label: string;
              mentionType: MentionType;
            };
            const makeCommand = (
              propsCommand: (attrs: MentionCommandAttrs) => void,
            ) => {
              return (attrs: MentionCommandAttrs) => {
                handleMentionSelected(attrs.mentionType, attrs.id);
                propsCommand(attrs);
              };
            };

            const positionPopup = (
              clientRect?: (() => DOMRect | null) | null,
            ) => {
              const rect = clientRect?.();
              if (rect && popup) {
                popup.style.position = "fixed";
                popup.style.left = `${rect.left}px`;
                popup.style.top = `${rect.bottom + 4}px`;
              }
            };

            const cleanup = () => {
              if (popup) {
                popup.remove();
                popup = null;
              }
              if (component) {
                component.destroy();
                component = null;
              }
            };

            return {
              onBeforeStart: (props) => {
                // Clean up any existing popup first
                cleanup();

                const loadingItems: SuggestionItem[] = [
                  { id: "_loading", label: "", type: "person", _loading: true },
                ];

                component = new ReactRenderer(SuggestionList, {
                  props: {
                    items: loadingItems,
                    command: makeCommand(props.command),
                  },
                  editor: props.editor,
                });

                popup = document.createElement("div");
                popup.className =
                  "bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 z-50 w-80 rounded-xl border shadow-xl";
                popup.appendChild(component.element);
                document.body.appendChild(popup);

                positionPopup(props.clientRect);
              },
              onStart: (props) => {
                if (!component || !popup) return;
                component.updateProps({
                  items: props.items,
                  command: makeCommand(props.command),
                });
                positionPopup(props.clientRect);
              },
              onBeforeUpdate: (props) => {
                if (!component) return;
                component.updateProps({
                  items: [
                    {
                      id: "_loading",
                      label: "",
                      type: "person",
                      _loading: true,
                    },
                  ],
                  command: makeCommand(props.command),
                });
              },
              onUpdate: (props) => {
                if (!component || !popup) return;
                component.updateProps({
                  items: props.items,
                  command: makeCommand(props.command),
                });
                positionPopup(props.clientRect);
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  cleanup();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                cleanup();
              },
            };
          },
        },
      }),
    ],
    content: textPrompt ? textToHtml(textPrompt) : "",
    editorProps: {
      attributes: {
        class: "",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && event.metaKey) {
          event.preventDefault();
          onMetaEnterRef.current?.();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              onPaste?.(event as unknown as ClipboardEvent);
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      setTextPrompt(editor.getText());
    },
  });

  useEffect(() => {
    if (!editor || isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const currentText = editor.getText();
    if (currentText !== textPrompt) {
      editor.commands.setContent(textPrompt ? textToHtml(textPrompt) : "");
    }
  }, [editor, textPrompt]);

  return (
    <div className={cn("prompt-editor", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(text: string): string {
  const lines = text.split("\n");

  const htmlLines = lines.map((line) => {
    if (!line) return "<p><br></p>";

    // Replace @{{type:id:label}} with proper mention HTML
    const processedLine = line.replace(
      PROMPT_MENTION_RE,
      (_match, type: MentionType, id: string, label: string) => {
        const colorClass = MENTION_COLORS[type];
        return `<span class="mention-tag ${colorClass}" data-type="mention" data-id="${escapeHtml(id)}" data-label="${escapeHtml(label)}" data-mention-type="${type}">@${escapeHtml(label)}</span>`;
      },
    );

    // Escape any remaining HTML (but not the spans we just created)
    // We need to be careful here - only escape parts that aren't our spans
    const parts = processedLine.split(/(<span[^>]*>@[^<]*<\/span>)/);
    const escapedParts = parts.map((part) => {
      if (part.startsWith("<span")) {
        return part; // Keep our mention spans as-is
      }
      return escapeHtml(part);
    });

    return `<p>${escapedParts.join("")}</p>`;
  });

  return htmlLines.join("");
}

/**
 * Convert structured prompt text to AI-friendly format
 * Replaces @{{type:id:label}} with [TYPE: label]
 */
export function promptToAiFormat(text: string): string {
  return promptMentionsToAiFormat(text);
}

/**
 * Extract all mentions from a prompt text
 */
export function extractMentions(
  text: string,
): { type: MentionType; id: string; label: string }[] {
  const mentions: { type: MentionType; id: string; label: string }[] = [];
  const regex = new RegExp(PROMPT_MENTION_RE.source, "g");
  let match;

  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      type: match[1] as MentionType,
      id: match[2],
      label: match[3],
    });
  }

  return mentions;
}
