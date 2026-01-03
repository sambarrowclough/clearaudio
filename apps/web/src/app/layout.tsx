import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ScrollWrapper } from "@/components/ScrollWrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://clearaudio.app"),
  title: "ClearAudio – Fix Bad Audio with a Prompt",
  description:
    "Upload audio or video, describe what you want to keep ('the speaker', 'the voice', 'the music'), and we'll clean up the rest. Powered by Meta's SAM-Audio.",
  keywords: [
    "Audio separation",
    "voice isolation",
    "noise removal",
    "SAM-Audio",
    "text-to-audio",
    "source separation",
    "audio extraction",
    "stem separation",
    "sound isolation",
  ],
  robots: {
    index: true,
    follow: true,
  },
  themeColor: "#000000",
  openGraph: {
    title: "ClearAudio – Fix Bad Audio with a Prompt",
    description:
      "Describe what you want to keep. We'll clean up the rest.",
    siteName: "ClearAudio",
    type: "website",
    locale: "en_US",
    url: "https://clearaudio.app",
    images: [
      {
        url: "https://clearaudio.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "ClearAudio - Fix Bad Audio with a Prompt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClearAudio – Fix Bad Audio with a Prompt",
    description: "Upload audio, describe what to keep, get clean results.",
    images: ["https://clearaudio.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.cdnfonts.com/css/chicago-flf"
          rel="stylesheet"
        />
      </head>
      <body>
        <ScrollWrapper>
          {children}
        </ScrollWrapper>
        <Analytics />
      </body>
    </html>
  );
}
