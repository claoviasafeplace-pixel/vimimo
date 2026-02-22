/**
 * Setup Stripe products & prices for VIMIMO
 * Run: node scripts/setup-stripe.mjs
 *
 * Creates:
 * - 3 one-time credit packs (Essentiel, Standard, Pro)
 * - 3 monthly subscription plans (Starter, Pro, Agency)
 * - 1 webhook endpoint
 */

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY. Run with:");
  console.error(
    "  STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe.mjs"
  );
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const PACKS = [
  {
    id: "essential",
    name: "VIMIMO — Pack Essentiel",
    description: "3 crédits de staging IA",
    amount: 2499, // €24.99
  },
  {
    id: "standard",
    name: "VIMIMO — Pack Standard",
    description: "10 crédits de staging IA",
    amount: 6999, // €69.99
  },
  {
    id: "pro_pack",
    name: "VIMIMO — Pack Pro",
    description: "25 crédits de staging IA",
    amount: 14999, // €149.99
  },
];

const PLANS = [
  {
    id: "starter",
    name: "VIMIMO — Starter",
    description: "5 crédits / mois",
    amount: 2900, // €29/month
    credits: 5,
  },
  {
    id: "pro_sub",
    name: "VIMIMO — Pro",
    description: "15 crédits / mois",
    amount: 7900, // €79/month
    credits: 15,
  },
  {
    id: "agency",
    name: "VIMIMO — Agency",
    description: "50 crédits / mois",
    amount: 19900, // €199/month
    credits: 50,
  },
];

async function main() {
  console.log("Setting up Stripe products for VIMIMO...\n");

  // --- One-time packs ---
  console.log("=== Credit Packs (one-time) ===");
  for (const pack of PACKS) {
    const product = await stripe.products.create({
      name: pack.name,
      description: pack.description,
      metadata: { vimimo_type: "pack", vimimo_id: pack.id },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.amount,
      currency: "eur",
      metadata: { vimimo_type: "pack", vimimo_id: pack.id },
    });

    console.log(`  ✓ ${pack.name}`);
    console.log(`    Product: ${product.id}`);
    console.log(`    Price:   ${price.id} (${(pack.amount / 100).toFixed(2)}€)`);
    console.log();
  }

  // --- Subscriptions ---
  console.log("=== Subscription Plans (monthly) ===");
  for (const plan of PLANS) {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        vimimo_type: "subscription",
        vimimo_id: plan.id,
        credits_per_month: String(plan.credits),
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: "eur",
      recurring: { interval: "month" },
      metadata: {
        vimimo_type: "subscription",
        vimimo_id: plan.id,
        credits_per_month: String(plan.credits),
      },
    });

    console.log(`  ✓ ${plan.name}`);
    console.log(`    Product: ${product.id}`);
    console.log(`    Price:   ${price.id} (${(plan.amount / 100).toFixed(2)}€/mois)`);
    console.log();
  }

  console.log("=== Done ===");
  console.log(
    "\nNote: Product prices are created dynamically at checkout (price_data),\nso these products are created for dashboard reference only."
  );
  console.log(
    "\nNext steps:"
  );
  console.log(
    "  1. Go to https://dashboard.stripe.com/webhooks"
  );
  console.log(
    "  2. Add endpoint: https://YOUR_DOMAIN/api/webhook/stripe"
  );
  console.log(
    "  3. Select events:"
  );
  console.log(
    "     - checkout.session.completed"
  );
  console.log(
    "     - customer.subscription.created"
  );
  console.log(
    "     - customer.subscription.updated"
  );
  console.log(
    "     - customer.subscription.deleted"
  );
  console.log(
    "     - invoice.payment_succeeded"
  );
  console.log(
    "  4. Copy the webhook signing secret (whsec_...) to STRIPE_WEBHOOK_SECRET in .env.local"
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
