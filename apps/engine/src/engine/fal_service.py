"""fal.ai backend for ClearAudio - serverless audio separation via SAM Audio."""

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Literal

import fal_client
import httpx

logger = logging.getLogger("clearaudio.fal")

FAL_MODEL_ID = "fal-ai/sam-audio/separate"

# Maps our model_size parameter to fal.ai's acceleration parameter.
# fal.ai doesn't expose model size selection — it runs a single model and
# controls the quality/speed tradeoff via acceleration.
ACCELERATION_MAP: dict[str, str] = {
    "small": "fast",
    "base": "balanced",
    "large": "quality",
    "large-tv": "quality",
}

# fal.ai caps reranking_candidates at 7; our API allows 2-32.
FAL_MAX_RERANKING_CANDIDATES = 7

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2.0
REQUEST_TIMEOUT = 300


@dataclass
class SeparationResult:
    target_url: str
    residual_url: str
    target_bytes: bytes
    residual_bytes: bytes
    sample_rate: int
    duration: float
    processing_time: float


def _map_reranking_candidates(candidates: int) -> int:
    """Clamp reranking candidates to fal.ai's supported range (1-7)."""
    return max(1, min(candidates, FAL_MAX_RERANKING_CANDIDATES))


def _build_fal_arguments(
    audio_url: str,
    description: str,
    model_size: str,
    high_quality: bool,
    reranking_candidates: int,
) -> dict:
    acceleration = ACCELERATION_MAP.get(model_size, "balanced")
    args: dict = {
        "audio_url": audio_url,
        "prompt": description,
        "acceleration": acceleration,
        "output_format": "wav",
    }

    if high_quality:
        args["predict_spans"] = True
        args["reranking_candidates"] = _map_reranking_candidates(
            reranking_candidates
        )
    else:
        args["predict_spans"] = False

    return args


async def _call_fal_with_retry(arguments: dict) -> dict:
    """Call fal.ai with retries and exponential backoff on transient failures."""
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(
                "[FAL] Attempt %d/%d — submitting to %s",
                attempt,
                MAX_RETRIES,
                FAL_MODEL_ID,
            )
            result = await fal_client.subscribe_async(
                FAL_MODEL_ID,
                arguments=arguments,
                with_logs=True,
                on_queue_update=_on_queue_update,
            )
            return result

        except Exception as exc:
            last_error = exc
            is_retryable = _is_retryable_error(exc)
            logger.warning(
                "[FAL] Attempt %d failed: %s (retryable=%s)",
                attempt,
                str(exc)[:200],
                is_retryable,
            )

            if not is_retryable or attempt == MAX_RETRIES:
                break

            delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
            logger.info("[FAL] Retrying in %.1fs...", delay)
            await asyncio.sleep(delay)

    raise FalServiceError(
        f"fal.ai request failed after {MAX_RETRIES} attempts: {last_error}"
    ) from last_error


def _is_retryable_error(exc: Exception) -> bool:
    """Determine whether an error is transient and worth retrying."""
    error_str = str(exc).lower()
    retryable_patterns = [
        "timeout",
        "connection",
        "502",
        "503",
        "504",
        "rate limit",
        "too many requests",
        "internal server error",
        "temporarily unavailable",
    ]
    return any(pattern in error_str for pattern in retryable_patterns)


def _on_queue_update(update):
    """Log queue status updates from fal.ai."""
    if isinstance(update, fal_client.InProgress):
        for log_entry in update.logs:
            logger.debug("[FAL LOG] %s", log_entry.get("message", log_entry))
    elif isinstance(update, fal_client.Queued):
        logger.info("[FAL] Queued (position: %s)", getattr(update, "position", "?"))


async def _download_output(url: str, label: str) -> bytes:
    """Download processed audio from fal.ai's CDN."""
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.content
                logger.info(
                    "[FAL] Downloaded %s: %.1f KB",
                    label,
                    len(data) / 1024,
                )
                return data
            except httpx.HTTPError as exc:
                if attempt == MAX_RETRIES:
                    raise FalServiceError(
                        f"Failed to download {label} from fal.ai after "
                        f"{MAX_RETRIES} attempts: {exc}"
                    ) from exc
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                logger.warning(
                    "[FAL] Download %s attempt %d failed, retrying in %.1fs: %s",
                    label,
                    attempt,
                    delay,
                    exc,
                )
                await asyncio.sleep(delay)

    raise FalServiceError(f"Failed to download {label} — should not reach here")


async def separate(
    audio_url: str,
    description: str,
    model_size: Literal["small", "base", "large", "large-tv"] = "large",
    high_quality: bool = False,
    reranking_candidates: int = 8,
) -> SeparationResult:
    """
    Separate audio via fal.ai's hosted SAM Audio model.

    This sends the audio URL directly to fal.ai (no intermediate download),
    then downloads the output files and returns both URLs and raw bytes.
    """
    start_time = time.perf_counter()

    arguments = _build_fal_arguments(
        audio_url=audio_url,
        description=description,
        model_size=model_size,
        high_quality=high_quality,
        reranking_candidates=reranking_candidates,
    )

    logger.info("[FAL] [INPUT]  %s", audio_url)
    logger.info('[FAL] [PROMPT] "%s"', description)
    logger.info(
        "[FAL] [PARAMS] acceleration=%s, predict_spans=%s, reranking=%s",
        arguments.get("acceleration"),
        arguments.get("predict_spans"),
        arguments.get("reranking_candidates", "n/a"),
    )

    result = await _call_fal_with_retry(arguments)

    target_info = result.get("target", {})
    residual_info = result.get("residual", {})
    target_fal_url = target_info.get("url", "")
    residual_fal_url = residual_info.get("url", "")

    if not target_fal_url or not residual_fal_url:
        raise FalServiceError(
            f"fal.ai returned incomplete result — "
            f"target_url={target_fal_url!r}, residual_url={residual_fal_url!r}. "
            f"Full response: {result}"
        )

    target_bytes, residual_bytes = await asyncio.gather(
        _download_output(target_fal_url, "target"),
        _download_output(residual_fal_url, "residual"),
    )

    sample_rate = result.get("sample_rate", 48000)
    duration = result.get("duration", 0.0)
    processing_time = time.perf_counter() - start_time

    logger.info(
        "[FAL] [OUTPUT] %.1fs @ %dHz (target=%.1f KB, residual=%.1f KB)",
        duration,
        sample_rate,
        len(target_bytes) / 1024,
        len(residual_bytes) / 1024,
    )
    logger.info("[FAL] [TIME]   %.1fs total", processing_time)

    return SeparationResult(
        target_url=target_fal_url,
        residual_url=residual_fal_url,
        target_bytes=target_bytes,
        residual_bytes=residual_bytes,
        sample_rate=sample_rate,
        duration=duration,
        processing_time=processing_time,
    )


class FalServiceError(Exception):
    """Raised when a fal.ai operation fails."""
