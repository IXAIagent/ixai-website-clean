import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ixai-website-clean.vercel.app"),
  title: {
    default: "IXAI Pro — AI Wealth Operating System",
    template: "%s | IXAI Pro",
  },
  description:
    "IXAI Pro is an AI Wealth Operating System for portfolio intelligence, FCN risk monitoring, and cross-asset risk awareness.",
  applicationName: "IXAI Pro",
  icons: {
    icon: [
      { rel: "icon", url: "/favicon.ico" },
      { rel: "icon", type: "image/svg+xml", url: "/icon.svg" },
    ],
  },
  openGraph: {
    title: "IXAI Pro — AI Wealth Operating System",
    description:
      "Portfolio intelligence, FCN monitoring, and AI-assisted risk awareness inside the IXAI ecosystem.",
    siteName: "IXAI Pro",
    type: "website",
    url: "/dashboard",
  },
  twitter: {
    card: "summary",
    title: "IXAI Pro — AI Wealth Operating System",
    description:
      "Portfolio intelligence, FCN monitoring, and AI-assisted risk awareness inside the IXAI ecosystem.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
