import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscription } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  if (!userId) {
    throw new Error("No userId in checkout session metadata");
  }

  if (typeof customerId !== "string" || !customerId) {
    throw new Error("No customer ID in checkout session");
  }

  if (typeof subscriptionId !== "string" || !subscriptionId) {
    throw new Error("No subscription ID in checkout session");
  }

  // Fetch the subscription to get period end
  const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);

  await db
    .update(subscription)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(subscription.userId, userId));

  console.log(`User ${userId} upgraded to Pro`);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;

  // Map Stripe status to our status
  let status: string;
  switch (sub.status) {
    case "active":
      status = "active";
      break;
    case "past_due":
      status = "past_due";
      break;
    case "canceled":
      status = "canceled";
      break;
    case "trialing":
      status = "trialing";
      break;
    default:
      status = sub.status;
  }

  await db
    .update(subscription)
    .set({
      status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeCustomerId, customerId));

  console.log(`Subscription updated for customer ${customerId}: ${status}`);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;

  // Downgrade to free plan
  await db
    .update(subscription)
    .set({
      plan: "free",
      status: "canceled",
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeCustomerId, customerId));

  console.log(`Subscription canceled for customer ${customerId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  await db
    .update(subscription)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeCustomerId, customerId));

  console.log(`Payment failed for customer ${customerId}`);
}

