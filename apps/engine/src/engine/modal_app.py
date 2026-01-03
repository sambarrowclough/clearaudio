"""Modal app for ClearAudio - serverless audio processing with SAM Audio."""

from pathlib import Path

import modal

app = modal.App("clearclean-audio")

# Volume for caching model weights
model_volume = modal.Volume.from_name("sam-audio-models", create_if_missing=True)
MODEL_DIR = Path("/models")

# Checkpoint directory for ImageBind weights
CHECKPOINT_DIR = MODEL_DIR / ".checkpoints"

# Define the container image with SAM Audio and dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg")
    .pip_install(
        "torch",
        "torchaudio",
        "numpy",
        "huggingface_hub",
        "git+https://github.com/facebookresearch/sam-audio.git",
    )
    .env({
        "HF_HUB_CACHE": str(MODEL_DIR),  # Cache HF models in volume
        "IMAGEBIND_CACHE_DIR": str(CHECKPOINT_DIR),  # Cache ImageBind in volume
        "TORCHINDUCTOR_CACHE_DIR": str(MODEL_DIR / ".torch_cache"),  # Persist torch.compile cache
    })
)


@app.function(
    image=image,
    volumes={MODEL_DIR: model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
    timeout=300,
)
def download_model(model_size: str = "large"):
    """Download and cache the SAM Audio model in the volume."""
    from huggingface_hub import snapshot_download
    
    model_id = f"facebook/sam-audio-{model_size}"
    local_dir = MODEL_DIR / model_id.replace("/", "--")
    
    print(f"Downloading {model_id} to {local_dir}...")
    snapshot_download(
        repo_id=model_id,
        local_dir=local_dir,
    )
    model_volume.commit()
    print(f"Model cached at {local_dir}")
    return str(local_dir)


@app.cls(
    image=image,
    gpu="B200",  # 192GB memory - plenty for large models
    timeout=600,
    volumes={MODEL_DIR: model_volume},
    secrets=[modal.Secret.from_name("huggingface-secret")],
    #buffer_containers=1,  # Keep 1 extra container ready during active periods
    scaledown_window=5,  # Keep idle containers alive for 5 seconds
    enable_memory_snapshot=True,  # CPU memory snapshots for faster cold starts
)
class AudioSeparator:
    """SAM Audio model class with cached model loading."""
    
    model_size: str = modal.parameter(default="large")
    
    @modal.enter(snap=True)
    def load_to_cpu(self):
        """Load the model to CPU memory - this gets snapshotted."""
        from sam_audio import SAMAudio, SAMAudioProcessor
        
        # Symlink .checkpoints to volume so ImageBind weights are cached
        checkpoint_dir = MODEL_DIR / ".checkpoints"
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        local_checkpoint = Path(".checkpoints")
        if not local_checkpoint.exists():
            local_checkpoint.symlink_to(checkpoint_dir)
            print(f"Symlinked .checkpoints -> {checkpoint_dir}")
        
        model_id = f"facebook/sam-audio-{self.model_size}"
        local_path = MODEL_DIR / model_id.replace("/", "--")
        
        # Track if we need to commit new downloads
        imagebind_path = checkpoint_dir / "imagebind_huge.pth"
        imagebind_existed = imagebind_path.exists()
        
        # Load model to CPU (not GPU) - will be moved to GPU after restore
        # Note: SAM Audio's CLAP ranker doesn't support bfloat16, so we use float32
        if local_path.exists():
            print(f"Loading model from cache: {local_path}")
            self.model = SAMAudio.from_pretrained(str(local_path)).to("cpu").eval()
            self.processor = SAMAudioProcessor.from_pretrained(str(local_path))
        else:
            print(f"Downloading model: {model_id}")
            self.model = SAMAudio.from_pretrained(model_id).to("cpu").eval()
            self.processor = SAMAudioProcessor.from_pretrained(model_id)
        
        print("Model loaded to CPU memory (will be snapshotted)")
        
        # Commit volume if ImageBind was just downloaded
        if not imagebind_existed and imagebind_path.exists():
            print(f"Caching ImageBind weights to volume...")
            model_volume.commit()
            print(f"ImageBind weights cached at {imagebind_path}")

    @modal.enter(snap=False)
    def move_to_gpu(self):
        """Move model to GPU after restoring from snapshot."""
        import torch  # Re-import to re-initialize GPU availability state
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        
        # Enable TF32 for faster matrix operations on Ampere+ GPUs (A100, H100, B200)
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
        print("TF32 enabled for matmul and cudnn")
        
        # Move model to GPU
        self.model = self.model.to(self.device)
        print("Model moved to GPU and ready!")

    @modal.method()
    def separate(
        self,
        audio_bytes: bytes,
        description: str,
        high_quality: bool = False,
        reranking_candidates: int = 8,
        source_url: str = "",
    ) -> dict:
        """
        Separate audio using SAM Audio with text prompting.
        
        Args:
            audio_bytes: Raw audio file bytes (wav, mp3, etc.)
            description: Text description of sound to isolate
            high_quality: Use span prediction and re-ranking (slower but better)
            reranking_candidates: Number of candidates for re-ranking (default 8, higher = better but slower)
            source_url: Optional URL where the audio was downloaded from (for logging)
            
        Returns:
            Dictionary with 'target' and 'residual' audio bytes (WAV format)
        """
        import os
        import tempfile
        import time
        
        import torch
        import torchaudio
        
        total_start = time.perf_counter()
        
        # Save input bytes to temp file (SAM Audio expects file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            temp_input_path = f.name
        
        # Load and analyze input audio
        try:
            waveform, sr = torchaudio.load(temp_input_path)
            input_duration = waveform.shape[1] / sr
        except Exception:
            input_duration = None
        
        # Log input
        print(f"\n[INPUT] {source_url if source_url else f'{len(audio_bytes):,} bytes'}")
        if input_duration:
            print(f"        {input_duration:.1f}s @ {sr}Hz")
        print(f"[PROMPT] \"{description}\"")
        print(f"[PARAMS] high_quality={high_quality}, reranking_candidates={reranking_candidates}")
        
        # Process
        inputs = self.processor(
            audios=[temp_input_path],
            descriptions=[description],
        ).to(self.device)
        
        with torch.inference_mode():
            if high_quality:
                result = self.model.separate(
                    inputs,
                    predict_spans=True,
                    reranking_candidates=reranking_candidates,
                )
            else:
                result = self.model.separate(inputs)
        
        torch.cuda.synchronize()
        
        sample_rate = self.processor.audio_sampling_rate
        
        # Convert tensors to bytes via temp file
        def tensor_to_wav_bytes(tensor: torch.Tensor, sr: int) -> bytes:
            # Ensure tensor is 2D (channels, samples)
            if tensor.dim() == 1:
                tensor = tensor.unsqueeze(0)
            
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                temp_path = f.name
            
            torchaudio.save(temp_path, tensor.cpu(), sr)
            
            with open(temp_path, "rb") as f:
                data = f.read()
            
            os.unlink(temp_path)
            return data
        
        # result.target and result.residual are lists of tensors
        target_tensor = result.target[0] if isinstance(result.target, list) else result.target
        residual_tensor = result.residual[0] if isinstance(result.residual, list) else result.residual
        
        target_bytes = tensor_to_wav_bytes(target_tensor, sample_rate)
        residual_bytes = tensor_to_wav_bytes(residual_tensor, sample_rate)
        
        # Calculate output duration
        target_duration = target_tensor.shape[-1] / sample_rate
        
        total_time = time.perf_counter() - total_start
        
        # Clean up temp file
        os.unlink(temp_input_path)
        
        # Log output
        print(f"[OUTPUT] {target_duration:.1f}s @ {sample_rate}Hz ({len(target_bytes) / 1024:.0f} KB)")
        print(f"[TIME] {total_time:.1f}s")
        
        return {
            "target": target_bytes,
            "residual": residual_bytes,
            "sample_rate": sample_rate,
            "input_duration": input_duration,
            "output_duration": target_duration,
            "processing_time": total_time,
        }


@app.local_entrypoint()
def main(
    audio_file: str = "",
    description: str = "",
    output_dir: str = ".",
    high_quality: bool = False,
    model_size: str = "large",
    reranking_candidates: int = 8,
    download_only: bool = False,
):
    """
    CLI entrypoint for audio separation.
    
    Usage:
        # Download and cache the model first (optional, runs automatically)
        uv run modal run src/engine/modal_app.py --download-only
        
        # Process audio
        uv run modal run src/engine/modal_app.py --audio-file input.wav --description "A man speaking"
        
        # High quality with more reranking candidates
        uv run modal run src/engine/modal_app.py --audio-file input.wav --description "A man speaking" --high-quality --reranking-candidates 16
        
        # Use large-tv model for video files
        uv run modal run src/engine/modal_app.py --audio-file video.mp4 --description "A man speaking" --model-size large-tv
    
    Available models:
        - small: Fastest
        - base: Balanced  
        - large: Best quality for audio
        - large-tv: Best for video files (visual prompting optimized)
    """
    from pathlib import Path
    
    if download_only:
        print(f"Downloading {model_size} model...")
        download_model.remote(model_size=model_size)
        print("Done!")
        return
    
    # Read input file
    audio_path = Path(audio_file)
    if not audio_path.exists():
        print(f"Error: File not found: {audio_file}")
        return
    
    print(f"Reading: {audio_file}")
    audio_bytes = audio_path.read_bytes()
    
    print(f"Sending to Modal for processing...")
    print(f"  Description: {description}")
    print(f"  High quality: {high_quality}")
    print(f"  Model size: {model_size}")
    if high_quality:
        print(f"  Reranking candidates: {reranking_candidates}")
    
    # Create separator instance and call
    separator = AudioSeparator(model_size=model_size)
    result = separator.separate.remote(
        audio_bytes=audio_bytes,
        description=description,
        high_quality=high_quality,
        reranking_candidates=reranking_candidates,
    )
    
    # Save outputs
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    target_path = output_path / "target.wav"
    residual_path = output_path / "residual.wav"
    
    target_path.write_bytes(result["target"])
    residual_path.write_bytes(result["residual"])
    
    print(f"\nSaved:")
    print(f"  Target (isolated): {target_path}")
    print(f"  Residual (everything else): {residual_path}")
