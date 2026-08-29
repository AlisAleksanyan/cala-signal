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
    title: "CALA SIGNAL",
    description: "Evidence-first startup scouting with an Entire Build Passport.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "CALA SIGNAL — Every AI edit ships with a receipt",
      description: "Cala-backed startup scouting with inspectable ranking and Entire build provenance.",
      images: [{ url: socialImage, width: 1672, height: 941, alt: "CALA SIGNAL Entire Build Passport" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "CALA SIGNAL — Every AI edit ships with a receipt",
      description: "Cala-backed startup scouting with inspectable ranking and Entire build provenance.",
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
