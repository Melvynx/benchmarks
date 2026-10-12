import type { Rng } from "./rng";
import type { Species } from "./types";

const BLUE_HEADS = ["Blu", "Pip", "Mo", "Lu", "Bo", "Nim", "Dew", "Sky", "Tib", "Pu", "Mi", "Oli", "Zu", "Wim"];
const RED_HEADS = ["Ru", "Pep", "Ki", "Zin", "Ember", "Roo", "Chi", "Tam", "Bix", "Rhu", "Fig", "Cay", "Jam", "Pom"];
const TAILS = ["bo", "py", "li", "mo", "chi", "ssa", "ko", "bean", "bun", "ni", "do", "po", "ru", "zzle", "mi", "nut"];

export function blobName(rng: Rng, species: Species): string {
  const head = rng.pick(species === "blue" ? BLUE_HEADS : RED_HEADS);
  return head + rng.pick(TAILS);
}
