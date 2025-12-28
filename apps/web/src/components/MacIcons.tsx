"use client";

/**
 * Classic Mac System 1 style icons (1984)
 * Simple 1-bit pixel art inspired by Susan Kare's original designs
 */

interface IconProps {
  size?: number;
  className?: string;
}

// Lightning bolt - represents speed/fast
export function IconFast({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Classic Mac-style lightning bolt */}
      {/* Top diagonal going down-left */}
      <rect x="10" y="0" width="2" height="2" />
      <rect x="8" y="2" width="4" height="2" />
      <rect x="6" y="4" width="4" height="2" />
      {/* Middle horizontal bar */}
      <rect x="4" y="6" width="8" height="2" />
      {/* Bottom diagonal going down-left */}
      <rect x="6" y="8" width="4" height="2" />
      <rect x="4" y="10" width="4" height="2" />
      <rect x="2" y="12" width="4" height="2" />
      <rect x="2" y="14" width="2" height="2" />
    </svg>
  );
}

// Balance scale - represents balanced/equilibrium
export function IconBalanced({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Center pole */}
      <rect x="7" y="2" width="2" height="12" />
      {/* Top beam */}
      <rect x="1" y="2" width="14" height="2" />
      {/* Left pan */}
      <rect x="1" y="4" width="2" height="2" />
      <rect x="0" y="6" width="4" height="2" />
      {/* Right pan */}
      <rect x="13" y="4" width="2" height="2" />
      <rect x="12" y="6" width="4" height="2" />
      {/* Base */}
      <rect x="4" y="14" width="8" height="2" />
    </svg>
  );
}

// Star/sparkle - represents quality/best
export function IconQuality({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Pixelated star */}
      <rect x="7" y="0" width="2" height="4" />
      <rect x="7" y="12" width="2" height="4" />
      <rect x="0" y="7" width="4" height="2" />
      <rect x="12" y="7" width="4" height="2" />
      {/* Diagonal rays */}
      <rect x="2" y="2" width="2" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="10" y="4" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" />
    </svg>
  );
}

// Film frame - represents video
export function IconVideo({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Film border */}
      <rect x="0" y="0" width="16" height="2" />
      <rect x="0" y="14" width="16" height="2" />
      <rect x="0" y="0" width="2" height="16" />
      <rect x="14" y="0" width="2" height="16" />
      {/* Sprocket holes left */}
      <rect x="0" y="4" width="2" height="2" fill="var(--mac-white, #fff)" />
      <rect x="0" y="10" width="2" height="2" fill="var(--mac-white, #fff)" />
      {/* Sprocket holes right */}
      <rect x="14" y="4" width="2" height="2" fill="var(--mac-white, #fff)" />
      <rect x="14" y="10" width="2" height="2" fill="var(--mac-white, #fff)" />
      {/* Play triangle */}
      <rect x="6" y="5" width="2" height="6" />
      <rect x="8" y="6" width="2" height="4" />
      <rect x="10" y="7" width="2" height="2" />
    </svg>
  );
}

