import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveProject, getUserById, deductCredits, getUserByEmail, updateProjectStatus } from "@/lib/store";
import { getStripe } from "@/lib/stripe";
import { cleanPhoto } from "@/lib/services/replicate";
import { inngest } from "@/lib/inngest/client";
import { createOrderSchema } from "@/lib/validations";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { STYLES, CREDIT_PACKS } from "@/lib/types";
import type { Project } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`order:${ip}`, RATE_LIMITS.CHECKOUT);
    if (rl.limited) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const session = await auth();
    const body = await request.json();

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Données invalides";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { photos, style, ambiance, packId } = parsed.data;

    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ error: "Pack invalide" }, { status: 400 });
    }

    const styleLabel = STYLES.find((s) => s.id === style)!.label;
    const projectId = nanoid(12);
    const origin = new URL(request.url).origin;
    const isAuthenticated = !!session?.user?.id;

    // If user is authenticated and has enough credits, skip Stripe
    if (isAuthenticated) {
      const user = await getUserById(session.user.id);
      if (user && user.credits >= 1) {
        // Deduct 1 credit and start pipeline immediately
        await deductCredits(
          session.user.id,
          1,
          projectId,
          `Commande ${projectId} — 1 bien`,
        );

        const project = await createOrderProject(
          projectId, photos, style, styleLabel, ambiance, session.user.id, session.user.email || undefined,
        );
        await saveProject(project);

        // Start pipeline
        if (process.env.USE_INNGEST === "true") {
          await inngest.send({
            name: "project/created",
            data: { projectId: project.id },
          });
        }

        await updateProjectStatus(projectId, "processing", "en_generation");

        return NextResponse.json({
          projectId,
          checkoutUrl: null, // no checkout needed
        });
      }
    }

    // Otherwise, redirect to Stripe checkout
    const stripe = getStripe();

    // Create the project first (pending state)
    const project = await createOrderProject(
      projectId, photos, style, styleLabel, ambiance,
      isAuthenticated ? session.user.id : undefined,
      isAuthenticated ? session.user.email || undefined : undefined,
    );
    project.orderStatus = "pending";
    project.kanbanStatus = "a_traiter";
    await saveProject(project);

    // Create Stripe checkout
    const checkoutConfig: Record<string, unknown> = {
      mode: "payment" as const,
      billing_address_collection: "required" as const,
      tax_id_collection: { enabled: true },
      invoice_creation: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `VIMIMO — Pack ${pack.name}`,
              description: `${pack.credits} biens de staging IA premium`,
            },
            unit_amount: Math.round(pack.priceEur * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "order",
        packId: pack.id,
        credits: String(pack.credits),
        projectId,
        ...(isAuthenticated
          ? { userId: session.user.id }
          : { guest: "true" }),
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&order=${projectId}`,
      cancel_url: `${origin}/commander`,
    };

    if (isAuthenticated) {
      const user = await getUserById(session.user.id);
      if (user?.stripe_customer_id) {
        (checkoutConfig as Record<string, unknown>).customer = user.stripe_customer_id;
      } else {
        (checkoutConfig as Record<string, unknown>).customer_creation = "always";
      }
    } else {
      (checkoutConfig as Record<string, unknown>).customer_creation = "always";
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      checkoutConfig as Parameters<typeof stripe.checkout.sessions.create>[0],
    );

    return NextResponse.json({ projectId, checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la commande" },
      { status: 500 }
    );
  }
}

async function createOrderProject(
  projectId: string,
  photos: { id: string; originalUrl: string }[],
  style: string,
  styleLabel: string,
  ambiance: string | undefined,
  userId?: string,
  clientEmail?: string,
): Promise<Project> {
  // Launch cleaning predictions
  const photosWithPredictions = await Promise.all(
    photos.map(async (photo) => {
      try {
        const predictionId = await cleanPhoto(photo.originalUrl, {
          projectId,
          predictionType: "clean",
        });
        return { ...photo, cleanPredictionId: predictionId };
      } catch (error) {
        console.error(`Failed to clean photo ${photo.id}:`, error);
        return { ...photo, cleanedUrl: photo.originalUrl };
      }
    }),
  );

  return {
    id: projectId,
    phase: "cleaning",
    createdAt: Date.now(),
    style: style as Project["style"],
    styleLabel,
    photos: photosWithPredictions,
    rooms: [],
    userId,
    creditsUsed: 1,
    creditsRefunded: false,
    mode: "staging_piece",
    orderStatus: "processing",
    kanbanStatus: "en_generation",
    clientEmail,
    ambiance: (ambiance as Project["ambiance"]) || "jour",
  };
}
