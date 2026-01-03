"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PLANS, type PlanType } from "@/lib/stripe";

interface UsageStats {
  plan: PlanType;
  used: number;
  limit: number;
  remaining: number;
  periodEnd: string;
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const { data: session, isPending } = authClient.useSession();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchUsage();
    }
  }, [session?.user]);

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No portal URL returned:", data.error);
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  if (isPending) {
    return (
      <div className="mac-desktop">
        <div className="mac-window" style={{ maxWidth: "600px" }}>
          <div className="mac-title-bar">
            <div className="mac-close-box" />
            <span className="mac-title">Account</span>
            <div className="mac-resize" />
          </div>
          <div className="mac-content" style={{ textAlign: "center", padding: "60px" }}>
            <span className="mac-loading" style={{ borderColor: "var(--mac-black)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/sign-in?redirect=/account");
    return null;
  }

  const plan = usage?.plan || "free";
  const planConfig = PLANS[plan];

  return (
    <div className="mac-desktop">
      <div className="mac-window" style={{ maxWidth: "600px" }}>
        {/* Title Bar */}
        <div className="mac-title-bar">
          <div className="mac-close-box" onClick={() => router.push("/")} />
          <span className="mac-title">Account</span>
          <div className="mac-resize" />
        </div>

        {/* Content */}
        <div className="mac-content mac-space-y-12">
          {success && (
            <div
              style={{
                background: "var(--mac-black)",
                color: "var(--mac-white)",
                padding: "12px 16px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "18px" }}>✓</span>
              <span>Welcome to Pro! Your upgrade was successful.</span>
            </div>
          )}

          {/* User Info */}
          <div
            style={{
              border: "2px solid var(--mac-black)",
              padding: "20px",
            }}
          >
            <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "4px" }}>
              Signed in as
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold" }}>
              {session.user.email}
            </div>
          </div>

          {/* Plan & Usage */}
          <div
            style={{
              border: "2px solid var(--mac-black)",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "4px" }}>
                  Current Plan
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {planConfig.name}
                </div>
              </div>
              {plan === "pro" && (
                <div
                  style={{
                    background: "var(--mac-black)",
                    color: "var(--mac-white)",
                    padding: "4px 12px",
                    fontSize: "12px",
                  }}
                >
                  PRO
                </div>
              )}
            </div>

            {/* Usage Bar */}
            {isLoadingUsage ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <span className="mac-loading" style={{ borderColor: "var(--mac-black)" }} />
              </div>
            ) : usage ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    marginBottom: "8px",
                  }}
                >
                  <span>Cleanings this month</span>
                  <span style={{ fontWeight: "bold" }}>
                    {usage.used} / {usage.limit}
                  </span>
                </div>

                <div
                  style={{
                    height: "20px",
                    border: "2px solid var(--mac-black)",
                    background: "var(--mac-white)",
                    boxShadow:
                      "inset 2px 2px 0 var(--mac-black), inset -2px -2px 0 var(--mac-white)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`,
                      background: "var(--mac-black)",
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    opacity: 0.6,
                    marginTop: "8px",
                  }}
                >
                  Resets {new Date(usage.periodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </>
            ) : null}

            {/* Actions */}
            <div
              style={{
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "2px solid var(--mac-black)",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {plan === "free" ? (
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
              ) : (
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="mac-button"
                >
                  {isLoadingPortal ? "Loading..." : "Manage Subscription"}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => router.push("/")} className="mac-button">
              ← Back to App
            </button>
            <button
              onClick={handleSignOut}
              className="mac-button"
              style={{ marginLeft: "auto" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountLoading() {
  return (
    <div className="mac-desktop">
      <div className="mac-window" style={{ maxWidth: "600px" }}>
        <div className="mac-title-bar">
          <div className="mac-close-box" />
          <span className="mac-title">Account</span>
          <div className="mac-resize" />
        </div>
        <div className="mac-content" style={{ textAlign: "center", padding: "60px" }}>
          <span className="mac-loading" style={{ borderColor: "var(--mac-black)" }} />
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountLoading />}>
      <AccountContent />
    </Suspense>
  );
}
