import { db } from "./db";
import { subscription, generation } from "./db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { PLANS, type PlanType } from "./stripe";
import { nanoid } from "nanoid";

/**
 * Get the user's current plan
 */
export async function getUserPlan(userId: string): Promise<{
  plan: PlanType;
  status: string;
  currentPeriodEnd: Date | null;
}> {
  const sub = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .limit(1);

  if (sub.length === 0 || sub[0].plan === "free") {
    return { plan: "free", status: "active", currentPeriodEnd: null };
  }

  return {
    plan: sub[0].plan as PlanType,
    status: sub[0].status,
    currentPeriodEnd: sub[0].currentPeriodEnd,
  };
}

/**
 * Get the start of the current billing period
 */
function getBillingPeriodStart(currentPeriodEnd: Date | null): Date {
  if (currentPeriodEnd) {
    // For paid plans, billing period is based on Stripe's period
    const periodStart = new Date(currentPeriodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1);
    return periodStart;
  }
  
  // For free users, use calendar month
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Count generations in the current billing period
 */
export async function getUsageCount(userId: string, periodStart: Date): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generation)
    .where(
      and(
        eq(generation.userId, userId),
        gte(generation.createdAt, periodStart)
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Check if user can make a generation
 */
export async function checkUsageLimit(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  plan: PlanType;
  remaining: number;
}> {
  const { plan, currentPeriodEnd } = await getUserPlan(userId);
  const planConfig = PLANS[plan];
  const periodStart = getBillingPeriodStart(currentPeriodEnd);
  const used = await getUsageCount(userId, periodStart);
  const limit = planConfig.generationsPerMonth;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    used,
    limit,
    plan,
    remaining,
  };
}

/**
 * Check if a specific feature is allowed for the user's plan
 */
export async function checkFeatureAccess(
  userId: string,
  feature: {
    modelSize?: string;
    highQuality?: boolean;
    fileSizeMb?: number;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  const { plan } = await getUserPlan(userId);
  const planConfig = PLANS[plan];

  if (feature.modelSize) {
    const allowedModels = planConfig.allowedModels as readonly string[];
    if (!allowedModels.includes(feature.modelSize)) {
      return {
        allowed: false,
        reason: `${feature.modelSize} model requires Pro plan`,
      };
    }
  }

  if (feature.highQuality && !planConfig.highQualityAllowed) {
    return {
      allowed: false,
      reason: "High quality mode requires Pro plan",
    };
  }

  if (feature.fileSizeMb && feature.fileSizeMb > planConfig.maxFileSizeMb) {
    return {
      allowed: false,
      reason: `File size exceeds ${planConfig.maxFileSizeMb}MB limit. Upgrade to Pro for ${PLANS.pro.maxFileSizeMb}MB.`,
    };
  }

  return { allowed: true };
}

/**
 * Record a generation and return the shareId
 */
export async function recordGeneration(
  userId: string,
  metadata: {
    modelSize: string;
    highQuality: boolean;
    durationMs?: number;
    fileSizeBytes?: number;
    originalUrl?: string;
    targetUrl?: string;
    residualUrl?: string;
    description?: string;
  }
): Promise<string> {
  const shareId = nanoid(8);
  
  await db.insert(generation).values({
    id: crypto.randomUUID(),
    shareId,
    userId,
    modelSize: metadata.modelSize,
    highQuality: metadata.highQuality,
    durationMs: metadata.durationMs,
    fileSizeBytes: metadata.fileSizeBytes,
    originalUrl: metadata.originalUrl,
    targetUrl: metadata.targetUrl,
    residualUrl: metadata.residualUrl,
    description: metadata.description,
  });
  
  return shareId;
}

/**
 * Get a generation by its shareId
 */
export async function getGenerationByShareId(shareId: string) {
  const result = await db
    .select()
    .from(generation)
    .where(eq(generation.shareId, shareId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get full usage stats for display
 */
export async function getUsageStats(userId: string): Promise<{
  plan: PlanType;
  used: number;
  limit: number;
  remaining: number;
  periodEnd: Date;
  recentGenerations: Array<{
    id: string;
    modelSize: string;
    createdAt: Date;
  }>;
}> {
  const { plan, currentPeriodEnd } = await getUserPlan(userId);
  const planConfig = PLANS[plan];
  const periodStart = getBillingPeriodStart(currentPeriodEnd);
  const used = await getUsageCount(userId, periodStart);
  
  // Calculate period end
  let periodEnd: Date;
  if (currentPeriodEnd) {
    periodEnd = currentPeriodEnd;
  } else {
    // For free users, end of calendar month
    const now = new Date();
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  // Get recent generations
  const recent = await db
    .select({
      id: generation.id,
      modelSize: generation.modelSize,
      createdAt: generation.createdAt,
    })
    .from(generation)
    .where(eq(generation.userId, userId))
    .orderBy(sql`${generation.createdAt} DESC`)
    .limit(10);

  return {
    plan,
    used,
    limit: planConfig.generationsPerMonth,
    remaining: Math.max(0, planConfig.generationsPerMonth - used),
    periodEnd,
    recentGenerations: recent,
  };
}



