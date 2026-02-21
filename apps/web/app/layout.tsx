import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrisisLens Tier 4",
  description:
    "Interactive humanitarian crisis globe with country-level population, funding, and needs analytics."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light">
      <body className="app-body">{children}</body>
    </html>
  );
}
