"""Tests for the fal.ai audio separation service."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.engine.fal_service import (
    ACCELERATION_MAP,
    FAL_MAX_RERANKING_CANDIDATES,
    FAL_MODEL_ID,
    FalServiceError,
    SeparationResult,
    _build_fal_arguments,
    _is_retryable_error,
    _map_reranking_candidates,
    separate,
)


class TestParameterMapping:
    def test_acceleration_map_covers_all_model_sizes(self):
        for size in ("small", "base", "large", "large-tv"):
            assert size in ACCELERATION_MAP

    def test_acceleration_map_values(self):
        assert ACCELERATION_MAP["small"] == "fast"
        assert ACCELERATION_MAP["base"] == "balanced"
        assert ACCELERATION_MAP["large"] == "quality"
        assert ACCELERATION_MAP["large-tv"] == "quality"

    def test_reranking_clamp_high(self):
        assert _map_reranking_candidates(32) == FAL_MAX_RERANKING_CANDIDATES

    def test_reranking_clamp_low(self):
        assert _map_reranking_candidates(0) == 1

    def test_reranking_within_range(self):
        assert _map_reranking_candidates(5) == 5

    def test_build_arguments_basic(self):
        args = _build_fal_arguments(
            audio_url="https://example.com/audio.wav",
            description="a dog barking",
            model_size="large",
            high_quality=False,
            reranking_candidates=8,
        )
        assert args["audio_url"] == "https://example.com/audio.wav"
        assert args["prompt"] == "a dog barking"
        assert args["acceleration"] == "quality"
        assert args["output_format"] == "wav"
        assert args["predict_spans"] is False
        assert "reranking_candidates" not in args

    def test_build_arguments_high_quality(self):
        args = _build_fal_arguments(
            audio_url="https://example.com/audio.wav",
            description="piano",
            model_size="base",
            high_quality=True,
            reranking_candidates=16,
        )
        assert args["predict_spans"] is True
        assert args["reranking_candidates"] == FAL_MAX_RERANKING_CANDIDATES
        assert args["acceleration"] == "balanced"

    def test_build_arguments_small_model(self):
        args = _build_fal_arguments(
            audio_url="https://example.com/a.wav",
            description="voice",
            model_size="small",
            high_quality=False,
            reranking_candidates=2,
        )
        assert args["acceleration"] == "fast"

    def test_build_arguments_unknown_model_defaults_balanced(self):
        args = _build_fal_arguments(
            audio_url="https://example.com/a.wav",
            description="voice",
            model_size="nonexistent",
            high_quality=False,
            reranking_candidates=2,
        )
        assert args["acceleration"] == "balanced"


class TestRetryableErrors:
    def test_timeout_is_retryable(self):
        assert _is_retryable_error(Exception("Connection timeout"))

    def test_502_is_retryable(self):
        assert _is_retryable_error(Exception("502 Bad Gateway"))

    def test_503_is_retryable(self):
        assert _is_retryable_error(Exception("503 Service Unavailable"))

    def test_rate_limit_is_retryable(self):
        assert _is_retryable_error(Exception("rate limit exceeded"))

    def test_validation_error_is_not_retryable(self):
        assert not _is_retryable_error(Exception("Invalid prompt format"))

    def test_auth_error_is_not_retryable(self):
        assert not _is_retryable_error(Exception("401 Unauthorized"))


class TestSeparate:
    @pytest.mark.asyncio
    async def test_successful_separation(self):
        mock_fal_result = {
            "target": {"url": "https://fal.media/target.wav", "content_type": "audio/wav"},
            "residual": {"url": "https://fal.media/residual.wav", "content_type": "audio/wav"},
            "sample_rate": 48000,
            "duration": 10.5,
        }

        target_bytes = b"RIFF" + b"\x00" * 100
        residual_bytes = b"RIFF" + b"\x00" * 80

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = target_bytes

        mock_response_residual = MagicMock()
        mock_response_residual.status_code = 200
        mock_response_residual.content = residual_bytes

        with (
            patch("src.engine.fal_service.fal_client") as mock_fal,
            patch("src.engine.fal_service.httpx.AsyncClient") as mock_httpx,
        ):
            mock_fal.subscribe_async = AsyncMock(return_value=mock_fal_result)
            mock_fal.InProgress = type("InProgress", (), {})
            mock_fal.Queued = type("Queued", (), {})

            mock_client = AsyncMock()
            download_calls = iter([
                MagicMock(content=target_bytes, status_code=200, raise_for_status=MagicMock()),
                MagicMock(content=residual_bytes, status_code=200, raise_for_status=MagicMock()),
            ])
            mock_client.get = AsyncMock(side_effect=lambda url: next(download_calls))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_httpx.return_value = mock_client

            result = await separate(
                audio_url="https://blob.vercel.com/input.wav",
                description="a man speaking",
                model_size="large",
                high_quality=False,
                reranking_candidates=8,
            )

            assert isinstance(result, SeparationResult)
            assert result.sample_rate == 48000
            assert result.duration == 10.5
            assert result.target_url == "https://fal.media/target.wav"
            assert result.residual_url == "https://fal.media/residual.wav"
            assert len(result.target_bytes) > 0
            assert len(result.residual_bytes) > 0
            assert result.processing_time > 0

    @pytest.mark.asyncio
    async def test_fal_returns_incomplete_result(self):
        mock_fal_result = {
            "target": {"url": ""},
            "residual": {},
        }

        with patch("src.engine.fal_service.fal_client") as mock_fal:
            mock_fal.subscribe_async = AsyncMock(return_value=mock_fal_result)
            mock_fal.InProgress = type("InProgress", (), {})
            mock_fal.Queued = type("Queued", (), {})

            with pytest.raises(FalServiceError, match="incomplete result"):
                await separate(
                    audio_url="https://blob.vercel.com/input.wav",
                    description="voice",
                )

    @pytest.mark.asyncio
    async def test_fal_api_failure_raises_service_error(self):
        with patch("src.engine.fal_service.fal_client") as mock_fal:
            mock_fal.subscribe_async = AsyncMock(
                side_effect=Exception("401 Unauthorized")
            )
            mock_fal.InProgress = type("InProgress", (), {})
            mock_fal.Queued = type("Queued", (), {})

            with pytest.raises(FalServiceError, match="failed after"):
                await separate(
                    audio_url="https://blob.vercel.com/input.wav",
                    description="voice",
                )


class TestSeparationResult:
    def test_dataclass_fields(self):
        r = SeparationResult(
            target_url="https://fal.media/t.wav",
            residual_url="https://fal.media/r.wav",
            target_bytes=b"target",
            residual_bytes=b"residual",
            sample_rate=48000,
            duration=5.0,
            processing_time=2.3,
        )
        assert r.target_url == "https://fal.media/t.wav"
        assert r.sample_rate == 48000
        assert r.duration == 5.0
