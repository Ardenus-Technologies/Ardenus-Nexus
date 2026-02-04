import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
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
  title: "Ardenus Time Tracker",
  description: "Track time spent on categories for Ardenus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nurom.variable} ${typold.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
