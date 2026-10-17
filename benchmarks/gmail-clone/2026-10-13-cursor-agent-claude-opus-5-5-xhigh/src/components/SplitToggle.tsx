import { useMail, getMail } from "../lib/store";
import type { ReadingPane } from "../lib/types";
import { Icon, Menu, MenuContent, MenuRadio, MenuRadioGroup, MenuTrigger, Tip, MenuLabel } from "./ui";

export function SplitToggle() {
  const pane = useMail((s) => s.settings.readingPane);
  const icon = pane === "right" ? "vertical_split" : pane === "below" ? "horizontal_split" : "view_agenda";
  return (
    <Menu>
      <Tip label="Toggle split pane mode">
        <MenuTrigger asChild>
          <button type="button" aria-label="Toggle split pane mode" className="inline-flex h-10 items-center rounded-full pl-2 pr-1 text-icon hover:bg-hover data-[state=open]:bg-hover-strong max-[900px]:hidden">
            <Icon name={icon} size={20} />
            <Icon name="arrow_drop_down" size={18} />
          </button>
        </MenuTrigger>
      </Tip>
      <MenuContent align="end" className="w-48">
        <MenuLabel>Reading pane</MenuLabel>
        <MenuRadioGroup value={pane} onValueChange={(v) => getMail().updateSettings({ readingPane: v as ReadingPane })}>
          <MenuRadio value="none">No split</MenuRadio>
          <MenuRadio value="right">Vertical split</MenuRadio>
          <MenuRadio value="below">Horizontal split</MenuRadio>
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
