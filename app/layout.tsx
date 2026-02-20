import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { LayoutShell } from "@/components/LayoutShell";
import "./globals.css";

const nurom = localFont({
  src: "../public/fonts/Nurom-Bold.ttf",
  variable: "--font-nurom",
  weight: "700",
  display: "swap",
});

const typold = localFont({
  src: "../public/fonts/Typold-Book500.ttf",
  variable: "--font-typold",
  weight: "500",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ardenus Nexus",
  description: "Ardenus team time tracking and management",
  icons: {
    icon: "/assets/favicon.png",
    apple: "/assets/ArdenusIcon3.png",
  },
  metadataBase: new URL("https://nexus.ardenus.com"),
  openGraph: {
    title: "Ardenus Nexus",
    description: "Ardenus team time tracking and management",
    url: "https://nexus.ardenus.com",
    siteName: "Ardenus Nexus",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nurom.variable} ${typold.variable} overflow-x-hidden`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        <Providers>
          <Header />
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
