import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEV.MICHE — Développeur Créatif",
  description:
    "Portfolio de développeur full-stack créatif basé à Brazzaville, Congo.",
  metadataBase: new URL("https://dev-miche-portfolio.foxdev51.chatgpt.site"),
  openGraph: {
    title: "Votre vision. Mon code.",
    description: "Miche Fresneil — Développeur Full-Stack Créatif",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Votre vision. Mon code.",
    description: "Miche Fresneil — Développeur Full-Stack Créatif",
    images: ["/og.png"],
  },
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
