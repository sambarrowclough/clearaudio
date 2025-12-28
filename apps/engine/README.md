# Engine

Audio processing backend for ClearAudio, powered by SAM (Segment Anything for Audio).

## Setup

```bash
# Install dependencies (uv will create .venv automatically)
uv sync

# For development dependencies
uv sync --group dev

# Set up Modal authentication (first time only)
uv run python3 -m modal setup
```

## Running

### Local API Server

```bash
uv run uvicorn engine.main:app --reload --port 8000
```

### Modal (Serverless GPU)

```bash
# Run the Modal app
uv run modal run src/engine/modal_app.py

# Deploy to Modal (production)
uv run modal deploy src/engine/modal_app.py
```

## API

- `GET /` - Health check
- `GET /health` - Health status

## Modal Functions

- `square(x)` - Test function
- `process_audio(audio_data, prompt)` - Process audio with SAM model

