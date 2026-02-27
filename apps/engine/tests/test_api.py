"""Tests for the FastAPI application."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from src.engine.main import app

client = TestClient(app)


class TestHealthEndpoints:
    def test_root(self):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"

    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"


class TestModelsEndpoint:
    def test_list_models(self):
        resp = client.get("/api/models")
        assert resp.status_code == 200
        data = resp.json()
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

    @patch("src.engine.main.separate")
    def test_successful_separation(self, mock_sep):
        from unittest.mock import MagicMock

        mock_result = MagicMock()
        mock_result.target_bytes = b"target"
        mock_result.residual_bytes = b"residual"
        mock_result.sample_rate = 48000

        mock_sep.return_value = mock_result

        with patch("src.engine.main.vercel_blob.put") as mock_blob:
            mock_blob.side_effect = [
                {"url": "https://blob.vercel.com/target.wav"},
                {"url": "https://blob.vercel.com/residual.wav"},
            ]

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

    @patch("src.engine.main.separate")
    def test_fal_error_returns_502(self, mock_sep):
        from src.engine.fal_service import FalServiceError

        mock_sep.side_effect = FalServiceError("fal.ai request failed")

        resp = client.post(
            "/api/separate",
            data={
                "audio_url": "https://blob.vercel.com/input.wav",
                "description": "voice",
            },
        )
        assert resp.status_code == 502

    @patch("src.engine.main.separate")
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
