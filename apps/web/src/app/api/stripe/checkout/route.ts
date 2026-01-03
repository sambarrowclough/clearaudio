import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getStripe, PLANS } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscription } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Check if user already has a subscription record
    const existingSub = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .limit(1);

    // Prevent duplicate subscriptions - check if user already has an active Pro subscription
    if (
      existingSub[0]?.plan === "pro" &&
      (existingSub[0]?.status === "active" || existingSub[0]?.status === "trialing")
    ) {
      return NextResponse.json(
        { error: "You already have an active Pro subscription" },
        { status: 400 }
      );
    }

    let stripeCustomerId = existingSub[0]?.stripeCustomerId;

    // Create Stripe customer if not exists
    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: userEmail,
        metadata: {
          userId,
        },
      });
      stripeCustomerId = customer.id;

      // Create or update subscription record with customer ID
      if (existingSub.length === 0) {
        await db.insert(subscription).values({
          id: crypto.randomUUID(),
          userId,
          stripeCustomerId,
          plan: "free",
          status: "active",
        });
      } else {
        await db
          .update(subscription)
          .set({ stripeCustomerId, updatedAt: new Date() })
          .where(eq(subscription.userId, userId));
      }
    }

    // Get the Pro price ID
    const priceId = PLANS.pro.stripePriceId;
    if (!priceId) {
      return NextResponse.json(
        { error: "Pro plan price not configured" },
        { status: 500 }
      );
    }

    // Create checkout session
    const headersList = await headers();
    const origin = headersList.get("origin") || process.env.BETTER_AUTH_URL;

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/account?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        userId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}



