import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEV.MICHE — Développeur Créatif",
  description:
    "Portfolio de développeur full-stack créatif basé à Brazzaville, Congo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
