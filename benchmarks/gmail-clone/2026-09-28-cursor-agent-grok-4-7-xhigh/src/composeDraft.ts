import { newId } from "./logic";
import type { ComposeModel, Thread } from "./types";

export function draftToCompose(thread: Thread, placement: ComposeModel["placement"]): ComposeModel {
  const draft = thread.draft;
  return {
    id: newId("c"),
    threadId: thread.id,
    mode: thread.messages.length ? "reply" : "new",
    placement,
    minimized: false,
    maximized: false,
    to: draft?.to ?? [],
    cc: draft?.cc ?? [],
    bcc: draft?.bcc ?? [],
    subject: draft?.subject || thread.subject,
    body: draft?.body ?? "",
    attachments: draft?.attachments ?? [],
    showCc: (draft?.cc.length ?? 0) > 0,
    showBcc: (draft?.bcc.length ?? 0) > 0,
  };
}
