import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { checkUsageLimit, checkFeatureAccess } from "@/lib/usage";

/**
 * Pre-authorization endpoint that validates usage limits and feature access
 * BEFORE expensive GPU processing runs. This prevents the TOCTOU vulnerability
 * where stale client-side usage data could allow bypassing limits.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { modelSize, highQuality, fileSizeBytes } = body;

    // Server-side usage limit check (authoritative, not stale)
    const usageCheck = await checkUsageLimit(session.user.id);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Usage limit exceeded", 
          code: "USAGE_LIMIT_EXCEEDED",
          used: usageCheck.used,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          plan: usageCheck.plan,
        },
        { status: 403 }
      );
    }

    // Server-side feature access check
    const featureCheck = await checkFeatureAccess(session.user.id, {
      modelSize,
      highQuality,
      fileSizeMb: fileSizeBytes ? fileSizeBytes / 1024 / 1024 : undefined,
    });

    if (!featureCheck.allowed) {
      return NextResponse.json(
        { 
          error: featureCheck.reason,
          code: "FEATURE_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    // Authorization successful - client can proceed with processing
    return NextResponse.json({ 
      authorized: true,
      usage: {
        used: usageCheck.used,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        plan: usageCheck.plan,
      }
    });
  } catch (error) {
    console.error("Authorization error:", error);
    return NextResponse.json(
      { error: "Authorization check failed" },
      { status: 500 }
    );
  }
}

