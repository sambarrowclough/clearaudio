import Stripe from "stripe";

// Only initialize Stripe on the server side
// This file is imported by client components for PLANS config,
// so we need to handle the case where STRIPE_SECRET_KEY isn't available
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : (null as unknown as Stripe);

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

