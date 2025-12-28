"use client";

import { useState, useRef, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { AudioPlayer } from "@/components/AudioPlayer";
import * as Switch from "@radix-ui/react-switch";
import * as Slider from "@radix-ui/react-slider";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import {
  IconFast,
  IconBalanced,
  IconQuality,
  IconVideo,
} from "@/components/MacIcons";

type ModelSize = "small" | "base" | "large" | "large-tv";

interface ProcessingResult {
  target_url: string;
  residual_url: string;
  sample_rate: number;
}

const MODEL_OPTIONS: {
  id: ModelSize;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    id: "small",
    name: "Small",
    description: "Quick processing",
    icon: IconFast,
  },
  {
    id: "base",
    name: "Base",
    description: "Speed & quality",
    icon: IconBalanced,
  },
  {
    id: "large",
    name: "Large",
    description: "Best quality",
    icon: IconQuality,
  },
  {
    id: "large-tv",
    name: "Large-TV",
    description: "For video files",
    icon: IconVideo,
  },
];

export default function Home() {
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

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

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
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
      setResult(data);
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
            <div style={{ 
              textAlign: "center", 
              marginBottom: "16px",
              fontSize: "14px",
              fontWeight: "bold",
            }}>
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
            placeholder="e.g. the speaker, the voice, the music..."
            className="mac-input"
          />
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
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setModelSize(model.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "16px 12px",
                    fontFamily: "var(--font-chicago)",
                    border: "2px solid var(--mac-black)",
                    background: isSelected ? "var(--mac-black)" : "var(--mac-white)",
                    color: isSelected ? "var(--mac-white)" : "var(--mac-black)",
                    cursor: "pointer",
                    boxShadow: isSelected 
                      ? "inset 2px 2px 0 #666, inset -2px -2px 0 #333" 
                      : "inset -2px -2px 0 var(--mac-black), inset 2px 2px 0 var(--mac-white)",
                  }}
                >
                  <IconComponent size={28} />
                  <span style={{ fontWeight: "bold", fontSize: "14px", marginTop: "8px" }}>
                    {model.name}
                  </span>
                  <span style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>
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
                boxShadow: "inset -2px -2px 0 var(--mac-black), inset 2px 2px 0 var(--mac-white)",
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
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* High Quality Toggle */}
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  padding: "12px",
                  border: "2px solid var(--mac-black)",
                  background: "var(--mac-white)",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>High Quality Mode</div>
                  <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>
                    Slower, but better separation
                  </div>
                </div>
                <Switch.Root
                  checked={highQuality}
                  onCheckedChange={setHighQuality}
                  style={{
                    width: "42px",
                    height: "24px",
                    background: highQuality ? "var(--mac-black)" : "var(--mac-white)",
                    border: "2px solid var(--mac-black)",
                    padding: 0,
                    cursor: "pointer",
                    position: "relative",
                    boxShadow: "inset 2px 2px 0 rgba(0,0,0,0.1)",
                  }}
                >
                  <Switch.Thumb
                    style={{
                      display: "block",
                      width: "16px",
                      height: "16px",
                      background: highQuality ? "var(--mac-white)" : "var(--mac-black)",
                      border: "2px solid var(--mac-black)",
                      transform: highQuality ? "translateX(20px)" : "translateX(2px)",
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>Candidates</div>
                    <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px" }}>
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
                      boxShadow: "inset 2px 2px 0 var(--mac-black), inset -2px -2px 0 var(--mac-white)",
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
                      boxShadow: "inset -2px -2px 0 var(--mac-black), inset 2px 2px 0 var(--mac-white)",
                      cursor: "grab",
                    }}
                  />
                </Slider.Root>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "10px", opacity: 0.5 }}>
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
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                    onClick={() => handleDownload(originalUrl, `original.${file?.name.split('.').pop() || 'wav'}`)}
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
                  onClick={() => handleDownload(result.residual_url, "removed.wav")}
                  className="mac-download-button"
                >
                  Download
                </button>
              </div>
              <AudioPlayer src={result.residual_url} />
            </div>
          </div>
        )}

        {/* Attribution Footer */}
        <div style={{ 
          textAlign: "center", 
          fontSize: "11px", 
          opacity: 0.6, 
          marginTop: "24px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(0,0,0,0.1)"
        }}>
          Powered by{" "}
          <a 
            href="https://github.com/facebookresearch/sam-audio" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            SAM-Audio
          </a>
          {" "}from Meta
        </div>
      </div>
    </div>
  );
}
