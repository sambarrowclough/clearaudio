import { NextResponse } from "next/server";

// HTML escape to prevent XSS/injection
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate OTP format (6 digits only)
function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

// Validate URL is from our domain
function isValidInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedHosts = [
      "localhost",
      "clearaudio.app",
      "www.clearaudio.app",
      "cleanaudio.app",
      "www.cleanaudio.app",
    ];
    // Also allow the configured BETTER_AUTH_URL host
    if (process.env.BETTER_AUTH_URL) {
      try {
        const authUrl = new URL(process.env.BETTER_AUTH_URL);
        allowedHosts.push(authUrl.hostname);
      } catch {
        // Ignore invalid BETTER_AUTH_URL
      }
    }
    return allowedHosts.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Verify internal API secret to prevent external abuse
    // Uses BETTER_AUTH_SECRET since this endpoint is part of auth infrastructure
    const authHeader = request.headers.get("x-internal-secret");
    const expectedSecret = process.env.BETTER_AUTH_SECRET;

    if (!expectedSecret) {
      console.error("BETTER_AUTH_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (authHeader !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { email, otp, url, type } = await request.json();

    // Validate email
    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    let subject: string;
    let html: string;

    if (type === "otp" && otp) {
      // Validate OTP format
      if (typeof otp !== "string" || !isValidOtp(otp)) {
        return NextResponse.json(
          { error: "Invalid OTP format" },
          { status: 400 }
        );
      }

      // OTP verification email - escape even though we validated, defense in depth
      const safeOtp = escapeHtml(otp);
      subject = "Your ClearAudio verification code";
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; margin-bottom: 24px;">Your verification code</h1>
          <p style="color: #666; margin-bottom: 24px;">Enter this code to sign in to ClearAudio. It expires in 10 minutes.</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace; margin-bottom: 24px;">
            ${safeOtp}
          </div>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `;
    } else if (url) {
      // Validate URL is from our domain
      if (typeof url !== "string" || !isValidInternalUrl(url)) {
        return NextResponse.json(
          { error: "Invalid URL" },
          { status: 400 }
        );
      }

      // Magic link email (legacy support) - escape the URL for safe HTML embedding
      const safeUrl = escapeHtml(url);
      subject = "Sign in to ClearAudio";
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; margin-bottom: 24px;">Sign in to ClearAudio</h1>
          <p style="color: #666; margin-bottom: 24px;">Click the button below to sign in. This link expires in 10 minutes.</p>
          <a href="${safeUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: 500;">Sign In</a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">If you didn't request this email, you can safely ignore it.</p>
        </div>
      `;
    } else {
      return NextResponse.json(
        { error: "Missing otp or url" },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ClearAudio <noreply@clearaudio.app>",
        //from: "onboarding@resend.dev",
        to: email,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message || errorData.error || response.statusText;
      return NextResponse.json(
        { error: `Failed to send email: ${errorMessage}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
