"""Main FastAPI application for ClearAudio."""

import logging
import os
from typing import Literal

from dotenv import load_dotenv

load_dotenv()

import vercel_blob  # noqa: E402
from fastapi import FastAPI, Form, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from .fal_service import FalServiceError, separate  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clearaudio")

app = FastAPI(
    title="ClearAudio Engine",
    description="Audio processing API powered by fal.ai + SAM Audio",
    version="0.3.0",
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "ClearAudio Engine",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/api/separate")
async def separate_audio(
    audio_url: str = Form(...),
    description: str = Form(...),
    model_size: Literal["small", "base", "large", "large-tv"] = Form("large"),
    high_quality: bool = Form(False),
    reranking_candidates: int = Form(8),
):
    """Separate audio using fal.ai's hosted SAM Audio model with text prompting."""
    if reranking_candidates < 2 or reranking_candidates > 32:
        raise HTTPException(
            status_code=400,
            detail="reranking_candidates must be between 2 and 32",
        )

    logger.info("[INPUT]  %s", audio_url)
    logger.info('[PROMPT] "%s"', description)
    logger.info(
        "[PARAMS] model=%s, hq=%s, candidates=%d",
        model_size,
        high_quality,
        reranking_candidates,
    )

    try:
        result = await separate(
            audio_url=audio_url,
            description=description,
            model_size=model_size,
            high_quality=high_quality,
            reranking_candidates=reranking_candidates,
        )
    except FalServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Separation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    target_resp = vercel_blob.put(
        "output/target.wav",
        result.target_bytes,
        {"access": "public", "contentType": "audio/wav", "addRandomSuffix": True},
    )
    residual_resp = vercel_blob.put(
        "output/residual.wav",
        result.residual_bytes,
        {"access": "public", "contentType": "audio/wav", "addRandomSuffix": True},
    )

    response = {
        "target_url": target_resp["url"],
        "residual_url": residual_resp["url"],
        "sample_rate": result.sample_rate,
    }

    logger.info("[OUTPUT] %s", response["target_url"])
    return response


@app.get("/api/models")
async def list_models():
    """List available model sizes and their descriptions."""
    from .fal_service import ACCELERATION_MAP

    models = [
        {
            "id": "small",
            "name": "Fast",
            "description": "Quick processing, good for simple audio",
        },
        {
            "id": "base",
            "name": "Balanced",
            "description": "Good balance of speed and quality",
        },
        {
            "id": "large",
            "name": "Best Quality",
            "description": "Highest quality separation (recommended)",
        },
        {
            "id": "large-tv",
            "name": "Video Optimized",
            "description": "Best for separating audio from video files",
        },
    ]

    for m in models:
        accel = ACCELERATION_MAP.get(m["id"], "balanced")
        m["backend_acceleration"] = accel

    return {
        "models": models,
        "default": "large",
    }
