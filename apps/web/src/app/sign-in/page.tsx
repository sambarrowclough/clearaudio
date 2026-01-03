"use client";

import { useState, useRef, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "choose" | "email" | "otp";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Focus OTP input when step changes
  useEffect(() => {
    if (step === "otp" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      
      if (result.error) {
        setError(result.error.message || "Failed to send verification code");
      } else {
        setStep("otp");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });

      if (result.error) {
        setError(result.error.message || "Invalid verification code");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    // Only allow digits and max 6 characters
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setOtp(cleaned);
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
          {step === "choose" && (
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
                {isLoading ? "Signing in..." : "Continue with Google"}
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

              {/* Email Button */}
              <button
                onClick={() => setStep("email")}
                disabled={isLoading}
                className="mac-button"
                style={{ 
                  width: "100%",
                  padding: "14px 20px",
                  fontSize: "16px",
                }}
              >
                Continue with Email
              </button>

              {/* Footer */}
              <p style={{ 
                fontSize: "11px", 
                textAlign: "center", 
                marginTop: "24px", 
                opacity: 0.5 
              }}>
                No password needed. We&apos;ll send you a verification code.
              </p>
            </>
          )}

          {step === "email" && (
            <>
              <button
                onClick={() => setStep("choose")}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0",
                  fontSize: "13px",
                  fontFamily: "var(--font-chicago)",
                  cursor: "pointer",
                  marginBottom: "16px",
                  opacity: 0.7,
                }}
              >
                ← Back
              </button>

              <form onSubmit={handleSendOtp}>
                <label className="mac-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mac-input"
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="mac-button mac-button-primary"
                  style={{ width: "100%", marginTop: "16px" }}
                >
                  {isLoading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <span className="mac-loading" />
                      Sending code...
                    </span>
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <button
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0",
                  fontSize: "13px",
                  fontFamily: "var(--font-chicago)",
                  cursor: "pointer",
                  marginBottom: "16px",
                  opacity: 0.7,
                }}
              >
                ← Back
              </button>

              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ 
                  width: "64px", 
                  height: "52px", 
                  margin: "0 auto 16px",
                  border: "3px solid var(--mac-black)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px"
                }}>
                  ✉
                </div>
                <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>Check your email</h2>
                <p style={{ fontSize: "14px", opacity: 0.7 }}>
                  We sent a code to <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp}>
                <label className="mac-label">Verification code</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  placeholder="000000"
                  className="mac-input"
                  style={{ 
                    textAlign: "center", 
                    fontSize: "24px", 
                    letterSpacing: "8px",
                    fontFamily: "monospace",
                  }}
                  maxLength={6}
                  required
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="mac-button mac-button-primary"
                  style={{ width: "100%", marginTop: "16px" }}
                >
                  {isLoading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <span className="mac-loading" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify & Sign In"
                  )}
                </button>
              </form>

              <button
                onClick={() => {
                  setOtp("");
                  handleSendOtp(new Event("submit") as unknown as React.FormEvent);
                }}
                disabled={isLoading}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  background: "none",
                  border: "none",
                  fontFamily: "var(--font-chicago)",
                  fontSize: "12px",
                  textDecoration: "underline",
                  cursor: "pointer",
                  opacity: 0.7,
                }}
              >
                Resend code
              </button>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="mac-error" style={{ marginTop: "16px" }}>
              <div className="mac-error-icon">!</div>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
