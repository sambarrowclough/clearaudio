import { NextResponse } from "next/server";

const MODELS = [
  {
    id: "small",
    name: "Fast",
    description: "Quick processing, good for simple audio",
    backend_acceleration: "fast",
  },
  {
    id: "base",
    name: "Balanced",
    description: "Good balance of speed and quality",
    backend_acceleration: "balanced",
  },
  {
    id: "large",
    name: "Best Quality",
    description: "Highest quality separation (recommended)",
    backend_acceleration: "quality",
  },
  {
    id: "large-tv",
    name: "Video Optimized",
    description: "Best for separating audio from video files",
    backend_acceleration: "quality",
  },
];

export async function GET() {
  return NextResponse.json({
    models: MODELS,
    default: "large",
  });
}
