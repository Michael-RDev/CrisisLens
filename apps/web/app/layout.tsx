import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrisisLens",
  description:
    "Interactive humanitarian crisis globe with country-level population, funding, and needs analytics."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
