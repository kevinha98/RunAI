import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#F5F5F3",
};

export const metadata: Metadata = {
  title: {
    default: "RunAI — AI Løpecoach",
    template: "%s | RunAI",
  },
  description:
    "Claude-drevet adaptiv løpecoach som lager et personlig treningsprogram og omskriver det ukentlig basert på hvordan du faktisk løper.",
  keywords: ["løping", "AI-coach", "treningsprogram", "maraton", "halvmaraton", "5k", "10k", "løpeplan"],
  openGraph: {
    title: "RunAI — AI Løpecoach",
    description: "Personlig treningsprogram som tilpasser seg deg — hver uke.",
    type: "website",
    locale: "nb_NO",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body className={`${notoSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
