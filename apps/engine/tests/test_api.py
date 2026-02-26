"""Tests for the FastAPI application with fal.ai backend."""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

os.environ["AUDIO_BACKEND"] = "fal"

from src.engine.fal_service import FalServiceError, SeparationResult
from src.engine.main import app

client = TestClient(app)


class TestHealthEndpoints:
    def test_root(self):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["backend"] == "fal"

    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["backend"] == "fal"


class TestModelsEndpoint:
    def test_list_models(self):
        resp = client.get("/api/models")
        assert resp.status_code == 200
        data = resp.json()
        assert data["backend"] == "fal"
        assert len(data["models"]) == 4
        assert data["default"] == "large"

        ids = [m["id"] for m in data["models"]]
        assert ids == ["small", "base", "large", "large-tv"]

        for m in data["models"]:
            assert "backend_acceleration" in m


class TestSeparateEndpoint:
    def test_reranking_too_low(self):
        resp = client.post(
            "/api/separate",
            data={
                "audio_url": "https://example.com/a.wav",
                "description": "voice",
                "reranking_candidates": "1",
            },
        )
        assert resp.status_code == 400
        assert "reranking_candidates" in resp.json()["detail"]

    def test_reranking_too_high(self):
        resp = client.post(
            "/api/separate",
            data={
                "audio_url": "https://example.com/a.wav",
                "description": "voice",
                "reranking_candidates": "33",
            },
        )
        assert resp.status_code == 400

    @patch("src.engine.main._separate_with_fal")
    def test_successful_separation(self, mock_sep):
        mock_sep.return_value = {
            "target_url": "https://blob.vercel.com/target.wav",
            "residual_url": "https://blob.vercel.com/residual.wav",
            "sample_rate": 48000,
        }

        resp = client.post(
            "/api/separate",
            data={
                "audio_url": "https://blob.vercel.com/input.wav",
                "description": "a man speaking",
                "model_size": "large",
                "high_quality": "false",
                "reranking_candidates": "8",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "target_url" in data
        assert "residual_url" in data
        assert "sample_rate" in data
        assert data["sample_rate"] == 48000

    @patch("src.engine.main._separate_with_fal")
    def test_fal_error_returns_502(self, mock_sep):
        from fastapi import HTTPException

        mock_sep.side_effect = HTTPException(
            status_code=502, detail="fal.ai request failed"
        )

        resp = client.post(
            "/api/separate",
            data={
                "audio_url": "https://blob.vercel.com/input.wav",
                "description": "voice",
            },
        )
        assert resp.status_code == 502

    @patch("src.engine.main._separate_with_fal")
    def test_generic_error_returns_500(self, mock_sep):
        mock_sep.side_effect = RuntimeError("unexpected failure")

        resp = client.post(
            "/api/separate",
            data={
                "audio_url": "https://blob.vercel.com/input.wav",
                "description": "voice",
            },
        )
        assert resp.status_code == 500
