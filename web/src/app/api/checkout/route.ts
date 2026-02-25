import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getUserById, updateUser, getActiveSubscription } from "@/lib/store";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "@/lib/types";
import { checkoutSchema } from "@/lib/validations";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Auth optional — guests can checkout too
    const session = await auth();

    // Rate limit — use userId if authenticated, IP otherwise
    const ip = getClientIp(request);
    const rateLimitKey = session?.user?.id ? `checkout:user:${session.user.id}` : `checkout:ip:${ip}`;
    const rl = checkRateLimit(rateLimitKey, RATE_LIMITS.CHECKOUT);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }
    const isGuest = !session?.user?.id;

    const body = await request.json();

    // Zod validation
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Données invalides";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { packId, planId, billing } = parsed.data;

    const stripe = getStripe();
    const origin = new URL(request.url).origin;

    // --- Guest mode: Stripe collects email, user created in webhook ---
    if (isGuest) {
      if (packId) {
        const pack = CREDIT_PACKS.find((p) => p.id === packId);
        if (!pack) {
          return NextResponse.json({ error: "Pack invalide" }, { status: 400 });
        }

        const checkoutSession = await stripe.checkout.sessions.create({
          mode: "payment",
          customer_creation: "always",
          billing_address_collection: "required",
          tax_id_collection: { enabled: true },
          invoice_creation: { enabled: true },
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `VIMIMO — Pack ${pack.name}`,
                  description: `${pack.credits} biens de staging IA`,
                },
                unit_amount: Math.round(pack.priceEur * 100),
              },
              quantity: 1,
            },
          ],
          metadata: {
            type: "pack",
            packId: pack.id,
            credits: String(pack.credits),
            guest: "true",
          },
          success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/pricing`,
        });

        return NextResponse.json({ url: checkoutSession.url });
      }

      if (planId) {
        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
        if (!plan) {
          return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
        }

        const isYearly = billing === "yearly";
        const interval = isYearly ? "year" : "month";
        const unitAmount = isYearly
          ? Math.round(plan.priceEurYearly * 100)
          : Math.round(plan.priceEur * 100);
        const description = isYearly
          ? `${plan.creditsPerMonth} biens / mois (annuel)`
          : `${plan.creditsPerMonth} biens / mois`;

        const checkoutSession = await stripe.checkout.sessions.create({
          mode: "subscription",
          billing_address_collection: "required",
          tax_id_collection: { enabled: true },
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `VIMIMO — ${plan.name}`,
                  description,
                },
                unit_amount: unitAmount,
                recurring: { interval },
              },
              quantity: 1,
            },
          ],
          subscription_data: {
            metadata: {
              type: "subscription",
              planId: plan.id,
              creditsPerMonth: String(plan.creditsPerMonth),
              billing: isYearly ? "yearly" : "monthly",
              guest: "true",
            },
          },
          metadata: {
            type: "subscription",
            planId: plan.id,
            billing: isYearly ? "yearly" : "monthly",
            guest: "true",
          },
          success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/pricing`,
        });

        return NextResponse.json({ url: checkoutSession.url });
      }

      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // --- Authenticated user flow ---
    const userId = session.user.id;
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await updateUser(userId, { stripe_customer_id: customerId });
    }

    // --- One-time credit pack ---
    if (packId) {
      const pack = CREDIT_PACKS.find((p) => p.id === packId);
      if (!pack) {
        return NextResponse.json({ error: "Pack invalide" }, { status: 400 });
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        billing_address_collection: "required",
        tax_id_collection: { enabled: true },
        invoice_creation: { enabled: true },
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `VIMIMO — Pack ${pack.name}`,
                description: `${pack.credits} biens de staging IA`,
              },
              unit_amount: Math.round(pack.priceEur * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id,
          type: "pack",
          packId: pack.id,
          credits: String(pack.credits),
        },
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing`,
      });

      return NextResponse.json({ url: checkoutSession.url });
    }

    // --- Subscription (monthly or yearly) ---
    if (planId) {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      if (!plan) {
        return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
      }

      // PAY-04: Block duplicate subscriptions
      const existingSub = await getActiveSubscription(userId);
      if (existingSub) {
        return NextResponse.json(
          { error: "Vous avez déjà un abonnement actif. Gérez-le depuis votre espace facturation." },
          { status: 409 }
        );
      }

      const isYearly = billing === "yearly";
      const interval = isYearly ? "year" : "month";
      const unitAmount = isYearly
        ? Math.round(plan.priceEurYearly * 100)
        : Math.round(plan.priceEur * 100);
      const description = isYearly
        ? `${plan.creditsPerMonth} crédits / mois (annuel)`
        : `${plan.creditsPerMonth} crédits / mois`;

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        billing_address_collection: "required",
        tax_id_collection: { enabled: true },
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `VIMIMO — ${plan.name}`,
                description,
              },
              unit_amount: unitAmount,
              recurring: { interval },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            userId: user.id,
            type: "subscription",
            planId: plan.id,
            creditsPerMonth: String(plan.creditsPerMonth),
            billing: isYearly ? "yearly" : "monthly",
          },
        },
        metadata: {
          userId: user.id,
          type: "subscription",
          planId: plan.id,
          billing: isYearly ? "yearly" : "monthly",
        },
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing`,
      });

      return NextResponse.json({ url: checkoutSession.url });
    }

    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}
