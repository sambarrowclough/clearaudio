import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { recordGenerationAtomic, checkFeatureAccess } from "@/lib/usage";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      modelSize, 
      highQuality, 
      fileSizeBytes, 
      durationMs,
      originalUrl,
      targetUrl,
      residualUrl,
      description,
    } = body;

    // Verify feature access (model size, file size, high quality mode)
    // This is safe to check separately as it doesn't involve counting
    const featureCheck = await checkFeatureAccess(session.user.id, {
      modelSize,
      highQuality,
      fileSizeMb: fileSizeBytes ? fileSizeBytes / 1024 / 1024 : undefined,
    });

    if (!featureCheck.allowed) {
      return NextResponse.json(
        { error: featureCheck.reason },
        { status: 403 }
      );
    }

    // Atomically check usage limit and record generation
    // This prevents race conditions where concurrent requests could exceed the limit
    const result = await recordGenerationAtomic(session.user.id, {
      modelSize,
      highQuality: highQuality ?? false,
      durationMs,
      fileSizeBytes,
      originalUrl,
      targetUrl,
      residualUrl,
      description,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Usage limit exceeded",
          allowed: false,
          used: result.used,
          limit: result.limit,
          plan: result.plan,
          remaining: 0,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, shareId: result.shareId });
  } catch (error) {
    console.error("Generation recording error:", error);
    return NextResponse.json(
      { error: "Failed to record generation" },
      { status: 500 }
    );
  }
}



