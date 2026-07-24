import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Integra — Gestión inteligente para centros educativos",
  description:
    "Integra tutorías, prácticas, guardias y material didáctico en una plataforma intuitiva para tu centro educativo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
