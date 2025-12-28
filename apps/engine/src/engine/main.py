"""Main FastAPI application for ClearAudio."""

import os
from typing import Literal

from dotenv import load_dotenv
load_dotenv()  # Load .env file for local development

import httpx
import vercel_blob
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ClearAudio Engine",
    description="Audio processing API powered by SAM Audio",
    version="0.1.0",
)

# Configure CORS for Next.js frontend
# ALLOWED_ORIGINS can be comma-separated list of origins
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
    return {"status": "ok", "service": "ClearAudio Engine"}


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
    """
    Separate audio using SAM Audio with text prompting.
    
    Args:
        audio_url: URL to audio file in Vercel Blob storage
        description: Text description of sound to isolate (e.g., "A man speaking")
        model_size: Model size - small, base, large, or large-tv (for video)
        high_quality: Use span prediction and re-ranking (slower but better)
        reranking_candidates: Number of candidates for re-ranking (2-32, default 8)
        
    Returns:
        JSON with URLs to target and residual audio in Vercel Blob
    """
    import modal
    
    # Validate reranking candidates
    if reranking_candidates < 2 or reranking_candidates > 32:
        raise HTTPException(
            status_code=400,
            detail="reranking_candidates must be between 2 and 32"
        )
    
    # Download audio from Vercel Blob URL
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(audio_url)
            response.raise_for_status()
            audio_bytes = response.content
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to download audio: {str(e)}")
    
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")
    
    # Call deployed Modal app
    try:
        # Look up the deployed class (Modal 1.0+ API)
        AudioSeparator = modal.Cls.from_name("clearclean-audio", "AudioSeparator")
        separator = AudioSeparator(model_size=model_size)
        result = separator.separate.remote(
            audio_bytes=audio_bytes,
            description=description,
            high_quality=high_quality,
            reranking_candidates=reranking_candidates,
        )
        
        # Upload processed audio to Vercel Blob
        target_resp = vercel_blob.put(
            "output/target.wav",
            result["target"],
            {"access": "public", "contentType": "audio/wav", "addRandomSuffix": True}
        )
        residual_resp = vercel_blob.put(
            "output/residual.wav",
            result["residual"],
            {"access": "public", "contentType": "audio/wav", "addRandomSuffix": True}
        )
        
        # Return URLs to blob storage
        return {
            "target_url": target_resp["url"],
            "residual_url": residual_resp["url"],
            "sample_rate": result["sample_rate"],
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/models")
async def list_models():
    """List available model sizes and their descriptions."""
    return {
        "models": [
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
        ],
        "default": "large",
    }
