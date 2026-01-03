"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function GoogleAuthPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initiate Google OAuth sign-in
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/auth/callback",
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to initiate sign in");
    });
  }, []);

  if (error) {
    return (
      <div 
        className="mac-desktop" 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          minHeight: "100vh" 
        }}
      >
        <div className="mac-window" style={{ maxWidth: "360px", margin: "20px" }}>
          <div className="mac-title-bar">
            <div className="mac-close-box" />
            <span className="mac-title">Error</span>
            <div className="mac-resize" />
          </div>
          <div className="mac-content" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div className="mac-error">
              <div className="mac-error-icon">!</div>
              <span>{error}</span>
            </div>
            <button
              onClick={() => window.close()}
              className="mac-button"
              style={{ marginTop: "16px" }}
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="mac-desktop" 
      style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh" 
      }}
    >
      <div className="mac-window" style={{ maxWidth: "360px", margin: "20px" }}>
        <div className="mac-title-bar">
          <div className="mac-close-box" />
          <span className="mac-title">Signing In...</span>
          <div className="mac-resize" />
        </div>
        <div className="mac-content" style={{ textAlign: "center", padding: "32px 24px" }}>
          <div className="mac-loading" style={{ margin: "0 auto 20px" }} />
          <p style={{ fontSize: "14px" }}>Redirecting to Google...</p>
        </div>
      </div>
    </div>
  );
}

