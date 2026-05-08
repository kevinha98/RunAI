import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RunAI — AI Running Coach",
    template: "%s | RunAI",
  },
  description:
    "Claude-powered adaptive running plans that evolve with every run. Your personal AI coach that actually learns.",
  keywords: ["running", "AI coach", "training plan", "marathon", "5k", "10k"],
  openGraph: {
    title: "RunAI — AI Running Coach",
    description: "Claude-powered adaptive running plans that evolve with every run.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
