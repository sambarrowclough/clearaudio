import { fal } from "@fal-ai/client";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const FAL_MODEL_ID = "fal-ai/sam-audio/separate";

const VALID_MODEL_SIZES = ["small", "base", "large", "large-tv"] as const;

const ACCELERATION_MAP: Record<string, string> = {
  small: "fast",
  base: "balanced",
  large: "quality",
  "large-tv": "quality",
};

const FAL_MAX_RERANKING_CANDIDATES = 7;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 2000;
const FAL_REQUEST_TIMEOUT_MS = 300_000;

fal.config({ credentials: process.env.FAL_KEY });

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function isRetryable(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return ["timeout", "connection", "502", "503", "504", "rate limit", "too many requests"].some(
    (p) => msg.includes(p)
  );
}

async function callFalWithRetry(args: Record<string, unknown>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await withTimeout(
        fal.subscribe(FAL_MODEL_ID, { input: args }),
        FAL_REQUEST_TIMEOUT_MS
      );
      return result.data;
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) break;
      await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY * 2 ** (attempt - 1)));
    }
  }

  throw new Error(`fal.ai request failed after ${MAX_RETRIES} attempts: ${lastError}`);
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download from ${url}: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioUrl = formData.get("audio_url") as string;
    const description = formData.get("description") as string;
    const modelSize = (formData.get("model_size") as string) || "large";
    const highQuality = formData.get("high_quality") === "true";
    const rerankingCandidates = parseInt(formData.get("reranking_candidates") as string) || 8;

    if (!audioUrl || !description) {
      return NextResponse.json({ detail: "audio_url and description are required" }, { status: 400 });
    }

    if (!VALID_MODEL_SIZES.includes(modelSize as (typeof VALID_MODEL_SIZES)[number])) {
      return NextResponse.json(
        { detail: `Invalid model_size. Must be one of: ${VALID_MODEL_SIZES.join(", ")}` },
        { status: 400 }
      );
    }

    if (rerankingCandidates < 2 || rerankingCandidates > 32) {
      return NextResponse.json(
        { detail: "reranking_candidates must be between 2 and 32" },
        { status: 400 }
      );
    }

    const acceleration = ACCELERATION_MAP[modelSize];
    const falArgs: Record<string, unknown> = {
      audio_url: audioUrl,
      prompt: description,
      acceleration,
      output_format: "wav",
    };

    if (highQuality) {
      falArgs.predict_spans = true;
      falArgs.reranking_candidates = Math.max(1, Math.min(rerankingCandidates, FAL_MAX_RERANKING_CANDIDATES));
    } else {
      falArgs.predict_spans = false;
    }

    const result = await callFalWithRetry(falArgs);

    const targetFalUrl = result?.target?.url;
    const residualFalUrl = result?.residual?.url;

    if (!targetFalUrl || !residualFalUrl) {
      console.error("fal.ai returned incomplete result:", result);
      return NextResponse.json(
        { detail: "Upstream separation service returned incomplete result" },
        { status: 502 }
      );
    }

    const [targetBytes, residualBytes] = await Promise.all([
      downloadBuffer(targetFalUrl),
      downloadBuffer(residualFalUrl),
    ]);

    const [targetBlob, residualBlob] = await Promise.all([
      put("output/target.wav", targetBytes, {
        access: "public",
        contentType: "audio/wav",
        addRandomSuffix: true,
      }),
      put("output/residual.wav", residualBytes, {
        access: "public",
        contentType: "audio/wav",
        addRandomSuffix: true,
      }),
    ]);

    return NextResponse.json({
      target_url: targetBlob.url,
      residual_url: residualBlob.url,
      sample_rate: result.sample_rate ?? 48000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Separation failed";
    const isFalError = message.includes("fal.ai") || message.includes("timed out");
    const status = isFalError ? 502 : 500;
    console.error("Separation failed:", { status, error: message });
    return NextResponse.json(
      { detail: isFalError ? "Upstream separation service error" : "Separation failed" },
      { status }
    );
  }
}
