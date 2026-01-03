import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { recordGeneration, checkUsageLimit, checkFeatureAccess } from "@/lib/usage";

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

    // Verify usage limit
    const usageCheck = await checkUsageLimit(session.user.id);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: "Usage limit exceeded", ...usageCheck },
        { status: 403 }
      );
    }

    // Verify feature access
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

    // Record the generation and get shareId
    const shareId = await recordGeneration(session.user.id, {
      modelSize,
      highQuality: highQuality ?? false,
      durationMs,
      fileSizeBytes,
      originalUrl,
      targetUrl,
      residualUrl,
      description,
    });

    return NextResponse.json({ success: true, shareId });
  } catch (error) {
    console.error("Generation recording error:", error);
    return NextResponse.json(
      { error: "Failed to record generation" },
      { status: 500 }
    );
  }
}



