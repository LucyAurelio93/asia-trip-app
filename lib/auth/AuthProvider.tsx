"use client";

// Capa de sesión de la app: un único listener de Supabase Auth compartido por
// contexto. Cualquier componente lee la sesión con useAuth() en vez de crear
// su propia suscripción.
//
// NOTA — mapeo financiero (próxima fase): cuando Finanzas se conecte a las
// tablas reales, el autor de cada evento se resolverá encadenando
//   session.user.id → users.auth_user_id → users.id → registradoPorUserId
// (ver TEMP_ACTIVE_USER_ID en app/finanzas/lib/commands.ts). Aquí solo se
// expone la sesión; el mapeo NO se implementa todavía.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Devuelve un mensaje de error legible, o null si el login fue exitoso. */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Devuelve un mensaje de error legible, o null si el cierre fue exitoso. */
  signOut: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toFriendlyError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "Correo o contraseña incorrectos.";
  }
  if (/email not confirmed/i.test(message)) {
    return "El correo aún no está confirmado.";
  }
  if (/fetch|network/i.test(message)) {
    return "No hay conexión. Intenta de nuevo.";
  }
  return "No se pudo iniciar sesión. Intenta de nuevo.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Sesión inicial (persistida por el cliente de Supabase en localStorage).
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    // Único listener de cambios de sesión de toda la app (login, logout,
    // refresh de token). Se limpia al desmontar el provider.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? toFriendlyError(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("Supabase signOut error:", error.message);
      return "No se pudo cerrar sesión. Intenta de nuevo.";
    }
    return null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signOut,
    }),
    [session, loading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
