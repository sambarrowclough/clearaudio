"""Main FastAPI application for ClearAudio."""

import logging
import os
from typing import Literal

from dotenv import load_dotenv

load_dotenv()

import httpx  # noqa: E402
import vercel_blob  # noqa: E402
from fastapi import FastAPI, Form, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clearaudio")

# Backend selection: "fal" or "modal"
AUDIO_BACKEND = os.getenv("AUDIO_BACKEND", "fal").lower()
logger.info("Audio backend: %s", AUDIO_BACKEND)

app = FastAPI(
    title="ClearAudio Engine",
    description="Audio processing API powered by SAM Audio",
    version="0.2.0",
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
        "backend": AUDIO_BACKEND,
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "backend": AUDIO_BACKEND}


async def _separate_with_fal(
    audio_url: str,
    description: str,
    model_size: str,
    high_quality: bool,
    reranking_candidates: int,
) -> dict:
    """Process audio separation through fal.ai."""
    from .fal_service import FalServiceError, separate

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

    return {
        "target_url": target_resp["url"],
        "residual_url": residual_resp["url"],
        "sample_rate": result.sample_rate,
    }


async def _separate_with_modal(
    audio_url: str,
    description: str,
    model_size: str,
    high_quality: bool,
    reranking_candidates: int,
) -> dict:
    """Process audio separation through Modal (legacy backend)."""
    import modal

    async with httpx.AsyncClient() as client:
        response = await client.get(audio_url)
        response.raise_for_status()
        audio_bytes = response.content

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    cls = modal.Cls.from_name("clearclean-audio", "AudioSeparator")
    separator = cls(model_size=model_size)
    result = separator.separate.remote(
        audio_bytes=audio_bytes,
        description=description,
        high_quality=high_quality,
        reranking_candidates=reranking_candidates,
        source_url=audio_url,
    )

    target_resp = vercel_blob.put(
        "output/target.wav",
        result["target"],
        {"access": "public", "contentType": "audio/wav", "addRandomSuffix": True},
    )
    residual_resp = vercel_blob.put(
        "output/residual.wav",
        result["residual"],
        {"access": "public", "contentType": "audio/wav", "addRandomSuffix": True},
    )

    return {
        "target_url": target_resp["url"],
        "residual_url": residual_resp["url"],
        "sample_rate": result["sample_rate"],
    }


@app.post("/api/separate")
async def separate_audio(
    audio_url: str = Form(...),
    description: str = Form(...),
    model_size: Literal["small", "base", "large", "large-tv"] = Form("large"),
    high_quality: bool = Form(False),
    reranking_candidates: int = Form(8),
):
    """
    Separate audio using SAM Audio with text prompting.

    Dispatches to either fal.ai or Modal based on AUDIO_BACKEND env var.
    The API contract is identical regardless of backend.
    """
    if reranking_candidates < 2 or reranking_candidates > 32:
        raise HTTPException(
            status_code=400,
            detail="reranking_candidates must be between 2 and 32",
        )

    logger.info("[INPUT]  %s", audio_url)
    logger.info('[PROMPT] "%s"', description)
    logger.info(
        "[PARAMS] backend=%s, model=%s, hq=%s, candidates=%d",
        AUDIO_BACKEND,
        model_size,
        high_quality,
        reranking_candidates,
    )

    try:
        if AUDIO_BACKEND == "fal":
            result = await _separate_with_fal(
                audio_url=audio_url,
                description=description,
                model_size=model_size,
                high_quality=high_quality,
                reranking_candidates=reranking_candidates,
            )
        elif AUDIO_BACKEND == "modal":
            result = await _separate_with_modal(
                audio_url=audio_url,
                description=description,
                model_size=model_size,
                high_quality=high_quality,
                reranking_candidates=reranking_candidates,
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Unknown AUDIO_BACKEND: {AUDIO_BACKEND!r}. "
                    f"Set to 'fal' or 'modal'."
                ),
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Separation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    logger.info("[OUTPUT] %s", result["target_url"])
    return result


@app.get("/api/models")
async def list_models():
    """List available model sizes and their descriptions."""
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

    if AUDIO_BACKEND == "fal":
        from .fal_service import ACCELERATION_MAP

        for m in models:
            accel = ACCELERATION_MAP.get(m["id"], "balanced")
            m["backend_acceleration"] = accel

    return {
        "models": models,
        "default": "large",
        "backend": AUDIO_BACKEND,
    }
