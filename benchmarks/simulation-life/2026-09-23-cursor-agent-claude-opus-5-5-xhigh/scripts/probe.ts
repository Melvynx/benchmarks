import { presetParams, type Params } from "../src/sim/params";
import { createWorld, step } from "../src/sim/world";

const args = process.argv.slice(2);
const cfg: Partial<Params> = JSON.parse(args[0] ?? "{}");
const until = Number(args[1] ?? "120");
const w = createWorld({ ...presetParams(args[2] ?? "balanced"), ...cfg });
const fadeCause: Record<string, number> = {};

const caughtIn: Record<string, number> = {};
let tired = 0;
let chases = 0;
const prevAction = new Map<number, string>();
let births = 0;
let fades = 0;
let window = 0;

while (w.time < until) {
  const before = new Map(w.blobs.map((b) => [b.id, b.action]));
  step(w);
  for (const e of w.events) {
    if (e.type === "contact") {
      const s = before.get(e.blueId) ?? "?";
      caughtIn[s] = (caughtIn[s] ?? 0) + 1;
    }
    if (e.type === "birth" && e.species === "blue") births++;
    if (e.type === "fade" && e.species === "blue") {
      fades++;
      fadeCause[e.cause] = (fadeCause[e.cause] ?? 0) + 1;
    }
  }
  w.events.length = 0;
  for (const b of w.blobs) {
    if (b.species !== "red") continue;
    const prev = prevAction.get(b.id);
    if (b.action === "chase" && prev !== "chase") chases++;
    if (b.action === "tired" && prev !== "tired") tired++;
    prevAction.set(b.id, b.action);
  }
  window += 1 / 20;
  if (window >= 20) {
    window = 0;
    console.log(
      `t${w.time.toFixed(0)} blue ${w.counts.blue} red ${w.counts.red} fruit ${w.counts.fruit} | blue births ${births} fades ${fades} ${JSON.stringify(fadeCause)} | chases ${chases} tired ${tired} caught ${JSON.stringify(caughtIn)} | sheltered ${w.blobs.filter((b) => b.sheltered).length}`,
    );
    births = 0;
    fades = 0;
  }
}
