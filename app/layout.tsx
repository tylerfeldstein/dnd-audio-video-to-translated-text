import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { NavBar } from "@/components/navbar";
import { Providers } from "./providers";
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
  title: {
    default: "Transscribe - AI Powered Audio & Video Transcription",
    template: "%s | Transscribe" 
  },
  description: "Transform your audio and video content with AI-powered transcription, translation, and enhancement. Perfect for creators, businesses, and researchers.",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        href: "/favicon.ico",
      }
    ]
  },
};

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
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
