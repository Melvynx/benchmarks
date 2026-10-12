/** Shared Tailwind class strings so surfaces, inputs and badges stay consistent. */

export const CARD =
  "rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-stone-800 dark:bg-stone-900";

export const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900";

export const INPUT =
  "h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 transition focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/20 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500";

export const SELECT = `${INPUT} appearance-none pr-9 tabular-nums`;

export const ICON_BUTTON = `inline-flex size-7 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 ${FOCUS_RING}`;

export const REF_BADGE =
  "inline-flex items-center rounded-md bg-stone-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wider text-white dark:bg-stone-100 dark:text-stone-900";

export const RANGE_CHIP =
  "inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium tabular-nums text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30";

export const WARNING =
  "flex items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/25";
