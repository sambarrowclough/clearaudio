"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { AudioPlayer } from "@/components/AudioPlayer";
import { authClient } from "@/lib/auth-client";
import { PLANS, type PlanType } from "@/lib/stripe";
import * as Switch from "@radix-ui/react-switch";
import * as Slider from "@radix-ui/react-slider";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, Lock, Github } from "lucide-react";
import {
  IconFast,
  IconBalanced,
  IconQuality,
  IconVideo,
} from "@/components/MacIcons";
import { SignInModal } from "@/components/SignInModal";

type ModelSize = "small" | "base" | "large" | "large-tv";

interface ProcessingResult {
  target_url: string;
  residual_url: string;
  sample_rate: number;
}

interface UsageData {
  plan: PlanType;
  used: number;
  limit: number;
  remaining: number;
}

const MODEL_OPTIONS: {
  id: ModelSize;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  requiresPro: boolean;
}[] = [
  {
    id: "small",
    name: "Small",
    description: "Quick processing",
    icon: IconFast,
    requiresPro: false,
  },
  {
    id: "base",
    name: "Base",
    description: "Speed & quality",
    icon: IconBalanced,
    requiresPro: false,
  },
  {
    id: "large",
    name: "Large",
    description: "Best quality",
    icon: IconQuality,
    requiresPro: true,
  },
  {
    id: "large-tv",
    name: "Large-TV",
    description: "For video files",
    icon: IconVideo,
    requiresPro: true,
  },
];

export default function Home() {
  const router = useRouter();
  const { data: session, refetch: refetchSession } = authClient.useSession();

  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [modelSize, setModelSize] = useState<ModelSize>("small");
  const [highQuality, setHighQuality] = useState(false);
  const [rerankingCandidates, setRerankingCandidates] = useState(8);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const pendingGenerationRef = useRef(false);

  const isPro = usage?.plan === "pro";

  // Fetch usage on mount and when session changes
  useEffect(() => {
    if (session?.user) {
      fetchUsage();
    } else {
      setUsage(null);
    }
  }, [session?.user]);

  const fetchUsage = async () => {
    setIsUsageLoading(true);
    try {
      const response = await fetch("/api/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    } finally {
      setIsUsageLoading(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setOriginalUrl(null);
      setError(null);
      setTimeout(() => descriptionInputRef.current?.focus(), 0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
      setOriginalUrl(null);
      setError(null);
      setTimeout(() => descriptionInputRef.current?.focus(), 0);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleProcess = async () => {
    if (!file || !description.trim()) return;

    // Check if user is signed in - show modal instead of redirect
    if (!session?.user) {
      pendingGenerationRef.current = true;
      setShowSignInModal(true);
      return;
    }

    // Proceed with processing
    doProcess();
  };

  const handleModelSelect = (model: (typeof MODEL_OPTIONS)[0]) => {
    if (model.requiresPro && !isPro) {
      // Still allow selection but show indicator
      setModelSize(model.id);
    } else {
      setModelSize(model.id);
    }
  };

  const handleSignInSuccess = async () => {
    // Force refetch the session to update React state
    await refetchSession();
    
    // Get fresh session data directly (not from hook state which may be stale)
    const { data: freshSession } = await authClient.getSession();
    
    if (!freshSession?.user) {
      // Session still not available, something went wrong
      console.error("Session not available after sign in");
      return;
    }
    
    // Refetch usage data
    await fetchUsage();
    
    // Auto-trigger generation if there was a pending one
    if (pendingGenerationRef.current && file && description.trim()) {
      pendingGenerationRef.current = false;
      // Call the processing logic directly instead of handleProcess
      // since handleProcess would check the stale session state
      doProcess();
    }
  };

  // Extracted processing logic that doesn't check session (already verified)
  const doProcess = async () => {
    if (!file || !description.trim()) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Server-side authorization check BEFORE expensive GPU processing
      // This prevents bypassing usage limits with stale client-side data
      const authResponse = await fetch("/api/generation/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelSize,
          highQuality,
          fileSizeBytes: file.size,
        }),
      });

      if (!authResponse.ok) {
        const authError = await authResponse.json().catch(() => ({ error: "Authorization failed" }));
        
        if (authError.code === "USAGE_LIMIT_EXCEEDED") {
          // Update local usage state with server values and show upgrade modal
          fetchUsage();
          setShowUpgradeModal(true);
          return;
        }
        
        // Feature access denied or other error
        throw new Error(authError.error || "Authorization failed");
      }

      // Authorization passed - update local usage with fresh server data
      const authData = await authResponse.json();
      if (authData.usage) {
        // Optionally sync local state (fetchUsage will do this properly)
      }

      // Upload file directly to Vercel Blob (bypasses 4.5MB limit)
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      // Store the original URL for playback
      setOriginalUrl(blob.url);

      // Send blob URL to engine instead of file bytes
      const formData = new FormData();
      formData.append("audio_url", blob.url);
      formData.append("description", description);
      formData.append("model_size", modelSize);
      formData.append("high_quality", highQuality.toString());
      formData.append("reranking_candidates", rerankingCandidates.toString());

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/separate`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Processing failed");
      }

      const data: ProcessingResult = await response.json();

      // Record the generation and get shareId
      const genResponse = await fetch("/api/generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelSize,
          highQuality,
          fileSizeBytes: file.size,
          originalUrl: blob.url,
          targetUrl: data.target_url,
          residualUrl: data.residual_url,
          description,
        }),
      });

      if (genResponse.ok) {
        const { shareId } = await genResponse.json();
        // Redirect to the share page
        router.push(`/g/${shareId}`);
      } else {
        // Parse error response and handle accordingly
        const errorData = await genResponse.json().catch(() => ({ error: "Unknown error" }));
        
        if (genResponse.status === 403) {
          // Usage limit exceeded (race condition) or feature access denied
          console.error("Generation recording failed - access denied:", errorData.error);
          setError(`Unable to save: ${errorData.error || "Usage limit exceeded"}. Your audio is available below but won't be saved to your account.`);
        } else {
          // Server error or other failure
          console.error("Generation recording failed:", genResponse.status, errorData);
          setError("Warning: Your processed audio couldn't be saved to your account. It's available below but won't appear in your history.");
        }
        
        // Still show results locally so user can access their processed audio
        setResult(data);
        setOriginalUrl(blob.url);
        fetchUsage(); // Refresh usage to show accurate count
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProcessing(false);
    }
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
        {/* Header with Auth/Usage */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          {session?.user ? (
            <>
              {/* Usage indicator */}
              {usage && (
                <div style={{ fontSize: "12px" }}>
                  <span style={{ opacity: 0.6 }}>
                    {usage.used}/{usage.limit} cleanings
                  </span>
                  {isPro && (
                    <span
                      style={{
                        marginLeft: "8px",
                        background: "var(--mac-black)",
                        color: "var(--mac-white)",
                        padding: "2px 6px",
                        fontSize: "10px",
                      }}
                    >
                      PRO
                    </span>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <a
                  href="https://github.com/sambarrowclough/clearaudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    border: "1px solid var(--mac-black)",
                    background: "none",
                    cursor: "pointer",
                  }}
                  title="View on GitHub"
                >
                  <Github size={16} strokeWidth={2} />
                </a>
                {!isPro && (
                  <button
                    onClick={() => router.push("/pricing")}
                    style={{
                      background: "var(--mac-black)",
                      color: "var(--mac-white)",
                      border: "none",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontFamily: "var(--font-chicago)",
                      cursor: "pointer",
                    }}
                  >
                    Upgrade
                  </button>
                )}
                <button
                  onClick={() => router.push("/account")}
                  style={{
                    background: "none",
                    border: "1px solid var(--mac-black)",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontFamily: "var(--font-chicago)",
                    cursor: "pointer",
                  }}
                >
                  Account
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "12px", opacity: 0.6 }}>
                Sign in to clean audio
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <a
                  href="https://github.com/sambarrowclough/clearaudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    border: "1px solid var(--mac-black)",
                    background: "none",
                    cursor: "pointer",
                  }}
                  title="View on GitHub"
                >
                  <Github size={16} strokeWidth={2} />
                </a>
                <button
                  onClick={() => router.push("/sign-in")}
                  className="mac-button"
                  style={{ padding: "4px 12px", fontSize: "12px" }}
                >
                  Sign In
                </button>
              </div>
            </>
          )}
        </div>

        {/* Drop Zone */}
        <div
          className={`mac-drop-zone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileChange}
            className="hidden"
            style={{ display: "none" }}
          />

          {file ? (
            <>
              <div className="mac-document-icon" />
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                {file.name}
              </div>
              <div style={{ fontSize: "14px", marginTop: "8px" }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setResult(null);
                  setOriginalUrl(null);
                }}
                className="mac-button"
                style={{ marginTop: "12px" }}
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <div className="mac-folder-icon" />
              <div style={{ fontSize: "18px" }}>Drop audio file here</div>
              <div style={{ fontSize: "14px", marginTop: "8px" }}>
                or click to browse
              </div>
            </>
          )}
        </div>

        {/* Try Demo Link */}
        {!file && !result && (
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <button
              onClick={() => setShowDemo(!showDemo)}
              style={{
                background: "none",
                border: "none",
                fontFamily: "var(--font-chicago)",
                fontSize: "13px",
                textDecoration: "underline",
                cursor: "pointer",
                opacity: 0.7,
              }}
            >
              {showDemo ? "hide example" : "or try an example"}
            </button>
          </div>
        )}

        {/* Demo Example */}
        {showDemo && !file && !result && (
          <div className="mac-results">
            <div
              style={{
                textAlign: "center",
                marginBottom: "16px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Example: Isolating speech from background noise
            </div>

            {/* Original Audio */}
            <div className="mac-result-item">
              <div className="mac-result-header">
                <span style={{ fontWeight: "bold" }}>Original Audio</span>
              </div>
              <AudioPlayer src="/clearaudio-demo1.wav" />
            </div>

            {/* Cleaned Audio */}
            <div className="mac-result-item">
              <div className="mac-result-header">
                <span style={{ fontWeight: "bold" }}>Cleaned Audio</span>
              </div>
              <AudioPlayer src="/cleaned.wav" />
            </div>

            {/* Removed Sounds */}
            <div className="mac-result-item">
              <div className="mac-result-header">
                <span style={{ fontWeight: "bold" }}>Removed Sounds</span>
              </div>
              <AudioPlayer src="/removed.wav" />
            </div>
          </div>
        )}

        {/* Description Input */}
        <div>
          <label className="mac-label">What do you want to keep?</label>
          <input
            ref={descriptionInputRef}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type or select below..."
            className="mac-input"
          />
          {/* Common Prompts */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "10px",
            }}
          >
            {[
              "the speaker",
              "vocals only",
              "the music",
              "speech",
              "dialogue",
              "background music",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setDescription(prompt)}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontFamily: "var(--font-chicago)",
                  background:
                    description === prompt
                      ? "var(--mac-black)"
                      : "var(--mac-white)",
                  color:
                    description === prompt
                      ? "var(--mac-white)"
                      : "var(--mac-black)",
                  border: "2px solid var(--mac-black)",
                  cursor: "pointer",
                  boxShadow:
                    description === prompt
                      ? "inset 2px 2px 0 #666"
                      : "inset -1px -1px 0 var(--mac-black), inset 1px 1px 0 var(--mac-white)",
                  transition: "all 100ms",
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="mac-label">Quality</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            {MODEL_OPTIONS.map((model) => {
              const IconComponent = model.icon;
              const isSelected = modelSize === model.id;
              const isLocked = model.requiresPro && !isPro;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleModelSelect(model)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "16px 12px",
                    fontFamily: "var(--font-chicago)",
                    border: "2px solid var(--mac-black)",
                    background: isSelected
                      ? "var(--mac-black)"
                      : "var(--mac-white)",
                    color: isSelected ? "var(--mac-white)" : "var(--mac-black)",
                    cursor: "pointer",
                    boxShadow: isSelected
                      ? "inset 2px 2px 0 #666, inset -2px -2px 0 #333"
                      : "inset -2px -2px 0 var(--mac-black), inset 2px 2px 0 var(--mac-white)",
                    opacity: isLocked ? 0.6 : 1,
                    position: "relative",
                  }}
                >
                  {isLocked && (
                    <div
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: isSelected
                          ? "var(--mac-white)"
                          : "var(--mac-black)",
                        color: isSelected
                          ? "var(--mac-black)"
                          : "var(--mac-white)",
                        padding: "2px 4px",
                        fontSize: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <Lock size={8} />
                      PRO
                    </div>
                  )}
                  <IconComponent size={28} />
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      marginTop: "8px",
                    }}
                  >
                    {model.name}
                  </span>
                  <span
                    style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px" }}
                  >
                    {model.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Options */}
        <Collapsible.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <Collapsible.Trigger asChild>
            <button
              type="button"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                fontFamily: "var(--font-chicago)",
                fontSize: "14px",
                background: "var(--mac-white)",
                border: "2px solid var(--mac-black)",
                cursor: "pointer",
                boxShadow:
                  "inset -2px -2px 0 var(--mac-black), inset 2px 2px 0 var(--mac-white)",
              }}
            >
              <span>Advanced Options</span>
              <ChevronDown
                size={18}
                strokeWidth={2}
                style={{
                  transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 150ms",
                }}
              />
            </button>
          </Collapsible.Trigger>

          <Collapsible.Content>
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* High Quality Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px",
                  border: "2px solid var(--mac-black)",
                  background: "var(--mac-white)",
                  opacity: !isPro ? 0.6 : 1,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    High Quality Mode
                    {!isPro && <Lock size={12} />}
                  </div>
                  <div
                    style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px" }}
                  >
                    {isPro
                      ? "Slower, but better separation"
                      : "Requires Pro plan"}
                  </div>
                </div>
                <Switch.Root
                  checked={highQuality}
                  onCheckedChange={setHighQuality}
                  disabled={!isPro}
                  style={{
                    width: "42px",
                    height: "24px",
                    background: highQuality
                      ? "var(--mac-black)"
                      : "var(--mac-white)",
                    border: "2px solid var(--mac-black)",
                    padding: 0,
                    cursor: isPro ? "pointer" : "not-allowed",
                    position: "relative",
                    boxShadow: "inset 2px 2px 0 rgba(0,0,0,0.1)",
                  }}
                >
                  <Switch.Thumb
                    style={{
                      display: "block",
                      width: "16px",
                      height: "16px",
                      background: highQuality
                        ? "var(--mac-white)"
                        : "var(--mac-black)",
                      border: "2px solid var(--mac-black)",
                      transform: highQuality
                        ? "translateX(20px)"
                        : "translateX(2px)",
                      transition: "transform 100ms",
                    }}
                  />
                </Switch.Root>
              </div>

              {/* Reranking Candidates Slider */}
              <div
                style={{
                  padding: "12px",
                  border: "2px solid var(--mac-black)",
                  background: "var(--mac-white)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                      Candidates
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        opacity: 0.7,
                        marginTop: "2px",
                      }}
                    >
                      More = better quality, slower
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      background: "var(--mac-black)",
                      color: "var(--mac-white)",
                      padding: "4px 12px",
                      minWidth: "48px",
                      textAlign: "center",
                    }}
                  >
                    {rerankingCandidates}
                  </div>
                </div>
                <Slider.Root
                  value={[rerankingCandidates]}
                  onValueChange={(value) => setRerankingCandidates(value[0])}
                  min={2}
                  max={32}
                  step={1}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    height: "20px",
                    cursor: "pointer",
                  }}
                >
                  <Slider.Track
                    style={{
                      background: "var(--mac-white)",
                      border: "2px solid var(--mac-black)",
                      boxShadow:
                        "inset 2px 2px 0 var(--mac-black), inset -2px -2px 0 var(--mac-white)",
                      position: "relative",
                      flexGrow: 1,
                      height: "12px",
                    }}
                  >
                    <Slider.Range
                      style={{
                        position: "absolute",
                        background: "var(--mac-black)",
                        height: "100%",
                      }}
                    />
                  </Slider.Track>
                  <Slider.Thumb
                    style={{
                      display: "block",
                      width: "16px",
                      height: "24px",
                      background: "var(--mac-white)",
                      border: "2px solid var(--mac-black)",
                      boxShadow:
                        "inset -2px -2px 0 var(--mac-black), inset 2px 2px 0 var(--mac-white)",
                      cursor: "grab",
                    }}
                  />
                </Slider.Root>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "4px",
                    fontSize: "10px",
                    opacity: 0.5,
                  }}
                >
                  <span>2</span>
                  <span>32</span>
                </div>
              </div>
            </div>
          </Collapsible.Content>
        </Collapsible.Root>

        {/* Process Button */}
        <div className="mac-text-center">
          <button
            onClick={handleProcess}
            disabled={!file || !description.trim() || isProcessing}
            className="mac-button mac-button-primary"
          >
            {isProcessing ? (
              <span
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span className="mac-loading" />
                Processing...
              </span>
            ) : (
              "Clean Audio"
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mac-error">
            <div className="mac-error-icon">!</div>
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mac-results">
            <div className="mac-divider" />

            {/* Original Audio */}
            {originalUrl && (
              <div className="mac-result-item">
                <div className="mac-result-header">
                  <span style={{ fontWeight: "bold" }}>Original Audio</span>
                  <button
                    onClick={() =>
                      handleDownload(
                        originalUrl,
                        `original.${file?.name.split(".").pop() || "wav"}`
                      )
                    }
                    className="mac-download-button"
                  >
                    Download
                  </button>
                </div>
                <AudioPlayer src={originalUrl} />
              </div>
            )}

            {/* Isolated Audio */}
            <div className="mac-result-item">
              <div className="mac-result-header">
                <span style={{ fontWeight: "bold" }}>Cleaned Audio</span>
                <button
                  onClick={() => handleDownload(result.target_url, "cleaned.wav")}
                  className="mac-download-button"
                >
                  Download
                </button>
              </div>
              <AudioPlayer src={result.target_url} />
            </div>

            {/* Residual Audio */}
            <div className="mac-result-item">
              <div className="mac-result-header">
                <span style={{ fontWeight: "bold" }}>Removed Sounds</span>
                <button
                  onClick={() =>
                    handleDownload(result.residual_url, "removed.wav")
                  }
                  className="mac-download-button"
                >
                  Download
                </button>
              </div>
              <AudioPlayer src={result.residual_url} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "12px",
            borderTop: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          {/* Legal Links */}
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
                transition: "opacity 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
            >
              Pricing
            </a>
            <a
              href="/terms"
              style={{
                opacity: 0.5,
                textDecoration: "none",
                transition: "opacity 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
            >
              Terms
            </a>
            <a
              href="/privacy"
              style={{
                opacity: 0.5,
                textDecoration: "none",
                transition: "opacity 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
            >
              Privacy
            </a>
          </div>

          {/* Attribution */}
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

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            style={{
              background: "var(--mac-white)",
              border: "3px solid var(--mac-black)",
              boxShadow: "6px 6px 0 var(--mac-black)",
              padding: "24px",
              maxWidth: "400px",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: "48px",
                marginBottom: "16px",
              }}
            >
              !
            </div>
            <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>
              You&apos;ve used all your free cleanings
            </h2>
            <p
              style={{ fontSize: "13px", opacity: 0.7, marginBottom: "20px" }}
            >
              Upgrade to Pro for {PLANS.pro.generationsPerMonth} cleanings per
              month, all models, and high-quality mode.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="mac-button"
              >
                Maybe Later
              </button>
              <button
                onClick={() => router.push("/pricing")}
                className="mac-button"
                style={{
                  background: "var(--mac-black)",
                  color: "var(--mac-white)",
                }}
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign In Modal */}
      <SignInModal
        open={showSignInModal}
        onOpenChange={setShowSignInModal}
        onSuccess={handleSignInSuccess}
      />
    </div>
  );
}
