"use client";

// Pantalla de login (solo Email + Password). El registro público está
// desactivado en Supabase, por eso no hay flujo de registro ni de
// recuperación de contraseña en esta fase.

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const message = await signIn(email, password);
    if (message) {
      setError(message);
      setSubmitting(false);
    }
    // Si el login fue exitoso, onAuthStateChange actualiza la sesión y
    // AuthGate reemplaza esta pantalla por la app; no hay nada más que hacer.
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col justify-center bg-[#faf7f2] px-5 pb-16 pt-[calc(env(safe-area-inset-top)+2rem)] text-[#2d2a26]">
      <header className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f6f1ea] text-3xl">
          🏡
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Familia</h1>
        <p className="mt-1 text-sm text-[#7a746f]">Inicia sesión para continuar</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-2xl border border-[#e8e2da] bg-white p-5 shadow-sm"
      >
        <label className="block">
          <span className="text-xs font-semibold text-[#7a746f]">Correo</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="correo@ejemplo.com"
            className="mt-1.5 w-full rounded-xl border border-[#e0d5cc] bg-[#fdf6f1] px-3 py-2.5 text-sm text-[#2d2a26] outline-none focus:border-[#c26d5a]"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-[#7a746f]">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-xl border border-[#e0d5cc] bg-[#fdf6f1] px-3 py-2.5 text-sm text-[#2d2a26] outline-none focus:border-[#c26d5a]"
          />
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-[#ffecec] px-3 py-2 text-sm text-[#c96b6b]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 w-full rounded-full bg-[#2d2a26] py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {submitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[#a09890]">
        Acceso solo para miembros de la familia.
      </p>
    </main>
  );
}
