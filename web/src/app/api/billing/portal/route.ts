import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getStripe } from "@/lib/stripe";
import { getUserById } from "@/lib/store";

async function createPortalSession(request: Request) {
  const authResult = await requireAuth();
  if (authResult.error) return { error: authResult.error };

  const userId = authResult.session.user.id;
  const user = await getUserById(userId);

  if (!user?.stripe_customer_id) {
    return {
      error: NextResponse.json(
        { error: "Aucun compte de facturation trouvé" },
        { status: 404 }
      ),
    };
  }

  const stripe = getStripe();
  const origin = new URL(request.url).origin;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${origin}/dashboard`,
  });

  return { url: portalSession.url };
}

export async function GET(request: Request) {
  try {
    const result = await createPortalSession(request);
    if (result.error) return result.error;
    return NextResponse.redirect(result.url!);
  } catch (error) {
    console.error("Billing portal error:", error);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}

export async function POST(request: Request) {
  try {
    const result = await createPortalSession(request);
    if (result.error) return result.error;
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Billing portal error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'accès au portail de facturation" },
      { status: 500 }
    );
  }
}
