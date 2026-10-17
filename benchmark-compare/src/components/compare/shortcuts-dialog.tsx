import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

const SECTIONS: Array<{ title: string; keys: Array<[string[], string]> }> = [
  {
    title: "Anywhere",
    keys: [
      [["⌘", "K"], "Search runs, tasks, and apps"],
      [["/"], "Search"],
      [["["], "Older run"],
      [["]"], "Newer run"],
      [["⌘", "B"], "Toggle the sidebar"],
      [["M"], "Compare mode: clicks pick apps"],
      [["?"], "These shortcuts"],
    ],
  },
  {
    title: "Picking apps",
    keys: [
      [["Click"], "Open an app full size"],
      [["☐"], "Pick it for a comparison (then clicks pick)"],
      [["C"], "Compare the picked apps"],
      [["Esc"], "Clear the picks / leave compare mode"],
    ],
  },
  {
    title: "Comparing",
    keys: [
      [["1", "–", "6"], "Focus one app, again to restore"],
      [["←", "→"], "Previous or next task, same models"],
      [["S"], "Auto-scroll every app"],
      [["R"], "Reload every app"],
      [["L"], "Cycle the layout"],
      [["Esc"], "Back"],
    ],
  },
]

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(44rem,calc(100vw-2rem))] p-5">
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription className="mt-1">
          Everything is one key away. Shortcuts pause while you type.
        </DialogDescription>
        <div className="mt-5 grid min-h-0 gap-6 overflow-y-auto sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.title} className={section.title === "Anywhere" ? "sm:row-span-2" : undefined}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">{section.title}</h3>
              <dl className="flex flex-col gap-1.5">
                {section.keys.map(([keys, label]) => (
                  <div key={label} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-foreground/90">{label}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {keys.map((key) =>
                        key === "–" ? (
                          <span key={key} className="text-muted-foreground">–</span>
                        ) : (
                          <kbd
                            key={key}
                            className="min-w-6 rounded-md border bg-muted/50 px-1.5 py-0.5 text-center font-mono text-[11px]"
                          >
                            {key}
                          </kbd>
                        )
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
