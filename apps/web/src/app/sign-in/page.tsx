"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: "/",
      });
      if (result.error) {
        setError(result.error.message || "Failed to send magic link");
      } else {
        setMagicLinkSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mac-desktop" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="mac-window" style={{ maxWidth: "420px" }}>
        {/* Title Bar */}
        <div className="mac-title-bar">
          <Link href="/" style={{ textDecoration: "none" }}>
            <div className="mac-close-box" />
          </Link>
          <span className="mac-title">Sign In</span>
          <div className="mac-resize" />
        </div>

        {/* Content */}
        <div className="mac-content">
          {magicLinkSent ? (
            /* Magic Link Sent State */
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                width: "64px", 
                height: "52px", 
                margin: "0 auto 24px",
                border: "3px solid var(--mac-black)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px"
              }}>
                ✉
              </div>
              <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>Check your email</h2>
              <p style={{ fontSize: "14px", marginBottom: "24px", opacity: 0.7 }}>
                We sent a magic link to<br />
                <strong>{email}</strong>
              </p>
              <button
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail("");
                }}
                className="mac-button"
              >
                Try different email
              </button>
            </div>
          ) : (
            /* Sign In Form */
            <>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <p style={{ fontSize: "14px", opacity: 0.7 }}>
                  Sign in to save your audio projects
                </p>
              </div>

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="mac-button"
                style={{ 
                  width: "100%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  gap: "12px",
                  padding: "14px 20px",
                  fontSize: "16px",
                  marginBottom: "20px"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "16px", 
                marginBottom: "20px" 
              }}>
                <div className="mac-divider" style={{ flex: 1, margin: 0 }} />
                <span style={{ fontSize: "12px", opacity: 0.5 }}>or</span>
                <div className="mac-divider" style={{ flex: 1, margin: 0 }} />
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleMagicLink}>
                <label className="mac-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mac-input"
                  required
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="mac-button mac-button-primary"
                  style={{ width: "100%", marginTop: "16px" }}
                >
                  {isLoading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="mac-loading" />
                      Sending...
                    </span>
                  ) : (
                    "Send Magic Link"
                  )}
                </button>
              </form>

              {/* Error Message */}
              {error && (
                <div className="mac-error" style={{ marginTop: "16px" }}>
                  <div className="mac-error-icon">!</div>
                  <span>{error}</span>
                </div>
              )}

              {/* Footer */}
              <p style={{ 
                fontSize: "11px", 
                textAlign: "center", 
                marginTop: "24px", 
                opacity: 0.5 
              }}>
                No password needed. We&apos;ll email you a sign-in link.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

