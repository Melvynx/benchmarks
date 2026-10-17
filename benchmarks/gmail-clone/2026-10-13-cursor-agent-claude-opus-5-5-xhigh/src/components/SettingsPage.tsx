import { useState, type ReactNode } from "react";
import { useMail, getMail } from "../lib/store";
import { ui } from "../lib/ui";
import { navigate } from "../lib/router";
import { FOLDER_META, folderCount } from "../lib/selectors";
import type { Category, Settings } from "../lib/types";
import { cn, formatBytes } from "../lib/utils";
import { downloadBlob } from "../lib/files";
import { Avatar, Button, Icon, IconButton, LabelChip } from "./ui";
import { FilterDialog } from "./FilterDialog";
import { useStorage } from "./Header";
import { useIsMobile } from "../hooks/useMedia";

const TABS: [string, string][] = [
  ["general", "General"],
  ["labels", "Labels"],
  ["inbox", "Inbox"],
  ["accounts", "Accounts"],
  ["filters", "Filters"],
  ["advanced", "Advanced"],
];

function Row({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-line py-5 md:grid-cols-[240px_1fr] md:gap-8">
      <div>
        <div className="font-sans text-sm font-medium text-fg">{title}</div>
        {hint && <div className="mt-1 font-body text-xs leading-5 text-fg-3">{hint}</div>}
      </div>
      <div className="flex flex-col gap-1.5 font-body text-sm text-fg">{children}</div>
    </div>
  );
}

function Choice<T extends string | number | boolean>({ name, value, options, onChange }: { name: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <>
      {options.map(([v, l]) => (
        <label key={String(v)} className="flex cursor-pointer items-center gap-3 py-0.5">
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="size-4 accent-[var(--primary)]" />
          {l}
        </label>
      ))}
    </>
  );
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-0.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--primary)]" />
      {children}
    </label>
  );
}

function General() {
  const s = useMail((st) => st.settings);
  const set = (p: Partial<Settings>) => getMail().updateSettings(p);
  const [sig, setSig] = useState(() => s.signature.replace(/<br\s*\/?>/gi, "\n"));
  return (
    <>
      <Row title="Theme">
        <Choice name="theme" value={s.theme} onChange={(v) => set({ theme: v })} options={[["light", "Light"], ["dark", "Dark"], ["system", "Match device"]]} />
      </Row>
      <Row title="Density">
        <Choice name="density" value={s.density} onChange={(v) => set({ density: v })} options={[["default", "Default"], ["comfortable", "Comfortable"], ["compact", "Compact"]]} />
      </Row>
      <Row title="Maximum page size" hint="Conversations shown per page.">
        <select value={s.pageSize} onChange={(e) => set({ pageSize: Number(e.target.value) })} className="h-9 w-32 rounded-md border border-outline bg-surface px-2 text-sm text-fg">
          {[10, 15, 20, 25, 50, 100].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </Row>
      <Row title="Undo send" hint="How long you can cancel a message after pressing Send.">
        <div className="flex items-center gap-2">
          Send cancellation period:
          <select value={s.undoSendSeconds} onChange={(e) => set({ undoSendSeconds: Number(e.target.value) })} className="h-9 rounded-md border border-outline bg-surface px-2 text-sm text-fg">
            {[5, 10, 20, 30].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          seconds
        </div>
      </Row>
      <Row title="Default reply behavior">
        <Choice name="reply" value={s.defaultReply} onChange={(v) => set({ defaultReply: v })} options={[["reply", "Reply"], ["replyAll", "Reply all"]]} />
      </Row>
      <Row title="Hover actions" hint="Quickly gain access to archive, delete, mark as read and snooze from the list.">
        <Choice name="hover" value={s.hoverActions} onChange={(v) => set({ hoverActions: v })} options={[[true, "Enable hover actions"], [false, "Disable hover actions"]]} />
      </Row>
      <Row title="Send and Archive">
        <Choice name="sa" value={s.sendAndArchive} onChange={(v) => set({ sendAndArchive: v })} options={[[true, "Archive the conversation when you reply"], [false, "Keep replied conversations in the inbox"]]} />
      </Row>
      <Row title="Auto-advance" hint="After archiving, deleting or muting a conversation in reading view.">
        <Choice name="aa" value={s.autoAdvance} onChange={(v) => set({ autoAdvance: v })} options={[["back", "Go back to the threadlist"], ["newer", "Go to the next (newer) conversation"], ["older", "Go to the previous (older) conversation"]]} />
      </Row>
      <Row title="Keyboard shortcuts" hint={<button type="button" className="text-primary hover:underline" onClick={() => ui().set({ shortcutsOpen: true })}>Learn more</button>}>
        <Choice name="kb" value={s.keyboardShortcuts} onChange={(v) => set({ keyboardShortcuts: v })} options={[[true, "Keyboard shortcuts on"], [false, "Keyboard shortcuts off"]]} />
      </Row>
      <Row title="Snippets">
        <Choice name="snip" value={s.showSnippets} onChange={(v) => set({ showSnippets: v })} options={[[true, "Show snippets of the message"], [false, "No snippets, subject only"]]} />
      </Row>
      <Row title="Attachment chips">
        <Toggle checked={s.showAttachmentChips} onChange={(v) => set({ showAttachmentChips: v })}>Show attachments in the message list</Toggle>
      </Row>
      <Row title="Swipe actions" hint="Mobile: swipe a conversation left or right.">
        <Choice name="swipe" value={s.swipeAction} onChange={(v) => set({ swipeAction: v })} options={[["archive", "Archive"], ["trash", "Delete"], ["read", "Mark as read / unread"], ["none", "None"]]} />
      </Row>
      <Row title="Signature" hint="Appended at the end of all outgoing messages.">
        <textarea
          value={sig}
          onChange={(e) => setSig(e.target.value)}
          onBlur={() => set({ signature: sig.split("\n").map((l) => l.replace(/[<>]/g, "")).join("<br>") })}
          rows={4}
          aria-label="Signature"
          className="w-full max-w-[480px] rounded-md border border-outline bg-surface p-3 text-sm text-fg outline-none focus:border-2 focus:border-primary"
        />
        <Toggle checked={s.useSignature} onChange={(v) => set({ useSignature: v })}>Insert signature in new messages and replies</Toggle>
      </Row>
      <Row title="Demo activity" hint="New messages arrive over time and people reply to what you send. Nothing leaves this browser.">
        <Toggle checked={s.simulateActivity} onChange={(v) => set({ simulateActivity: v })}>Simulate incoming mail &amp; replies</Toggle>
      </Row>
    </>
  );
}

function Labels() {
  const labels = useMail((s) => s.labels);
  const s = useMail((st) => st);
  const sys = ["inbox", "starred", "snoozed", "important", "sent", "scheduled", "drafts", "all", "spam", "trash"] as const;
  return (
    <>
      <h3 className="pt-6 font-sans text-sm font-medium text-fg">System labels</h3>
      <div className="mt-2 divide-y divide-line border-y border-line">
        {sys.map((f) => (
          <div key={f} className="flex h-11 items-center gap-3 font-body text-sm">
            <Icon name={FOLDER_META[f].icon as "inbox"} size={18} className="text-icon" />
            <span className="flex-1 text-fg">{FOLDER_META[f].name}</span>
            <span className="text-xs text-fg-3 tabular-nums">{folderCount(s, f) || ""}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <h3 className="font-sans text-sm font-medium text-fg">Labels</h3>
        <Button variant="tonal" icon="add" onClick={() => ui().set({ labelDialog: {} })}>Create new label</Button>
      </div>
      <div className="mt-3 divide-y divide-line border-y border-line">
        {labels.map((l) => {
          const n = Object.values(s.threads).filter((t) => t.labels.includes(l.id)).length;
          return (
            <div key={l.id} className="flex min-h-12 flex-wrap items-center gap-3 py-2 font-body text-sm">
              <LabelChip name={l.name} color={l.color} />
              <span className="text-xs text-fg-3">{n} conversation{n === 1 ? "" : "s"}</span>
              <div className="ml-auto flex items-center gap-1">
                <Button variant="text" onClick={() => getMail().updateLabel(l.id, { hidden: !l.hidden })}>{l.hidden ? "Show" : "Hide"}</Button>
                <Button variant="text" onClick={() => ui().set({ labelDialog: { labelId: l.id } })}>Edit</Button>
                <Button
                  variant="text"
                  className="text-danger"
                  onClick={() =>
                    ui().set({
                      confirm: {
                        title: `Remove label “${l.name}”?`,
                        body: "Conversations with this label will not be deleted.",
                        confirmLabel: "Remove",
                        danger: true,
                        onConfirm: () => getMail().deleteLabel(l.id),
                      },
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
        {!labels.length && <div className="py-6 text-center font-body text-sm text-fg-3">You have no labels yet.</div>}
      </div>
    </>
  );
}

function Inbox() {
  const s = useMail((st) => st.settings);
  const set = (p: Partial<Settings>) => getMail().updateSettings(p);
  const cats: [Exclude<Category, "primary">, string][] = [["promotions", "Promotions"], ["social", "Social"], ["updates", "Updates"], ["forums", "Forums"]];
  return (
    <>
      <Row title="Inbox type">
        <Choice name="it" value={s.inboxType} onChange={(v) => set({ inboxType: v })} options={[["default", "Default"], ["important", "Important first"], ["unread", "Unread first"], ["starred", "Starred first"]]} />
      </Row>
      <Row title="Categories" hint="Choose which message categories to show as inbox tabs. Other messages will appear in Primary." >
        <Toggle checked onChange={() => {}}>
          <span className="text-fg-3">Primary</span>
        </Toggle>
        {cats.map(([k, l]) => (
          <Toggle key={k} checked={s.categories[k]} onChange={(v) => set({ categories: { ...s.categories, [k]: v } })}>
            {l}
          </Toggle>
        ))}
      </Row>
      <Row title="Reading pane">
        <Choice name="rp" value={s.readingPane} onChange={(v) => set({ readingPane: v })} options={[["none", "No split"], ["right", "Right of inbox"], ["below", "Below inbox"]]} />
      </Row>
      <Row title="Importance markers">
        <Choice name="im" value={s.importanceMarkers} onChange={(v) => set({ importanceMarkers: v })} options={[[true, "Show markers"], [false, "No markers"]]} />
      </Row>
    </>
  );
}

function Accounts() {
  const account = useMail((s) => s.account);
  const [name, setName] = useState(account.name);
  const colors = ["#0b57d0", "#1e8e3e", "#d93025", "#e37400", "#9334e6", "#00796b", "#c2185b", "#5f6368"];
  return (
    <>
      <Row title="Your account">
        <div className="flex items-center gap-4">
          <Avatar name={account.name} email={account.email} size={56} color={account.color} />
          <div>
            <div className="font-sans text-base text-fg">{account.name}</div>
            <div className="text-fg-2">{account.email}</div>
          </div>
        </div>
      </Row>
      <Row title="Send mail as" hint="The name recipients see.">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            getMail().updateAccount({ name: name.trim() });
            ui().showToast({ message: "Your name was updated." });
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" className="h-9 w-64 rounded-md border border-outline bg-surface px-3 text-sm text-fg outline-none focus:border-2 focus:border-primary" />
          <Button type="submit" variant="tonal" disabled={!name.trim() || name.trim() === account.name}>Save</Button>
        </form>
      </Row>
      <Row title="Profile color">
        <div className="flex gap-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use color ${c}`}
              aria-pressed={account.color === c}
              onClick={() => getMail().updateAccount({ color: c })}
              className={cn("size-8 rounded-full", account.color === c && "ring-2 ring-fg ring-offset-2 ring-offset-surface")}
              style={{ background: c }}
            />
          ))}
        </div>
      </Row>
    </>
  );
}

function Filters() {
  const filters = useMail((s) => s.filters);
  const labels = useMail((s) => s.labels);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const describe = (a: (typeof filters)[number]["actions"]) =>
    [
      a.skipInbox && "Skip Inbox",
      a.markRead && "Mark as read",
      a.star && "Star it",
      a.important && "Mark as important",
      a.trash && "Delete it",
      a.label && `Apply label “${labels.find((l) => l.id === a.label)?.name ?? "?"}”`,
    ]
      .filter(Boolean)
      .join(", ");
  return (
    <>
      <p className="py-5 font-body text-sm text-fg-2">Filters run on incoming mail. Matches use the same syntax as search, e.g. <code className="rounded bg-surface-2 px-1">from:news@ has:attachment</code>.</p>
      <div className="divide-y divide-line border-y border-line">
        {filters.map((f) => (
          <div key={f.id} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 py-2 font-body text-sm">
            <div className="min-w-0 flex-1">
              <div className="text-fg">
                Matches: <b className="font-medium">{f.query}</b>
              </div>
              <div className="text-xs text-fg-3">Do this: {describe(f.actions) || "Nothing"}</div>
            </div>
            <Button variant="text" onClick={() => navigate(`search/${encodeURIComponent(f.query)}`)}>Test</Button>
            <Button variant="text" className="text-danger" onClick={() => getMail().deleteFilter(f.id)}>Delete</Button>
          </div>
        ))}
        {!filters.length && <div className="py-6 text-center font-body text-sm text-fg-3">No filters yet.</div>}
      </div>
      <form
        className="mt-6 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) setOpen(true);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="from:billing@ subject:invoice" aria-label="Filter criteria" className="h-9 w-80 max-w-full rounded-md border border-outline bg-surface px-3 text-sm text-fg outline-none focus:border-2 focus:border-primary" />
        <Button type="submit" variant="tonal" icon="filter_alt" disabled={!q.trim()}>Create a new filter</Button>
      </form>
      <FilterDialog open={open} onOpenChange={(v) => (setOpen(v), !v && setQ(""))} query={q.trim()} />
    </>
  );
}

function Advanced() {
  const storage = useStorage();
  const exportData = () => {
    const { threads, messages, labels, contacts, tasks, filters, settings, account } = getMail();
    downloadBlob(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), account, labels, contacts, threads, messages, tasks, filters, settings }, null, 2)], { type: "application/json" }), "mailbox-export.json");
  };
  return (
    <>
      <Row title="Offline" hint="Everything — mail, drafts, labels, settings and uploaded attachments — is stored in this browser and works without a connection.">
        <div className="flex items-center gap-2 text-fg-2">
          <Icon name="offline_pin" size={18} className="text-[#188038]" /> Using {formatBytes(storage.used)} on this device
        </div>
      </Row>
      <Row title="Export" hint="Download a JSON copy of the mailbox.">
        <div>
          <Button variant="outlined" icon="download" onClick={exportData}>Export mailbox</Button>
        </div>
      </Row>
      <Row title="Search history">
        <div>
          <Button variant="outlined" icon="history" onClick={() => (getMail().clearRecentSearches(), ui().showToast({ message: "Search history cleared." }))}>Clear recent searches</Button>
        </div>
      </Row>
      <Row title="Reset" hint="Restore the original demo mailbox. Your changes, drafts and uploads will be lost.">
        <div>
          <Button
            variant="danger"
            icon="restart_alt"
            onClick={() =>
              ui().set({
                confirm: {
                  title: "Reset demo mailbox?",
                  body: "All mail, labels, drafts and settings will return to their original state.",
                  confirmLabel: "Reset",
                  danger: true,
                  onConfirm: () => {
                    getMail().reset();
                    navigate("inbox");
                    ui().showToast({ message: "Mailbox reset." });
                  },
                },
              })
            }
          >
            Reset mailbox
          </Button>
        </div>
      </Row>
    </>
  );
}

export function SettingsPage({ tab }: { tab: string }) {
  const isMobile = useIsMobile();
  const t = TABS.some(([k]) => k === tab) ? tab : "general";
  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Settings">
      <div className="flex h-14 shrink-0 items-center gap-2 px-2 md:px-6">
        {isMobile && <IconButton icon="arrow_back" label="Back to inbox" onClick={() => navigate("inbox")} />}
        <h2 className="font-sans text-[22px] text-fg">Settings</h2>
      </div>
      <nav className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 md:px-6" role="tablist">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={t === k}
            onClick={() => navigate(`settings/${k}`, true)}
            className={cn("relative h-11 shrink-0 px-4 font-sans text-sm", t === k ? "font-medium text-primary" : "text-fg-2 hover:bg-hover")}
          >
            {l}
            {t === k && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-primary" />}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-16 md:px-6">
        <div className="max-w-[920px]">
          {t === "general" && <General />}
          {t === "labels" && <Labels />}
          {t === "inbox" && <Inbox />}
          {t === "accounts" && <Accounts />}
          {t === "filters" && <Filters />}
          {t === "advanced" && <Advanced />}
        </div>
      </div>
    </section>
  );
}
