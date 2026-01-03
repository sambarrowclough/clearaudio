import Stripe from "stripe";

// Lazy-initialized Stripe instance
let _stripe: Stripe | null = null;

/**
 * Get the Stripe client instance.
 * Throws a clear error if STRIPE_SECRET_KEY is not configured.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "Stripe is not configured. Please set the STRIPE_SECRET_KEY environment variable."
      );
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Plan configuration
export const PLANS = {
  free: {
    name: "Free",
    generationsPerMonth: 3,
    maxFileSizeMb: 10,
    allowedModels: ["small", "base"] as const,
    highQualityAllowed: false,
    price: 0,
  },
  pro: {
    name: "Pro",
    generationsPerMonth: 100,
    maxFileSizeMb: 100,
    allowedModels: ["small", "base", "large", "large-tv"] as const,
    highQualityAllowed: true,
    price: 12,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
} as const;

export type PlanType = keyof typeof PLANS;

