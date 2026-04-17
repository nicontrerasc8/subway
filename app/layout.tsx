import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { GlobalLoadingOverlay } from "@/components/global-loading-overlay";
import { Toaster } from "@/components/providers/toaster";
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
  title: "Subway",
  description: "Dashboard gerencial interno para analitica comercial e importaciones AX.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Suspense fallback={null}>
          <GlobalLoadingOverlay />
        </Suspense>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
