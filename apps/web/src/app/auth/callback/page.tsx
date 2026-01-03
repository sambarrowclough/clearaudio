"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for error parameters
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(error);
      return;
    }

    // Notify the opener window that auth was successful
    if (window.opener) {
      try {
        window.opener.postMessage({ type: "oauth-callback-success" }, window.location.origin);
        setStatus("success");
        
        // Close the popup after a short delay
        setTimeout(() => {
          window.close();
        }, 1000);
      } catch (err) {
        console.error("Failed to communicate with opener:", err);
        setStatus("error");
        setErrorMessage("Failed to complete sign in. Please close this window and try again.");
      }
    } else {
      // If there's no opener, redirect to home (direct navigation to callback)
      window.location.href = "/";
    }
  }, []);

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
          <span className="mac-title">
            {status === "loading" ? "Signing In..." : status === "success" ? "Success" : "Error"}
          </span>
          <div className="mac-resize" />
        </div>

        <div className="mac-content" style={{ textAlign: "center", padding: "32px 24px" }}>
          {status === "loading" && (
            <>
              <div className="mac-loading" style={{ margin: "0 auto 20px" }} />
              <p style={{ fontSize: "14px" }}>Completing sign in...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div style={{ 
                width: "48px", 
                height: "48px", 
                margin: "0 auto 20px",
                border: "3px solid var(--mac-black)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px"
              }}>
                ✓
              </div>
              <p style={{ fontSize: "14px", marginBottom: "8px" }}>
                Sign in successful!
              </p>
              <p style={{ fontSize: "12px", opacity: 0.6 }}>
                This window will close automatically...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div style={{ 
                width: "48px", 
                height: "48px", 
                margin: "0 auto 20px",
                border: "3px solid var(--mac-black)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px"
              }}>
                !
              </div>
              <p style={{ fontSize: "14px", marginBottom: "8px" }}>
                Sign in failed
              </p>
              {errorMessage && (
                <p style={{ fontSize: "12px", opacity: 0.6, marginBottom: "16px" }}>
                  {errorMessage}
                </p>
              )}
              <button
                onClick={() => window.close()}
                className="mac-button"
              >
                Close Window
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

