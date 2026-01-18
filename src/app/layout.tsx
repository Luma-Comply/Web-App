import type { Metadata } from "next";
import { DM_Serif_Display, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const dmSerifDisplay = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Luma - Medical Necessity Documentation",
  description: "Keep your patients on life-saving therapies. HIPAA-compliant AI documentation that secures approvals faster and protects your practice from audits.",
  metadataBase: new URL("https://useluma.io"),
  keywords: [
    "medical necessity documentation",
    "biologics prior authorization",
    "HIPAA compliant",
    "medical necessity letters",
    "prior authorization automation",
    "healthcare documentation",
    "audit protection",
  ],
  authors: [{ name: "Luma" }],
  creator: "Luma",
  publisher: "Luma",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://useluma.io",
    title: "Luma - Medical Necessity Documentation",
    description: "Keep your patients on life-saving therapies. HIPAA-compliant AI documentation that secures approvals faster and protects your practice from audits.",
    siteName: "Luma",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Luma - Medical Necessity Documentation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Luma - Medical Necessity Documentation",
    description: "Keep your patients on life-saving therapies. Secure approvals faster with HIPAA-compliant AI documentation.",
    images: ["/og-image.png"],
    creator: "@useluma",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSerifDisplay.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
