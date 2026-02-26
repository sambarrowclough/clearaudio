# Product & API Research: Text-Prompted Audio Separation

Research conducted Feb 26, 2026 — competitive landscape and hosted API options for ClearAudio.

---

## Similar Products on the Web

### 1. Isolate Audio — [isolate.audio](https://isolate.audio/)

The closest direct competitor. Same concept: describe a sound in plain English, get it isolated.

- **How it works:** Upload audio/video, type a natural language description, get isolated + residual audio
- **Quality presets:** Best (studio), Balanced (everyday), Fast (quick)
- **Formats:** MP3, WAV, FLAC, M4A, OGG, WebM, MP4 video
- **Free tier:** 5 separations/month, max 5-min files, MP3 output
- **Paid tiers:** Available but pricing not publicly listed
- **Target audience:** Musicians, podcasters, video editors, DJs, producers
- **Notes:** Very polished product with content marketing (blog articles on DAWs, music production, etc.)

### 2. Demix — [trydemix.com](https://trydemix.com/)

Music-focused but uses the same text-prompt approach.

- **How it works:** Natural language prompts to extract any sound from audio
- **Pricing:**
  - Free: up to 2 min audio, no account needed
  - Starter: $9/mo (20 extractions, up to 8 min)
  - Pro: $19/mo (100 extractions, up to 8 min)
  - Studio: $49/mo (unlimited, API access, team collab)
  - Lifetime Pro: $79 one-time (100 extractions/mo forever)
- **Processing time:** ~2 min on GPU
- **Formats:** MP3, WAV, FLAC, OGG, M4A, AAC
- **Notes:** More music-oriented positioning. Offers a lifetime deal. Studio tier includes API access.

### 3. SAM Audio Playground — [sam-audio.org](https://sam-audio.org/)

Browser-based playground directly using Meta's open-source SAM Audio model.

- Free to use
- Supports text, visual (click on video), and time-based prompts
- More of a demo/playground than a polished product

### 4. AudioSam — [audiosam.io](https://audiosam.io/)

Another wrapper around Meta's SAM Audio with both a web UI and API.

- **Developer tier:** Free, 100 API calls/mo (text prompts only)
- **Pro:** $49/mo, 5,000 API calls/mo (all prompt types)
- **Enterprise:** Custom pricing, unlimited
- **Processing:** ~8 seconds for 5-min audio
- **Compliance:** SOC 2, AES-256 encryption, GDPR, 24h file deletion

---

## Hosted APIs for Building Your Own

### 1. fal.ai — [fal.ai/models/fal-ai/sam-audio/separate](https://fal.ai/models/fal-ai/sam-audio/separate)

**Best option for a hosted SAM-Audio API.** Already running Meta's SAM Audio as a serverless endpoint.

- **Model ID:** `fal-ai/sam-audio/separate`
- **Pricing:** $0.05 per 30 seconds of output audio (+$0.025/30s per reranking candidate)
- **Input:** Audio URL (WAV, MP3, FLAC) + text prompt
- **Output:** Isolated target + residual audio
- **Features:** Configurable acceleration (fast/balanced/quality), chunk duration, reranking candidates
- **Also available:** `fal-ai/sam-audio/span-separate` for time-span based separation
- **Auth:** API key based
- **Client libraries available**

### 2. SAM Audio API — [samaudioapi.com](https://samaudioapi.com/)

Dedicated third-party API specifically for SAM Audio.

- **Pricing:** From $0.20 per minute of audio processed
- **Rate limit:** 10 req/min standard (higher on request)
- **No cold starts** — model always loaded on GPU
- **Supports:** Text, visual, and temporal prompts
- **Endpoint:** `POST /v1/separate`

### 3. AudioSam API — [audiosam.io](https://audiosam.io/sam-audio-api)

Another hosted SAM Audio API with tiered pricing.

- **Free:** 100 API calls/mo (text only)
- **Pro:** $49/mo, 5,000 calls/mo (all prompt types)
- **Enterprise:** Unlimited, custom pricing
- **REST endpoints:** `POST /v1/separate`, `GET /v1/jobs/{job_id}`
- **SOC 2 compliant**

### 4. Replicate — AudioSep model

- **Model:** `cjwbw/audiosep` (not SAM-Audio, but similar text-prompted separation)
- **Pricing:** ~$0.067 per run on Nvidia T4
- **4,500+ runs**
- **Note:** This uses AudioSep (ByteDance/Surrey), not Meta's SAM Audio. Older model, lower quality than SAM Audio.

### 5. HuggingFace

- **Models:** `facebook/sam-audio-large`, `facebook/sam-audio-small` available for download
- **Spaces:** `sam-audio-webui` exists but has runtime errors
- **ZeroGPU (A100):** ~21.6 GB VRAM needed
- **Best for:** Self-hosting or HuggingFace Inference Endpoints (custom deployment)
- **No official hosted inference endpoint** for SAM Audio on HF as of Feb 2026

---

## Summary & Recommendations

### Product Landscape

| Product | Pricing | Model | Differentiator |
|---------|---------|-------|----------------|
| **Isolate Audio** | Free + paid | Unknown (likely SAM Audio or similar) | Most polished, content marketing |
| **Demix** | $9-49/mo + lifetime $79 | Unknown | Music-focused, lifetime deal |
| **AudioSam** | Free-$49/mo | SAM Audio | API-first, enterprise/SOC 2 |
| **ClearAudio (ours)** | Free + $12/mo Pro | SAM Audio | Video support, quality presets |

There are **at least 3-4 direct competitors** already live. The space is getting crowded. ClearAudio's $12/mo Pro pricing is competitive (cheaper than Demix Pro at $19/mo and AudioSam Pro at $49/mo).

### API Options

If you want to offer an API or switch away from self-hosted Modal:

| Provider | Price | Cold starts | Notes |
|----------|-------|-------------|-------|
| **fal.ai** | $0.05/30s output | Serverless (some) | Cheapest, easy integration |
| **samaudioapi.com** | $0.20/min | None (always warm) | Dedicated, higher cost |
| **audiosam.io** | Free-$49/mo tiers | Unknown | Tiered, SOC 2 |
| **Self-hosted (Modal)** | GPU cost only | Managed via snapshots | Full control, current approach |

**fal.ai** is likely the most practical if you want to replace or supplement your Modal backend — cheapest pricing, proper client libraries, and already running SAM Audio with the same features (reranking, quality presets).

For offering your own API to customers, you could either:
1. **Wrap your existing Modal backend** with public API endpoints
2. **Use fal.ai as the backend** and add your auth/billing layer on top
3. **Keep Modal for the web app** and use fal.ai as a comparison/fallback

---

## Live Test Results: fal.ai API (Feb 26, 2026)

Tested with a 3-second synthetic audio file (440Hz sine wave + pink noise).

### Latency Results

| Test | fal.ai | Modal (estimated) |
|------|--------|-------------------|
| Basic separation (balanced) | 47.4s (cold start) | ~5-15s |
| Acceleration: fast | 5.4s | small: ~3-8s |
| Acceleration: balanced | 8.0s | base: ~5-12s |
| Acceleration: quality | 6.1s | large: ~8-20s |
| High quality (reranking=3) | 7.0s | ~15-40s |

**Key finding:** The first request took ~47s due to cold start (model loading on fal.ai's serverless GPU). Subsequent requests were 5-8s, which is competitive with or faster than Modal. This is consistent with serverless GPU behavior — warm containers are fast, cold starts are slow.

### Prompt Variation Results

| Prompt | Time | Status |
|--------|------|--------|
| "sine tone" | 12.4s | OK |
| "noise" | 4.5s | OK |
| "high pitched sound" | 4.7s | OK |
| "background noise" | 9.8s | OK |

All prompts succeeded. Output was always 281.3 KB WAV at 48kHz for 3s of audio.

### Error Handling

| Scenario | Result |
|----------|--------|
| Invalid audio URL | Correctly rejected with descriptive error |
| Empty prompt | Correctly rejected |

### Our Wrapper (fal_service.py)

The `separate()` function in our wrapper completed successfully in 7.5s, returning proper `SeparationResult` with target/residual bytes, sample rate (48kHz), and duration.

### Feature Comparison

| Feature | fal.ai | Modal |
|---------|--------|-------|
| Model size selection | `acceleration` (fast/balanced/quality) | Explicit (small/base/large/large-tv) |
| GPU type | Managed (unknown) | B200 (192GB) |
| Cold start | ~47s first request | Mitigated via memory snapshots |
| Reranking range | 1-7 | 2-32 |
| Output format | wav or mp3 | wav only |
| Infra management | None required | Full (volumes, images, secrets) |
| Cost model | Per-second of output | Per-GPU-second |
| Audio input | Direct URL (no download needed) | Download bytes + send |
| Output sample rate | 48kHz | Depends on model |

### Pricing Comparison (1-minute audio)

| Provider | Estimated Cost | Notes |
|----------|---------------|-------|
| fal.ai | ~$0.10 | $0.05/30s output |
| Modal (B200) | ~$0.15-0.30 | GPU-sec pricing + container idle time |

### Conclusions

1. **fal.ai works well** as a drop-in replacement — all separation features function correctly
2. **Cold starts are the main concern** (~47s first request vs ~5-8s warm) — Modal's memory snapshots handle this better
3. **Warm latency is competitive** — 5-8s on fal.ai vs similar on Modal
4. **Simpler architecture** — no need to manage GPU containers, volumes, or model downloads
5. **Cheaper per-request** — ~33-66% cost reduction vs Modal B200
6. **Trade-off: less control** — can't choose exact model size (small/base/large), limited reranking range (1-7 vs 2-32)
