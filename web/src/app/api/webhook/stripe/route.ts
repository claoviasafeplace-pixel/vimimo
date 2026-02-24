import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { addCredits, upsertSubscription, getUserByEmail, updateUser } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { SUBSCRIPTION_PLANS } from "@/lib/types";
import { nanoid } from "nanoid";

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

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    switch (event.type) {
      // --- Checkout completed (pack or subscription) ---
      case "checkout.session.completed": {
        const session = event.data.object;

        // For guest subscriptions, resolve user and attach userId to subscription metadata
        if (session.metadata?.type === "subscription" && session.metadata?.guest === "true") {
          const email = session.customer_details?.email;
          const customerId = typeof session.customer === "string" ? session.customer : null;
          const subId = typeof session.subscription === "string" ? session.subscription : null;

          if (email && customerId && subId) {
            let guestUserId: string | undefined;
            const existingUser = await getUserByEmail(email);
            if (existingUser) {
              guestUserId = existingUser.id;
              if (!existingUser.stripe_customer_id) {
                await updateUser(guestUserId, { stripe_customer_id: customerId });
              }
            } else {
              const newId = nanoid(12);
              const now = new Date().toISOString();
              const db = getSupabase();
              const { error } = await db.from("users").insert({
                id: newId,
                email,
                name: session.customer_details?.name ?? null,
                image: null,
                credits: 0,
                stripe_customer_id: customerId,
                created_at: now,
                updated_at: now,
              });
              if (!error) {
                guestUserId = newId;
                console.log(`Guest user created via checkout: ${guestUserId} (${email})`);
              }
            }

            if (guestUserId) {
              // Attach userId to subscription metadata for invoice.payment_succeeded
              await stripe.subscriptions.update(subId, {
                metadata: {
                  ...session.metadata,
                  userId: guestUserId,
                  guest: "",
                },
              });
              console.log(`Guest subscription ${subId} linked to user ${guestUserId}`);
            }
          }
          break;
        }

        if (session.metadata?.type !== "pack") break;

        const credits = parseInt(session.metadata.credits || "0", 10);
        const packId = session.metadata.packId || "unknown";
        let userId = session.metadata.userId;

        // Guest checkout: resolve or create user from Stripe email
        if (!userId && session.metadata.guest === "true") {
          const email = session.customer_details?.email;
          if (!email) {
            console.error("Guest checkout without email, skipping:", session.id);
            break;
          }

          // Check if user already exists
          const existingUser = await getUserByEmail(email);
          if (existingUser) {
            userId = existingUser.id;
            // Link Stripe customer if not yet linked
            if (!existingUser.stripe_customer_id && typeof session.customer === "string") {
              await updateUser(userId, { stripe_customer_id: session.customer });
            }
          } else {
            // Create new user
            const newId = nanoid(12);
            const now = new Date().toISOString();
            const db = getSupabase();
            const { error } = await db.from("users").insert({
              id: newId,
              email,
              name: session.customer_details?.name ?? null,
              image: null,
              credits: 0,
              stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
              created_at: now,
              updated_at: now,
            });
            if (error) {
              console.error("Failed to create guest user:", error);
              break;
            }
            userId = newId;
            console.log(`Guest user created: ${userId} (${email})`);
          }
        }

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
        let userId = metadata.userId;
        const planId = metadata.planId;

        if (!planId) {
          console.error("Missing planId in subscription metadata:", sub.id);
          break;
        }

        // Guest subscription: resolve or create user from Stripe customer email
        if (!userId && metadata.guest === "true") {
          const customerId = typeof sub.customer === "string" ? sub.customer : null;
          if (customerId) {
            const customer = await stripe.customers.retrieve(customerId);
            if ("email" in customer && customer.email) {
              const existingUser = await getUserByEmail(customer.email);
              if (existingUser) {
                userId = existingUser.id;
                if (!existingUser.stripe_customer_id) {
                  await updateUser(userId, { stripe_customer_id: customerId });
                }
              } else {
                const newId = nanoid(12);
                const now = new Date().toISOString();
                const db = getSupabase();
                const { error } = await db.from("users").insert({
                  id: newId,
                  email: customer.email,
                  name: ("name" in customer ? customer.name : null) ?? null,
                  image: null,
                  credits: 0,
                  stripe_customer_id: customerId,
                  created_at: now,
                  updated_at: now,
                });
                if (error) {
                  console.error("Failed to create guest user for subscription:", error);
                  break;
                }
                userId = newId;
                console.log(`Guest user created for subscription: ${userId} (${customer.email})`);
              }
              // Persist userId in subscription metadata for future events
              await stripe.subscriptions.update(sub.id, {
                metadata: { ...metadata, userId, guest: "" },
              });
            }
          }
        }

        if (!userId) {
          console.error("Could not resolve userId for subscription:", sub.id);
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
          // Detect annual billing: use metadata first, fall back to price interval
          const isYearly =
            metadata.billing === "yearly" ||
            sub.items.data[0]?.price?.recurring?.interval === "year";

          const credits = isYearly ? creditsPerMonth * 12 : creditsPerMonth;
          const billingLabel = isYearly ? "annuel" : "mensuel";

          const desc = isFirstPayment
            ? `Abonnement ${metadata.planId} — ${credits} crédits (${billingLabel}, premier paiement)`
            : `Renouvellement ${metadata.planId} — ${credits} crédits (${billingLabel})`;

          await addCredits(userId, credits, desc, invoice.id);
          console.log(`Subscription credits: ${credits} for user ${userId} (${invoice.billing_reason}, ${billingLabel})`);
        }
        break;
      }

      // --- Invoice payment failed → mark subscription as past_due ---
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subDetails = invoice.parent?.subscription_details;

        if (!subDetails) break;

        const subRef = subDetails.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;

        if (!subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const metadata = sub.metadata || {};
        const userId = metadata.userId;
        const planId = metadata.planId;

        if (userId) {
          await upsertSubscription({
            userId,
            stripeSubscriptionId: sub.id,
            stripePriceId: getSubPriceId(sub),
            planId: planId || "unknown",
            status: "past_due",
            creditsPerPeriod: 0,
            currentPeriodEnd: getSubPeriodEnd(sub),
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          });
          console.log(`Payment failed: subscription ${sub.id} marked past_due for user ${userId}`);
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
