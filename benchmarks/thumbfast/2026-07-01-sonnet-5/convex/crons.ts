/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const internalApi = internal as any;
const crons = cronJobs();

crons.daily(
  "refill yearly subscription credits",
  { hourUTC: 9, minuteUTC: 0 },
  internalApi.credits.refillYearlySubscriptionCredits,
);

export default crons;
