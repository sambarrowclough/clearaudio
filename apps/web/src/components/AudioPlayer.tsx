"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface AudioPlayerProps {
  src: string;
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Track dragging state in a ref to avoid dependency issues
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleDurationChange = () => {
      // Fallback for when duration becomes available
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
      }
    };

    const handleTimeUpdate = () => {
      if (!isDraggingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    // Force load the audio
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const progressBar = progressRef.current;
      if (!audio || !progressBar) return;

      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percentage * duration;

      audio.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const audio = audioRef.current;
      const progressBar = progressRef.current;
      if (!audio || !progressBar) return;

      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percentage * duration;

      audio.currentTime = newTime;
      setCurrentTime(newTime);
      setIsDragging(false);
    },
    [isDragging, duration]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const progressBar = progressRef.current;
      if (!progressBar) return;

      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percentage * duration;

      setCurrentTime(newTime);
    },
    [isDragging, duration]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDragging, handleMouseUp, handleMouseMove]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className="mac-audio-player">
        <div className="mac-audio-controls" style={{ opacity: 0.5 }}>
          <span style={{ fontSize: "11px", color: "var(--mac-black)" }}>
            ⚠ Audio unavailable
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mac-audio-player">
      <audio ref={audioRef} src={src} preload="auto" />

      <div className="mac-audio-controls">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="mac-play-button"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <span className="mac-loading" style={{ width: 12, height: 12 }} />
          ) : isPlaying ? (
            // Pause icon - two vertical bars
            <svg viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="1" width="3" height="10" />
              <rect x="7" y="1" width="3" height="10" />
            </svg>
          ) : (
            // Play icon - triangle
            <svg viewBox="0 0 12 12" fill="currentColor">
              <polygon points="2,1 2,11 11,6" />
            </svg>
          )}
        </button>

        {/* Progress Bar */}
        <div
          ref={progressRef}
          className="mac-progress-container"
          onClick={handleProgressClick}
          onMouseDown={handleMouseDown}
        >
          <div
            className="mac-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time Display */}
        <span className="mac-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
