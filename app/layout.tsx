import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fallbackOrigin = new URL("https://cala-signal.hovohovhannisyan.chatgpt.site");

function metadataOrigin(hostHeader: string | null, protocolHeader: string | null): URL {
  const host = hostHeader?.split(",")[0].trim().toLowerCase() ?? "";
  const isLocal = /^localhost:\d{2,5}$/.test(host);
  const isPublishedSite = /^[a-z0-9-]+\.hovohovhannisyan\.chatgpt\.site$/.test(host);
  if (!isLocal && !isPublishedSite) return fallbackOrigin;
  const protocol = isLocal && protocolHeader?.split(",")[0].trim() === "http" ? "http" : "https";
  return new URL(`${protocol}://${host}`);
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const origin = metadataOrigin(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    requestHeaders.get("x-forwarded-proto"),
  );
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: origin,
    title: "CALA SIGNAL — Source-backed startup shortlists",
    description: "Turn one investment thesis into qualified leads, a verification queue, and source-linked evidence in about a minute.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "CALA SIGNAL — One thesis. A shortlist you can defend.",
      description: "Source-backed company sourcing for investors, accelerators, and venture teams.",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "CALA SIGNAL source-backed investor shortlist workspace" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "CALA SIGNAL — One thesis. A shortlist you can defend.",
      description: "Qualified leads, a verification queue, and source-linked evidence in about a minute.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
