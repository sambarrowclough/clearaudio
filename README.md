# ClearAudio

**Fix bad audio with a prompt.**

![ClearAudio](apps/web/public/og-image.png)

Upload audio or video, describe what you want to keep ("the speaker", "the voice", "the music"), and we'll clean up the rest. Powered by Meta's SAM-Audio.

## Project Structure

```
clearaudio/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   └── engine/       # Python FastAPI backend
├── package.json      # Bun workspace config
└── README.md
```

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Python](https://python.org/) (3.11+)
- [Modal CLI](https://modal.com/docs/guide#getting-started) — installed and authenticated
- [Hugging Face CLI](https://huggingface.co/docs/huggingface_hub/en/quick-start#authentication) — installed and authenticated
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — for file uploads and storage
- [SAM-Audio model access](https://huggingface.co/facebook/sam-audio-large) — request access to the checkpoints (required)

## Getting Started

### Install Frontend Dependencies

```bash
bun install
```

### Set Up Python Backend

```bash
cd apps/engine
uv sync
```

### Configure Environment Variables

Copy the example environment files and fill in your values:

```bash
# Web app
cp apps/web/.env.example apps/web/.env.local

# Engine
cp apps/engine/.env.example apps/engine/.env
```

You'll need:
- **BLOB_READ_WRITE_TOKEN** — Get this from your [Vercel Blob storage settings](https://vercel.com/docs/storage/vercel-blob)
- **MODAL_TOKEN_ID** / **MODAL_TOKEN_SECRET** — Get from [Modal settings](https://modal.com/settings)
- **NEXT_PUBLIC_API_URL** — URL of your backend (default: `http://localhost:8000`)
- **ALLOWED_ORIGINS** — CORS origins for the engine (default: `http://localhost:3000`)

### Set Up Modal Secret for Hugging Face

The Modal service needs access to your Hugging Face token to download the SAM-Audio model. Create a Modal secret:

```bash
modal secret create huggingface-secret HF_TOKEN=hf_your_token_here
```

Get your token from [Hugging Face settings](https://huggingface.co/settings/tokens).

### Run Development Servers

**Frontend (Next.js):**
```bash
bun run dev:web
```

**Backend (FastAPI):**
```bash
bun run dev:engine
```

## Tech Stack

- **Frontend:** Next.js 16, React, TypeScript, Tailwind CSS
- **Backend:** Python, FastAPI, Modal
- **Audio Model:** [SAM-Audio](https://github.com/facebookresearch/sam-audio) by Meta
- **Package Managers:** Bun (frontend), uv (backend)

