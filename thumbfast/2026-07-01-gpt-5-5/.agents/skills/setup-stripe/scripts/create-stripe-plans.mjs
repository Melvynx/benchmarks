#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const setConvexEnv = args.includes("--set-convex-env");

function usage() {
  console.error(
    "Usage: node .agents/skills/setup-stripe/scripts/create-stripe-plans.mjs [--dry-run] [--set-convex-env]",
  );
  process.exit(1);
}

function fail(message) {
  console.error(`[setup-stripe] ERROR: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[setup-stripe] ${message}`);
}

if (args.includes("--help") || args.includes("-h")) usage();

function convexEnvGet(key) {
  try {
    const out = execFileSync("pnpm", ["exec", "convex", "env", "get", key], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

function convexEnvSet(key, value) {
  if (dryRun) {
    log(`would set Convex env ${key}=${value}`);
    return;
  }

  execFileSync("pnpm", ["exec", "convex", "env", "set", key, value], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function normalizeName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultEnvName(planName, annual = false) {
  const token = normalizeName(planName).replace(/-/g, "_").toUpperCase();
  return annual ? `STRIPE_${token}_YEARLY_PLAN_ID` : `STRIPE_${token}_PLAN_ID`;
}

function parseMoney(value, field, planName) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    fail(`invalid ${field} for plan "${planName}"`);
  }
  return Math.round(amount * 100);
}

function loadPlansFromCode() {
  const code = [
    'import { BILLING_PLANS } from "./convex/billing/plans.ts";',
    "console.log(JSON.stringify(BILLING_PLANS));",
  ].join("\n");

  let parsed;
  try {
    const out = execFileSync("pnpm", ["exec", "tsx", "--eval", code], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    parsed = JSON.parse(out);
  } catch (error) {
    fail(`failed to load convex/billing/plans.ts: ${error.message}`);
  }

  const plans = parsed;
  if (!Array.isArray(plans) || plans.length === 0) {
    fail("convex/billing/plans.ts must export a non-empty BILLING_PLANS array");
  }

  return plans
    .map((plan) => ({
      ...plan,
      name: normalizeName(plan.name),
      currency: String(plan.currency ?? "USD").toLowerCase(),
      monthlyPrice: plan.price,
      stripePriceEnv: plan.stripePriceEnv ?? defaultEnvName(plan.name, false),
      stripeAnnualPriceEnv:
        plan.yearlyPrice === undefined || plan.yearlyPrice === null || plan.yearlyPrice <= 0
          ? undefined
          : (plan.stripeAnnualPriceEnv ?? defaultEnvName(plan.name, true)),
    }))
    .filter((plan) => parseMoney(plan.monthlyPrice, "price", plan.name) > 0)
    .map((plan) => {
      if (!plan.stripePriceEnv) {
        fail(`paid plan "${plan.name}" is missing stripePriceEnv`);
      }

      if (plan.yearlyPrice > 0 && !plan.stripeAnnualPriceEnv) {
        fail(`paid plan "${plan.name}" is missing stripeAnnualPriceEnv`);
      }

      return plan;
    });
}

function getPlanOutputs(plan) {
  const outputs = [[plan.stripePriceEnv, `dry_price_${plan.name}_month`]];

  if (plan.yearlyPrice !== undefined && plan.yearlyPrice !== null) {
    outputs.push([
      plan.stripeAnnualPriceEnv,
      `dry_price_${plan.name}_year`,
    ]);
  }

  return outputs;
}

async function findProduct(stripe, plan) {
  for await (const product of stripe.products.list({ limit: 100 })) {
    if (product.metadata?.nowstack_plan === plan.name) {
      return product;
    }
  }

  return null;
}

async function ensureProduct(stripe, plan) {
  const productName = plan.productName ?? plan.name;
  const existing = await findProduct(stripe, plan);

  if (existing) {
    if (dryRun) {
      log(`would reuse product ${existing.id} for ${plan.name}`);
      return existing;
    }

    return stripe.products.update(existing.id, {
      name: productName,
      description: plan.description,
      metadata: {
        ...existing.metadata,
        nowstack_managed: "true",
        nowstack_plan: plan.name,
      },
    });
  }

  if (dryRun) {
    log(`would create product for ${plan.name}`);
    return { id: `dry_product_${plan.name}`, metadata: {} };
  }

  return stripe.products.create({
    name: productName,
    description: plan.description,
    metadata: {
      nowstack_managed: "true",
      nowstack_plan: plan.name,
    },
  });
}

async function findPrice(stripe, productId, planName, interval, amount, currency) {
  for await (const price of stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  })) {
    if (
      price.metadata?.plan === planName &&
      price.recurring?.interval === interval &&
      price.unit_amount === amount &&
      price.currency === currency
    ) {
      return price;
    }
  }

  return null;
}

async function ensurePrice(stripe, product, plan, interval, amount) {
  const existing = await findPrice(
    stripe,
    product.id,
    plan.name,
    interval,
    amount,
    plan.currency,
  );

  if (existing) {
    log(`reused ${interval} price ${existing.id} for ${plan.name}`);
    return existing;
  }

  if (dryRun) {
    const id = `dry_price_${plan.name}_${interval}`;
    log(
      `would create ${interval} price for ${plan.name}: ${amount} cents ${plan.currency}`,
    );
    return { id };
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: plan.currency,
    recurring: { interval },
    nickname: `${plan.name} ${interval}`,
    metadata: {
      nowstack_managed: "true",
      plan: plan.name,
      interval,
    },
  });

  log(`created ${interval} price ${price.id} for ${plan.name}`);
  return price;
}

const plans = loadPlansFromCode();

if (dryRun) {
  for (const plan of plans) {
    const monthlyAmount = parseMoney(plan.monthlyPrice, "monthlyPrice", plan.name);
    log(
      `would ensure product and monthly price for ${plan.name}: ${monthlyAmount} cents ${plan.currency}`,
    );

    if (plan.yearlyPrice !== undefined && plan.yearlyPrice !== null) {
      const yearlyAmount = parseMoney(plan.yearlyPrice, "yearlyPrice", plan.name);
      log(
        `would ensure yearly price for ${plan.name}: ${yearlyAmount} cents ${plan.currency}`,
      );
    }

    for (const [key, value] of getPlanOutputs(plan)) {
      console.log(`${key}=${value}`);
      if (setConvexEnv) {
        log(`would set Convex env ${key}=${value}`);
      }
    }
  }

  process.exit(0);
}

const stripeSecret =
  process.env.STRIPE_SECRET_KEY || convexEnvGet("STRIPE_SECRET_KEY");

if (!stripeSecret) {
  fail("STRIPE_SECRET_KEY is not available in process env or Convex env");
}

if (stripeSecret.startsWith("sk_live_") && !process.env.SETUP_STRIPE_LIVE_CONFIRMED) {
  fail(
    "live key detected. Set SETUP_STRIPE_LIVE_CONFIRMED=1 only after the user explicitly confirms live Stripe creation",
  );
}

let Stripe;
try {
  ({ default: Stripe } = await import("stripe"));
} catch (error) {
  fail(`failed to load stripe sdk: ${error.message}`);
}

const stripe = new Stripe(stripeSecret);
const outputs = [];

for (const plan of plans) {
  const monthlyAmount = parseMoney(plan.monthlyPrice, "monthlyPrice", plan.name);
  const yearlyAmount =
    plan.yearlyPrice === undefined || plan.yearlyPrice === null
      ? null
      : parseMoney(plan.yearlyPrice, "yearlyPrice", plan.name);

  const product = await ensureProduct(stripe, plan);
  const monthly = await ensurePrice(
    stripe,
    product,
    plan,
    "month",
    monthlyAmount,
  );

  outputs.push([plan.stripePriceEnv, monthly.id]);

  if (yearlyAmount && plan.stripeAnnualPriceEnv) {
    const yearly = await ensurePrice(
      stripe,
      product,
      plan,
      "year",
      yearlyAmount,
    );
    outputs.push([plan.stripeAnnualPriceEnv, yearly.id]);
  }
}

for (const [key, value] of outputs) {
  console.log(`${key}=${value}`);
  if (setConvexEnv) {
    convexEnvSet(key, value);
  }
}
