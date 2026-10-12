import type { Sample } from "./types.ts";

function avg(values: number[]) {
  if (!values.length) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

function extent(values: number[]) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!values.length) return { lo: 0, hi: 0 };
  return { lo, hi };
}

function slope(values: number[]) {
  const n = values.length;
  if (n < 2) return 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += i;
    sy += values[i];
    sxx += i * i;
    sxy += i * values[i];
  }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx + 1e-9);
}

function correlation(a: number[], b: number[], lag: number) {
  const n = Math.min(a.length, b.length) - lag;
  if (n < 8) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i += 1) {
    ma += a[i];
    mb += b[i + lag];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    const xa = a[i] - ma;
    const yb = b[i + lag] - mb;
    num += xa * yb;
    da += xa * xa;
    db += yb * yb;
  }
  return num / Math.sqrt(da * db + 1e-9);
}

export function summarize(history: Sample[], fruitCap: number): string[] {
  if (history.length < 6) return ["The garden is just getting started."];
  const blue = history.map((s) => s.blue);
  const red = history.map((s) => s.red);
  const fruit = history.map((s) => s.fruit);
  const pop = history.map((s) => s.blue + s.red);
  const blueEx = extent(blue);
  const redEx = extent(red);
  const tail = history.slice(Math.floor(history.length * 0.75));
  const blueEnd = avg(tail.map((s) => s.blue));
  const redEnd = avg(tail.map((s) => s.red));
  const meanPop = avg(pop);
  const maxPop = extent(pop).hi;
  const meanFruit = avg(fruit);
  const lines: string[] = [];

  const blueGone = blueEnd < 0.6 && blueEx.hi >= 4;
  const redGone = redEnd < 0.6 && redEx.hi >= 4;
  if (blueGone && redGone) {
    lines.push("Both groups faded, and the dish settled into a quieter garden.");
  } else if (blueGone || redGone) {
    lines.push("One group faded and the world settled into a simpler state.");
  }

  const cap = Math.max(1, fruitCap);
  if (meanPop <= 12 && maxPop <= 16 && meanFruit <= Math.min(8, cap * 0.85)) {
    lines.push("Low fruit kept the garden small.");
  }

  const zero = correlation(blue, red, 0);
  let bestLag = 0;
  let best = -2;
  const maxLag = Math.min(80, Math.floor(history.length / 3));
  for (let lag = 2; lag <= maxLag; lag += 1) {
    const corr = correlation(blue, red, lag);
    if (corr > best) {
      best = corr;
      bestLag = lag;
    }
  }
  const lagSeconds = bestLag * 0.5;
  if (
    blueEx.hi - blueEx.lo >= 4 &&
    redEx.hi - redEx.lo >= 3 &&
    best >= 0.35 &&
    best > zero + 0.08 &&
    lagSeconds >= 4
  ) {
    lines.push("Blue blobs grew first, then red blobs followed.");
  }

  const lateAlive = tail.filter((s) => s.blue >= 2 && s.red >= 2).length / Math.max(1, tail.length);
  const tailPop = tail.map((s) => s.blue + s.red);
  const stillExploding = slope(tailPop) > 0.25;
  const head = history.slice(0, Math.max(1, Math.floor(history.length * 0.25)));
  const headPop = avg(head.map((s) => s.blue + s.red));
  const latePop = avg(tailPop);
  const stillGrowing = latePop > headPop * 1.7;
  if (
    history.length >= 70 &&
    !blueGone &&
    !redGone &&
    !stillExploding &&
    !stillGrowing &&
    lateAlive > 0.7 &&
    meanPop > 12 &&
    blueEx.hi - blueEx.lo >= 3 &&
    redEx.hi - redEx.lo >= 2
  ) {
    lines.push("The garden stayed balanced.");
  }

  if (!lines.length) {
    const last = history[history.length - 1];
    lines.push(
      `Fruit is at ${last.fruit.toFixed(1)}, with ${last.blue} blue blobs and ${last.red} red blobs.`,
    );
  }
  return lines.slice(0, 3);
}
