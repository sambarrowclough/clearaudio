import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service – ClearAudio",
  description: "Terms of service for ClearAudio audio processing service.",
};

export default function TermsPage() {
  return (
    <div className="mac-window">
      {/* Title Bar */}
      <div className="mac-title-bar">
        <Link href="/" className="mac-close-box" aria-label="Back to home" />
        <span className="mac-title">Terms of Service</span>
        <div className="mac-resize" />
      </div>

      {/* Content */}
      <div className="mac-content mac-space-y-12">
        <div style={{ fontSize: "11px", opacity: 0.6, marginBottom: "16px" }}>
          Last updated: January 1, 2026
        </div>

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Agreement to Terms
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            By accessing or using ClearAudio at clearaudio.app, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use the service.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Description of Service
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            ClearAudio is an open-source audio processing service that uses AI to separate and isolate 
            audio sources based on text descriptions. The service is powered by Meta's SAM-Audio model 
            and is provided free of charge.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Acceptable Use
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6", marginBottom: "12px" }}>
            You agree to use ClearAudio only for lawful purposes. You may not:
          </p>
          <ul style={{ fontSize: "14px", lineHeight: "1.8", paddingLeft: "20px" }}>
            <li>Upload content that infringes on copyrights or intellectual property rights</li>
            <li>Process audio for illegal purposes or to create misleading content</li>
            <li>Attempt to reverse engineer, decompile, or exploit the service</li>
            <li>Use automated systems to overload or abuse the service</li>
            <li>Upload malicious files or attempt to compromise our infrastructure</li>
          </ul>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Intellectual Property
          </h2>
          
          <h3 style={{ fontSize: "15px", fontWeight: "bold", marginTop: "16px", marginBottom: "8px" }}>
            Your Content
          </h3>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            You retain all rights to the audio files you upload. We do not claim ownership of your content. 
            By uploading files, you grant us a temporary license to process them for the sole purpose of 
            providing the audio separation service.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: "bold", marginTop: "16px", marginBottom: "8px" }}>
            Our Code
          </h3>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            ClearAudio's source code is licensed under the MIT License. You are free to use, modify, 
            and distribute it according to that license. See our{" "}
            <a 
              href="https://github.com/sambarrowclough/clearaudio" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              GitHub repository
            </a>{" "}for details.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: "bold", marginTop: "16px", marginBottom: "8px" }}>
            SAM-Audio License
          </h3>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            This service uses SAM-Audio by Meta, which is subject to the SAM License. By using ClearAudio, 
            you also agree to comply with the terms of the{" "}
            <a 
              href="https://github.com/facebookresearch/sam-audio/blob/main/LICENSE" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ textDecoration: "underline" }}
            >
              SAM License
            </a>.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Disclaimer of Warranties
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
            EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
            ERROR-FREE, OR COMPLETELY SECURE.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Limitation of Liability
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, 
            DATA, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Service Availability
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            We reserve the right to modify, suspend, or discontinue the service at any time without notice. 
            We may also impose limits on certain features or restrict access to parts of the service 
            without notice or liability.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Account Termination
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            We may terminate or suspend your access to the service immediately, without prior notice, 
            if you breach these Terms of Service or engage in behavior that we determine to be harmful 
            to the service or other users.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Changes to Terms
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            We reserve the right to modify these terms at any time. Changes will be posted on this page 
            with an updated "Last updated" date. Your continued use of the service after changes 
            constitutes acceptance of the modified terms.
          </p>
        </section>

        <div className="mac-divider" />

        <section>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>
            Contact
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
            For questions about these terms, please open an issue on our{" "}
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
          <Link href="/privacy" style={{ textDecoration: "underline" }}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}

