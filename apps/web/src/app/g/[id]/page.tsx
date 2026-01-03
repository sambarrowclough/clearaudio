import { notFound } from "next/navigation";
import { getGenerationByShareId } from "@/lib/usage";
import { AudioPlayer } from "@/components/AudioPlayer";
import Link from "next/link";

// This page is public - no authentication required
// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const generation = await getGenerationByShareId(id);

  if (!generation) {
    notFound();
  }

  const handleDownload = async (url: string, filename: string) => {
    "use server";
    // Download is handled client-side
  };

  return (
    <div className="mac-window">
      {/* Title Bar */}
      <div className="mac-title-bar">
        <div className="mac-close-box" />
        <span className="mac-title">ClearAudio</span>
        <div className="mac-resize" />
      </div>

      {/* Content */}
      <div className="mac-content mac-space-y-12">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <div style={{ fontSize: "12px", opacity: 0.6 }}>Shared Generation</div>
          <Link
            href="/"
            className="mac-button"
            style={{ padding: "4px 12px", fontSize: "12px", textDecoration: "none" }}
          >
            Clean Your Own
          </Link>
        </div>


        {/* Results */}
        <div className="mac-results">
          {/* Cleaned Audio - THE HERO */}
          {generation.targetUrl && (
            <div className="mac-result-hero">
              <div className="mac-result-hero-label">
                <span>★</span>
                <span>Your Cleaned Audio</span>
                <span>★</span>
              </div>
              <div className="mac-result-hero-content">
                <div className="mac-result-header" style={{ marginBottom: "16px" }}>
                  <span style={{ fontWeight: "bold", fontSize: "18px" }}>
                    {generation.description ? `"${generation.description}"` : "Cleaned Audio"}
                  </span>
                  <DownloadButton url={generation.targetUrl} filename="cleaned.wav" isPrimary />
                </div>
                <AudioPlayer src={generation.targetUrl} />
              </div>
            </div>
          )}

          {/* Comparison Section */}
          <div style={{ 
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "2px dashed var(--mac-black)",
          }}>
            <div style={{ 
              fontSize: "12px", 
              opacity: 0.5, 
              textAlign: "center",
              marginBottom: "16px"
            }}>
              Compare with original
            </div>
            
            {/* Original Audio */}
            {generation.originalUrl && (
              <div className="mac-result-item mac-result-secondary">
                <div className="mac-result-header">
                  <span style={{ fontWeight: "bold", opacity: 0.7 }}>Original Audio</span>
                  <DownloadButton url={generation.originalUrl} filename="original.wav" />
                </div>
                <AudioPlayer src={generation.originalUrl} />
              </div>
            )}

            {/* Removed Sounds */}
            {generation.residualUrl && (
              <div className="mac-result-item mac-result-secondary" style={{ marginTop: "12px" }}>
                <div className="mac-result-header">
                  <span style={{ fontWeight: "bold", opacity: 0.7 }}>Removed Sounds</span>
                  <DownloadButton url={generation.residualUrl} filename="removed.wav" />
                </div>
                <AudioPlayer src={generation.residualUrl} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "12px",
            borderTop: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              fontSize: "11px",
            }}
          >
            <a
              href="/pricing"
              style={{
                opacity: 0.5,
                textDecoration: "none",
              }}
            >
              Pricing
            </a>
            <a
              href="/terms"
              style={{
                opacity: 0.5,
                textDecoration: "none",
              }}
            >
              Terms
            </a>
            <a
              href="/privacy"
              style={{
                opacity: 0.5,
                textDecoration: "none",
              }}
            >
              Privacy
            </a>
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: "10px",
              opacity: 0.4,
              marginTop: "10px",
            }}
          >
            Powered by{" "}
            <a
              href="https://github.com/facebookresearch/sam-audio"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              SAM-Audio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client component for download
function DownloadButton({ url, filename, isPrimary }: { url: string; filename: string; isPrimary?: boolean }) {
  return (
    <a
      href={url}
      download={filename}
      className={isPrimary ? "mac-download-button-primary" : "mac-download-button"}
    >
      ↓ Download
    </a>
  );
}

