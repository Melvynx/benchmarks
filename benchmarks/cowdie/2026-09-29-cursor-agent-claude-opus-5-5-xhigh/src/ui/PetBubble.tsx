import { create } from "zustand";
import { needOf, useGame, type Need } from "../game/store";
import { bubble } from "../game/runtime";
import {
  IconBall,
  IconBolt,
  IconBubbles,
  IconDizzy,
  IconHeart,
  IconLeaf,
  IconPill,
  IconPoop,
  IconSparkle,
  IconStar,
} from "./icons";

export interface Emote {
  text?: string;
  icon?: "heart" | "star" | "sparkle" | "dizzy";
  key?: number;
}

export const useEmote = create<{ emote: Emote | null }>(() => ({ emote: null }));

const NEED_ICON: Record<NonNullable<Need>, { icon: React.ReactElement; color: string; label: string }> = {
  hunger: { icon: <IconLeaf size={22} />, color: "#f39a2e", label: "Hungry" },
  happy: { icon: <IconBall size={22} />, color: "#ff5d99", label: "Bored" },
  energy: { icon: <IconBolt size={22} />, color: "#6a8dff", label: "Sleepy" },
  hygiene: { icon: <IconBubbles size={22} />, color: "#37b9b0", label: "Dirty" },
  health: { icon: <IconPill size={22} />, color: "#e2536f", label: "Unwell" },
  sick: { icon: <IconPill size={22} />, color: "#e2536f", label: "Sick" },
  poop: { icon: <IconPoop size={22} />, color: "#9a6a48", label: "Messy" },
};

const EMOTE_ICON = {
  heart: { el: <IconHeart size={24} />, color: "#ff4f8a" },
  star: { el: <IconStar size={24} />, color: "#ffb400" },
  sparkle: { el: <IconSparkle size={24} />, color: "#38b6ff" },
  dizzy: { el: <IconDizzy size={24} />, color: "#8a6cff" },
};

export function PetBubble({ emote, need }: { emote: Emote | null; need: Need }) {
  if (emote) {
    if (emote.icon) {
      const e = EMOTE_ICON[emote.icon];
      return (
        <div key={emote.key} className="pet-bubble pet-bubble--icon" style={{ color: e.color }}>
          {e.el}
        </div>
      );
    }
    return (
      <div key={emote.key} className="pet-bubble pet-bubble--text">
        {emote.text}
      </div>
    );
  }
  if (need) {
    const n = NEED_ICON[need];
    return (
      <div key={need} className="pet-bubble pet-bubble--need" style={{ color: n.color }} title={n.label}>
        {n.icon}
      </div>
    );
  }
  return null;
}

export function BubbleLayer() {
  const emote = useEmote((s) => s.emote);
  const need = useGame((s) => needOf(s));
  const asleep = useGame((s) => s.asleep);
  const hatched = useGame((s) => s.hatched);
  if (!hatched) return null;
  return (
    <div
      className="bubble-anchor"
      ref={(el) => {
        bubble.el = el;
      }}
    >
      <PetBubble emote={asleep ? null : emote} need={need} />
    </div>
  );
}
