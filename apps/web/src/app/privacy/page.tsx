import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – ClearAudio",
  description: "Privacy policy for ClearAudio audio processing service.",
};

export default function PrivacyPage() {
  return (
    <div className="mac-window">
      {/* Title Bar */}
      <div className="mac-title-bar">
        <Link href="/" className="mac-close-box" aria-label="Back to home" />
        <span className="mac-title">Privacy Policy</span>
        <div className="mac-resize" />
      </div>

      {/* Content */}
      <div className="mac-content mac-space-y-12">
        <div style={{ fontSize: "11px", opacity: 0.6, marginBottom: "16px" }}>
          Last updated: January 1, 2026
        </div>

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Overview
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            ClearAudio ("we", "our", or "us") respects your privacy. This policy explains how we collect, 
            use, and protect your information when you use our audio processing service at clearaudio.app.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Information We Collect
          </h2>
          
          <h3 style={{ fontSize: "15px", fontWeight: "bold", marginTop: "16px", marginBottom: "8px" }}>
            Audio Files
          </h3>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            When you upload audio or video files for processing, we temporarily store them to perform 
            the audio separation. Files are processed using Meta's SAM-Audio model and are automatically 
            deleted after processing is complete or within 24 hours, whichever comes first.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: "bold", marginTop: "16px", marginBottom: "8px" }}>
            Account Information
          </h3>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            If you create an account, we collect your email address for authentication purposes. 
            We use magic link authentication via Resend and optionally Google OAuth for sign-in.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: "bold", marginTop: "16px", marginBottom: "8px" }}>
            Usage Data
          </h3>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            We use Vercel Analytics to collect anonymous usage statistics to improve our service. 
            This includes page views, browser type, and general geographic region.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            How We Use Your Information
          </h2>
          <ul style={{ fontSize: "14px", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li>To process your audio files and provide the separation service</li>
            <li>To authenticate your account and maintain your session</li>
            <li>To improve our service based on anonymous usage patterns</li>
            <li>To communicate with you about your account if needed</li>
          </ul>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Data Storage & Security
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            Audio files are temporarily stored using Vercel Blob storage. We use industry-standard 
            security practices to protect your data. Our infrastructure runs on Vercel and Modal, 
            both of which maintain robust security measures.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Third-Party Services
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6", marginBottom: "12px" }}>
            We use the following third-party services:
          </p>
          <ul style={{ fontSize: "14px", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li><strong>Vercel</strong> — Hosting and blob storage</li>
            <li><strong>Modal</strong> — GPU compute for audio processing</li>
            <li><strong>Neon</strong> — PostgreSQL database for authentication</li>
            <li><strong>Resend</strong> — Email delivery for magic links</li>
            <li><strong>Google</strong> — Optional OAuth sign-in</li>
          </ul>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Your Rights
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            You have the right to request deletion of your account and any associated data. 
            Since audio files are automatically deleted after processing, there is typically 
            no persistent audio data to delete.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Open Source
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            ClearAudio is open source software licensed under the MIT License. You can review 
            our code and data handling practices on{" "}
            <a 
              href="https://github.com/sambarrowclough/clearaudio" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              GitHub
            </a>.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Contact
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            If you have questions about this privacy policy, please open an issue on our{" "}
            <a 
              href="https://github.com/sambarrowclough/clearaudio" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              GitHub repository
            </a>.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Changes to This Policy
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            We may update this privacy policy from time to time. Changes will be posted on this page 
            with an updated "Last updated" date.
          </p>
        </section>

        {/* Footer */}
        <div style={{ 
          textAlign: "center", 
          fontSize: "11px", 
          opacity: 0.6, 
          marginTop: "24px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(0,0,0,0.1)"
        }}>
          <Link href="/" style={{ textDecoration: "underline" }}>
            ← Back to ClearAudio
          </Link>
          {" · "}
          <Link href="/terms" style={{ textDecoration: "underline" }}>
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}

