import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@fortawesome/fontawesome-svg-core/styles.css";
import AgeGate from "@/components/AgeGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mercury — red social para mentes abiertas",
  description:
    "Mercury: red social para adultos 18+. Comunidad, contenido, tienda y Merycoin.",
  robots: { index: false, follow: false },
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
      <body className="min-h-full flex flex-col">
        {/* Degradado morado reutilizable para iconos (checks, likes, publicar) */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="mercuryGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#9379f2" />
              <stop offset="1" stopColor="#cabfd9" />
            </linearGradient>
          </defs>
        </svg>
        <AgeGate />
        {children}
      </body>
    </html>
  );
}
