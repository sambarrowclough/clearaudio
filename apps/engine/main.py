# Vercel entrypoint - imports the FastAPI app from the package
from src.engine.main import app

# Re-export for Vercel
__all__ = ["app"]



