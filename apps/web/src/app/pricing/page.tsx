"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PLANS } from "@/lib/stripe";
import { Check, X } from "lucide-react";

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const { data: session } = authClient.useSession();

  // Fetch user's current plan
  useEffect(() => {
    if (session?.user) {
      fetch("/api/usage")
        .then((res) => res.json())
        .then((data) => {
          if (data.plan) {
            setCurrentPlan(data.plan);
          }
        })
        .catch(console.error);
    }
  }, [session?.user]);

  const isProUser = currentPlan === "pro";

  const handleUpgrade = async () => {
    if (!session?.user) {
      // Redirect to sign in first
      router.push("/sign-in?redirect=/pricing");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        // Handle error - e.g., user already has Pro subscription
        alert(data.error);
        if (data.error.includes("already have")) {
          setCurrentPlan("pro");
        }
      } else {
        console.error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStarted = () => {
    if (!session?.user) {
      router.push("/sign-in?redirect=/");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="mac-desktop">
      <div className="mac-window" style={{ maxWidth: "800px" }}>
        {/* Title Bar */}
        <div className="mac-title-bar">
          <div className="mac-close-box" onClick={() => router.push("/")} />
          <span className="mac-title">Pricing</span>
          <div className="mac-resize" />
        </div>

        {/* Content */}
        <div className="mac-content">
          {canceled && (
            <div className="mac-error" style={{ marginBottom: "20px" }}>
              <div className="mac-error-icon">!</div>
              <span>Checkout was canceled. You can try again when ready.</span>
            </div>
          )}

          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
              Simple Pricing
            </h1>
            <p style={{ fontSize: "14px", opacity: 0.7 }}>
              Start free. Upgrade when you need more.
            </p>
          </div>

          {/* Pricing Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "20px",
            }}
          >
            {/* Free Plan */}
            <div
              style={{
                border: "2px solid var(--mac-black)",
                padding: "24px",
                background: "var(--mac-white)",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", marginBottom: "4px" }}>Free</h2>
                <div style={{ fontSize: "32px", fontWeight: "bold" }}>$0</div>
                <div style={{ fontSize: "12px", opacity: 0.6 }}>forever</div>
              </div>

              <div
                style={{
                  borderTop: "2px solid var(--mac-black)",
                  paddingTop: "16px",
                  marginBottom: "20px",
                }}
              >
                <FeatureRow included>
                  {PLANS.free.generationsPerMonth} cleanings/month
                </FeatureRow>
                <FeatureRow included>
                  Up to {PLANS.free.maxFileSizeMb}MB files
                </FeatureRow>
                <FeatureRow included>Small & Base models</FeatureRow>
                <FeatureRow>Large models</FeatureRow>
                <FeatureRow>High-quality mode</FeatureRow>
                <FeatureRow>Priority processing</FeatureRow>
              </div>

              <button
                onClick={handleGetStarted}
                className="mac-button"
                style={{ width: "100%" }}
              >
                {session?.user ? "Go to App" : "Get Started"}
              </button>
            </div>

            {/* Pro Plan */}
            <div
              style={{
                border: "3px solid var(--mac-black)",
                padding: "24px",
                background: "var(--mac-black)",
                color: "var(--mac-white)",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", marginBottom: "4px" }}>Pro</h2>
                <div style={{ fontSize: "32px", fontWeight: "bold" }}>
                  ${PLANS.pro.price}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.6 }}>per month</div>
              </div>

              <div
                style={{
                  borderTop: "2px solid var(--mac-white)",
                  paddingTop: "16px",
                  marginBottom: "20px",
                }}
              >
                <FeatureRow included inverted>
                  {PLANS.pro.generationsPerMonth} cleanings/month
                </FeatureRow>
                <FeatureRow included inverted>
                  Up to {PLANS.pro.maxFileSizeMb}MB files
                </FeatureRow>
                <FeatureRow included inverted>
                  All models (incl. Large-TV)
                </FeatureRow>
                <FeatureRow included inverted>
                  High-quality mode
                </FeatureRow>
                <FeatureRow included inverted>
                  Priority processing
                </FeatureRow>
                <FeatureRow included inverted>
                  Cancel anytime
                </FeatureRow>
              </div>

              <button
                onClick={isProUser ? () => router.push("/account") : handleUpgrade}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  fontFamily: "var(--font-chicago)",
                  fontSize: "16px",
                  background: "var(--mac-white)",
                  color: "var(--mac-black)",
                  border: "2px solid var(--mac-white)",
                  cursor: isLoading ? "wait" : "pointer",
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <span className="mac-loading" style={{ borderColor: "var(--mac-black)" }} />
                    Loading...
                  </span>
                ) : isProUser ? (
                  "✓ Current Plan"
                ) : (
                  "Upgrade to Pro"
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              marginTop: "32px",
              fontSize: "12px",
              opacity: 0.6,
            }}
          >
            <p>Powered by Stripe. Cancel anytime from your account.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  children,
  included = false,
  inverted = false,
}: {
  children: React.ReactNode;
  included?: boolean;
  inverted?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "13px",
        marginBottom: "8px",
        opacity: included ? 1 : 0.5,
      }}
    >
      {included ? (
        <Check size={14} strokeWidth={3} />
      ) : (
        <X
          size={14}
          strokeWidth={3}
          style={{ color: inverted ? "var(--mac-white)" : "var(--mac-black)" }}
        />
      )}
      <span>{children}</span>
    </div>
  );
}

function PricingLoading() {
  return (
    <div className="mac-desktop">
      <div className="mac-window" style={{ maxWidth: "800px" }}>
        <div className="mac-title-bar">
          <div className="mac-close-box" />
          <span className="mac-title">Pricing</span>
          <div className="mac-resize" />
        </div>
        <div className="mac-content" style={{ textAlign: "center", padding: "60px" }}>
          <span className="mac-loading" style={{ borderColor: "var(--mac-black)" }} />
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingLoading />}>
      <PricingContent />
    </Suspense>
  );
}
