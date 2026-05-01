import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Asia Trip",
  description: "Itinerario de viaje",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${nunito.className} bg-[#FFF7F0] antialiased`}>
        {children}
      </body>
    </html>
  );
}