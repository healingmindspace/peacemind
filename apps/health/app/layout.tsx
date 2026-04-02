import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health — Your Body, Understood",
  description: "A gentle health companion for chronic conditions. Track symptoms, spot patterns, and understand your body.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f6f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-to-b from-[#f5f6f0] via-[#f0f4ec] to-[#eef3e8]">
        {children}
      </body>
    </html>
  );
}
