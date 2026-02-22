import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { addCredits, upsertSubscription } from "@/lib/store";
import { SUBSCRIPTION_PLANS } from "@/lib/types";

function getSubPeriodEnd(sub: { items: { data: Array<{ current_period_end: number }> } }): Date {
  const firstItem = sub.items.data[0];
  return firstItem
    ? new Date(firstItem.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function getSubPriceId(sub: { items: { data: Array<{ price?: { id: string } }> } }): string {
  return sub.items.data[0]?.price?.id ?? "";
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // --- One-time credit pack purchase ---
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.metadata?.type !== "pack") break;

        const userId = session.metadata.userId;
        const credits = parseInt(session.metadata.credits || "0", 10);
        const packId = session.metadata.packId || "unknown";

        if (userId && credits) {
          await addCredits(
            userId,
            credits,
            `Achat pack ${packId} (${credits} crédits)`,
            session.id
          );
          console.log(`Pack credits added: ${credits} for user ${userId}`);
        }
        break;
      }

      // --- Subscription created or updated ---
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const metadata = sub.metadata || {};
        const userId = metadata.userId;
        const planId = metadata.planId;

        if (!userId || !planId) {
          console.error("Missing subscription metadata:", sub.id);
          break;
        }

        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);

        await upsertSubscription({
          userId,
          stripeSubscriptionId: sub.id,
          stripePriceId: getSubPriceId(sub),
          planId,
          status: sub.status,
          creditsPerPeriod: plan?.creditsPerMonth ?? parseInt(metadata.creditsPerMonth || "0", 10),
          currentPeriodEnd: getSubPeriodEnd(sub),
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        });

        console.log(`Subscription ${event.type}: ${sub.id} for user ${userId}`);
        break;
      }

      // --- Subscription cancelled/deleted ---
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const metadata = sub.metadata || {};
        const userId = metadata.userId;
        const planId = metadata.planId;

        if (userId) {
          await upsertSubscription({
            userId,
            stripeSubscriptionId: sub.id,
            stripePriceId: getSubPriceId(sub),
            planId: planId || "unknown",
            status: "canceled",
            creditsPerPeriod: 0,
            currentPeriodEnd: getSubPeriodEnd(sub),
            cancelAtPeriodEnd: false,
          });
          console.log(`Subscription canceled: ${sub.id} for user ${userId}`);
        }
        break;
      }

      // --- Monthly invoice paid → add credits ---
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subDetails = invoice.parent?.subscription_details;

        if (!subDetails) break;

        const subRef = subDetails.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;

        if (!subId) break;

        const isFirstPayment = invoice.billing_reason === "subscription_create";
        const isRenewal = invoice.billing_reason === "subscription_cycle";

        if (!isFirstPayment && !isRenewal) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const metadata = sub.metadata || {};
        const userId = metadata.userId;
        const creditsPerMonth = parseInt(metadata.creditsPerMonth || "0", 10);

        if (userId && creditsPerMonth) {
          const desc = isFirstPayment
            ? `Abonnement ${metadata.planId} — ${creditsPerMonth} crédits (premier mois)`
            : `Renouvellement ${metadata.planId} — ${creditsPerMonth} crédits`;

          await addCredits(userId, creditsPerMonth, desc, invoice.id);
          console.log(`Subscription credits: ${creditsPerMonth} for user ${userId} (${invoice.billing_reason})`);
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
