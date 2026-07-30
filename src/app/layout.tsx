import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import AgeGate from "@/components/AgeGate";

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["300", "400", "500", "700", "900"],
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
    <html lang="es" className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AgeGate />
        {children}
      </body>
    </html>
  );
}
