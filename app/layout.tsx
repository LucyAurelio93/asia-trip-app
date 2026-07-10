import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import AuthGate from "@/lib/auth/AuthGate";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Asia Trip",
  description: "Itinerario de viaje",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${nunito.className} bg-[#FFF7F0] antialiased`}>
        {/* Toda la app requiere sesión; la protección es client-side en esta
            fase (ver lib/auth/AuthGate.tsx para la nota sobre server-side). */}
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}