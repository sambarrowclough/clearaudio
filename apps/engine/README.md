# Engine

Audio processing backend for ClearAudio. Uses [fal.ai](https://fal.ai) to run Meta's [SAM-Audio](https://github.com/facebookresearch/sam-audio) model for text-prompted audio separation.

## Setup

```bash
# Install dependencies (uv will create .venv automatically)
uv sync

# For development dependencies
uv sync --group dev
```

## Running

```bash
# From project root
bun run dev:engine

# Or directly
PYTHONPATH=src uv run uvicorn engine.main:app --reload --port 8000
```

## API

- `GET /` — Health check
- `GET /health` — Health status
- `GET /api/models` — List available model sizes
- `POST /api/separate` — Separate audio with a text prompt

### `POST /api/separate`

Form data parameters:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `audio_url` | string | required | URL of the audio file |
| `description` | string | required | What to isolate (e.g. "the speaker") |
| `model_size` | string | `"large"` | `small`, `base`, `large`, or `large-tv` |
| `high_quality` | bool | `false` | Enable span prediction + reranking |
| `reranking_candidates` | int | `8` | Candidates for reranking (2-32) |
