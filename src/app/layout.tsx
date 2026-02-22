import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
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
        url: "/opengraph-preview.jpg",
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
    images: ["/opengraph-preview.jpg"],
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
      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-8KGNHVC3GQ"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-8KGNHVC3GQ');
        `}
      </Script>

      {/* Microsoft Clarity */}
      <Script id="microsoft-clarity" strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "v64a4br39t");
        `}
      </Script>

      <body className={`${newsreader.variable} ${inter.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
