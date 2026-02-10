import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentic Commerce",
  description:
    "Agentic commerce site that chains paid tools with x402 + CDP Wallets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${fraunces.variable}`}>
        <Providers>
          {children}
          <a
            href="/chat"
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-200/40 bg-slate-950/90 text-cyan-100 shadow-lg transition hover:scale-105 hover:border-cyan-200"
            aria-label="Open chat"
          >
            Chat
          </a>
        </Providers>
      </body>
    </html>
  );
}
