import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUsageStats } from "@/lib/usage";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getUsageStats(session.user.id);

    return NextResponse.json({
      plan: stats.plan,
      used: stats.used,
      limit: stats.limit,
      remaining: stats.remaining,
      periodEnd: stats.periodEnd.toISOString(),
    });
  } catch (error) {
    console.error("Usage fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}



