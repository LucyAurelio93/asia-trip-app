"use client";

// Control global de sesión: un botón circular discreto arriba a la derecha
// (espejo del botón "volver" de Viajes) que despliega el correo del usuario
// autenticado y el botón "Cerrar sesión". Vive en AuthGate, fuera de los
// módulos, para estar disponible en toda la app.

import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function SessionBadge() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);
    const message = await signOut();
    if (message) {
      setError(message);
      setSigningOut(false);
    }
    // Si tuvo éxito, onAuthStateChange deja la sesión en null y AuthGate
    // vuelve al login.
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto w-full max-w-[420px]">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Sesión"
          aria-expanded={open}
          className="pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e2da] bg-white/85 text-[#7a746f] shadow-sm backdrop-blur transition-transform active:scale-95"
        >
          <UserRound size={16} />
        </button>

        {open && (
          <>
            {/* Cierra el panel al tocar fuera */}
            <div
              className="pointer-events-auto fixed inset-0"
              onClick={() => setOpen(false)}
            />
            <div className="pointer-events-auto absolute right-4 top-[calc(env(safe-area-inset-top)+3.25rem)] w-56 rounded-2xl border border-[#e8e2da] bg-white p-3 shadow-md">
              <p className="truncate px-1 text-xs text-[#7a746f]" title={user.email ?? undefined}>
                {user.email}
              </p>
              {error && (
                <p role="alert" className="mt-1.5 px-1 text-[11px] text-[#c96b6b]">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#e0d5cc] py-2 text-xs font-semibold text-[#c96b6b] transition-opacity disabled:opacity-50"
              >
                <LogOut size={13} />
                {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
