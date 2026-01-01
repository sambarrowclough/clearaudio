import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, url } = await request.json();

    if (!email || !url) {
      return NextResponse.json(
        { error: "Missing email or url" },
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
        //from: "ClearAudio <noreply@cleanaudio.app>",
        from: "onboarding@resend.dev",
        to: email,
        subject: "Sign in to ClearAudio",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; margin-bottom: 24px;">Sign in to ClearAudio</h1>
            <p style="color: #666; margin-bottom: 24px;">Click the button below to sign in. This link expires in 10 minutes.</p>
            <a href="${url}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: 500;">Sign In</a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">If you didn't request this email, you can safely ignore it.</p>
          </div>
        `,
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

