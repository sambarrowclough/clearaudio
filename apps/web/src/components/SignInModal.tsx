"use client";

import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { authClient } from "@/lib/auth-client";
import { X } from "lucide-react";

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = "choose" | "email" | "otp";

export function SignInModal({ open, onOpenChange, onSuccess }: SignInModalProps) {
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep("choose");
      setEmail("");
      setOtp("");
      setError(null);
      setIsLoading(false);
    }
  }, [open]);

  // Focus OTP input when step changes
  useEffect(() => {
    if (step === "otp" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Listen for OAuth popup completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth-callback-success") {
        onOpenChange(false);
        onSuccess();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onOpenChange, onSuccess]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate popup position (centered)
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // Open popup for OAuth - use dedicated page that initiates the OAuth flow
      const popup = window.open(
        "/auth/google",
        "oauth-popup",
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Poll to check if popup closed
      const pollTimer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollTimer);
          
          // After popup closes, fetch the session to check if user is now signed in
          try {
            const { data: session } = await authClient.getSession();
            if (session?.user) {
              // User successfully signed in
              onOpenChange(false);
              onSuccess();
            } else {
              // User cancelled or auth failed
              setIsLoading(false);
            }
          } catch {
            setIsLoading(false);
          }
        }
      }, 500);
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
      const result = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      if (result.error) {
        setError(result.error.message || "Invalid verification code");
      } else {
        onOpenChange(false);
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = async (value: string) => {
    // Only allow digits and max 6 characters
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setOtp(cleaned);

    // Auto-submit when 6 digits are entered
    if (cleaned.length === 6 && !isLoading) {
      setIsLoading(true);
      setError(null);

      try {
        const result = await authClient.signIn.emailOtp({
          email,
          otp: cleaned,
        });

        if (result.error) {
          setError(result.error.message || "Invalid verification code");
        } else {
          onOpenChange(false);
          onSuccess();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to verify code");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: "380px",
            zIndex: 1001,
            outline: "none",
          }}
        >
          <div className="mac-window" style={{ margin: 0, boxShadow: "8px 8px 0 rgba(0,0,0,0.3)" }}>
            {/* Title Bar */}
            <div className="mac-title-bar">
              <Dialog.Close asChild>
                <button 
                  className="mac-close-box" 
                  style={{ cursor: "pointer" }}
                  aria-label="Close"
                />
              </Dialog.Close>
              <Dialog.Title asChild>
                <span className="mac-title">Sign In</span>
              </Dialog.Title>
              <div className="mac-resize" />
            </div>

            {/* Content */}
            <div className="mac-content">
              {step === "choose" && (
                <>
                  <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <p style={{ fontSize: "14px", opacity: 0.7 }}>
                      Sign in to clean your audio
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
                      fontSize: "15px",
                      marginBottom: "16px"
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
                    marginBottom: "16px" 
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
                      fontSize: "15px",
                    }}
                  >
                    Continue with Email
                  </button>
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

                  <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <div style={{ 
                      width: "56px", 
                      height: "48px", 
                      margin: "0 auto 16px",
                      border: "3px solid var(--mac-black)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px"
                    }}>
                      ✉
                    </div>
                    <p style={{ fontSize: "14px", marginBottom: "4px" }}>
                      Check your email
                    </p>
                    <p style={{ fontSize: "12px", opacity: 0.6 }}>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

