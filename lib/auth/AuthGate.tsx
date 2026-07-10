"use client";

// Protección de acceso de la app, 100% client-side en esta fase:
// mientras se resuelve la sesión muestra un estado de carga; sin sesión
// muestra el login; con sesión renderiza las rutas normales.
//
// NOTA: esto protege la UI, no los datos. La protección server-side
// (middleware / SSR con cookies de Supabase) puede agregarse en una fase
// posterior sin cambiar este componente ni las rutas existentes.

import { useAuth } from "./AuthProvider";
import LoginScreen from "./LoginScreen";
import SessionBadge from "./SessionBadge";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] items-center justify-center bg-[#faf7f2]">
        <p className="text-sm text-[#a09890]">Cargando…</p>
      </main>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <>
      <SessionBadge />
      {children}
    </>
  );
}
