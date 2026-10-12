import type { Snapshot, Totals } from "./sim.ts";

export interface Summary {
  lines: string[];
}

function argmax(hist: Snapshot[], key: "blue" | "red"): Snapshot {
  let best = hist[0];
  for (const s of hist) if (s[key] > best[key]) best = s;
  return best;
}

/** Turns recorded history into plain-language lines. Only reads recorded numbers. */
export function summarize(hist: Snapshot[], totals: Totals): Summary {
  const lines: string[] = [];
  if (hist.length < 30) {
    lines.push("Let it run for a minute to see the story.");
    return { lines };
  }
  const last = hist[hist.length - 1];
  const late = hist.slice(Math.floor(hist.length * 0.4));
  const pB = argmax(hist, "blue");
  const pR = argmax(hist, "red");
  const avgFruit = late.reduce((a, s) => a + s.fruit, 0) / late.length;
  const avgBlue = late.reduce((a, s) => a + s.blue, 0) / late.length;

  const startRed = hist[0].red;
  if (pR.red <= startRed) {
    lines.push(
      last.t < 300
        ? `Red has not grown past ${startRed} yet after ${Math.round(last.t)}s. It needs repeated contacts to fill up for children.`
        : `Red never grew past ${startRed}. Blue was too scarce to feed contacts.`,
    );
  }
  else if (pB.blue > hist[0].blue && pB.t + 1 < pR.t) lines.push(`Blue grew first (peak ${pB.blue} at ${Math.round(pB.t)}s), red followed (peak ${pR.red} at ${Math.round(pR.t)}s).`);
  else if (pR.t + 1 < pB.t) lines.push(`Red peaked first (${pR.red} at ${Math.round(pR.t)}s), blue recovered to ${pB.blue} at ${Math.round(pB.t)}s.`);

  // Count crossings of the group mean in the late window: a cheap oscillation test.
  const crossings = (key: "blue" | "red") => {
    const mean = late.reduce((a, s) => a + s[key], 0) / late.length;
    let n = 0;
    for (let i = 1; i < late.length; i++) if ((late[i][key] - mean) * (late[i - 1][key] - mean) < 0) n++;
    return n;
  };
  const alive = last.blue > 0 && last.red > 0;
  const cycles = Math.min(crossings("blue"), crossings("red")) / 2;
  if (alive && cycles >= 2) lines.push(`The garden stayed balanced: blue and red kept cycling out of phase (~${Math.round(cycles)} swings).`);
  else if (alive) lines.push("Both groups survived, but the waves have not settled into a clear rhythm yet.");

  if (avgFruit < 5 && avgBlue < 35) lines.push(`Low fruit kept the garden small: about ${avgFruit.toFixed(1)} fruit on average.`);
  if (last.red === 0 && pR.red > 0) lines.push("Red blobs faded out once blue became rare.");
  if (last.blue === 0 && pB.blue > 0) lines.push("Blue blobs collapsed. Fruit regrows, but no blue survived to use it.");
  if (last.blue === 0 && last.red === 0) lines.push("Both groups died out. Try another seed or a gentler red setting.");
  if (alive && late.every((s) => s.fruit === 0)) lines.push("Fruit stayed fully picked: blue was limited by food.");
  lines.push(`Fruit eaten ${totals.fruitEaten}, gentle contacts ${totals.contacts}.`);
  return { lines };
}
