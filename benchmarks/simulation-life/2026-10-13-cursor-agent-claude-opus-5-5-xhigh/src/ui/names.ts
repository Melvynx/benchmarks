import type { Action, Blob } from "../sim/simulation";

const SYL = ["bo", "pi", "lu", "mo", "ki", "na", "to", "bu", "ri", "pa", "mi", "zu", "fi", "no", "ta", "be", "ju", "la", "po", "ni", "wa", "so", "du", "ke"];

export function blobName(id: number): string {
  let h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  const a = SYL[h % SYL.length];
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  const b = SYL[h % SYL.length];
  const name = a + b + (h % 3 === 0 ? a.slice(-1) : "");
  return name[0].toUpperCase() + name.slice(1);
}

export const ACTION_LABEL: Record<Action, string> = {
  wander: "Wandering",
  seek: "Going for fruit",
  remember: "Heading to a remembered tree",
  eat: "Eating",
  flee: "Escaping a red",
  shade: "Resting in the shade",
  crowd: "Avoiding a crowd",
  hunt: "Chasing a blue",
  rest: "Happy pause",
  tired: "Catching its breath",
};

export function actionDetail(b: Blob): string {
  switch (b.action) {
    case "wander":
      return b.kind === 0 ? "No ripe fruit in sight, so it strolls around looking." : "No blues in sight, so it roams slowly to save energy.";
    case "seek":
      return "Spotted a tree with ripe fruit and is hopping over.";
    case "remember":
      return "Nothing in view, so it is going back to a tree where it ate before.";
    case "eat":
      return "Chewing a fruit. It cannot run while eating, so it is easy to catch.";
    case "flee":
      return "A red is close or chasing it, so it bolts the other way.";
    case "shade":
      return "Fed enough to wait under the leaves, where reds only notice it up close.";
    case "crowd":
      return "Too many blues nearby, so it spreads out.";
    case "hunt":
      return "Locked onto the nearest visible blue. Gives up after 5 seconds.";
    case "rest":
      return "Just booped a blue and gained energy. Resting before hunting again.";
    case "tired":
      return "Gave up a long chase and is ignoring blues for a moment.";
  }
}
