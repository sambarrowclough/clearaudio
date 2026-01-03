import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, otp, url, type } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Missing email" },
        { status: 400 }
      );
    }

    let subject: string;
    let html: string;

    if (type === "otp" && otp) {
      // OTP verification email
      subject = "Your ClearAudio verification code";
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; margin-bottom: 24px;">Your verification code</h1>
          <p style="color: #666; margin-bottom: 24px;">Enter this code to sign in to ClearAudio. It expires in 10 minutes.</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace; margin-bottom: 24px;">
            ${otp}
          </div>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `;
    } else if (url) {
      // Magic link email (legacy support)
      subject = "Sign in to ClearAudio";
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; margin-bottom: 24px;">Sign in to ClearAudio</h1>
          <p style="color: #666; margin-bottom: 24px;">Click the button below to sign in. This link expires in 10 minutes.</p>
          <a href="${url}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: 500;">Sign In</a>
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
