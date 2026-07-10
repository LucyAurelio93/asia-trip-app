"use client";

// Regla jerárquica ÚNICA del botón "Atrás" de Finanzas (la resuelve
// FinanzasApp con useBackStack; aquí vive el mecanismo completo):
//
//   1. Si hay vistas internas abiertas (un sheet/formulario, detalle de un
//      DAP, detalle de un objetivo Fintual, historial de un detalle, o
//      cualquier vista interna futura de una tab), Atrás cierra SOLO la más
//      profunda (LIFO). Un sheet abierto es siempre el nivel más profundo.
//   2. Sin vistas internas y con una tab distinta de Resumen, Atrás vuelve
//      a Resumen. Nunca salta directo al Dashboard Familiar.
//   3. En Resumen, Atrás sale al Dashboard Familiar (/).
//
// Cada vista interna se registra con useBackView(activa, cerrar) mientras
// está abierta; el orden de apertura define la pila. Los sheets se registran
// solos desde el componente Sheet (ui.tsx), así que cualquier sheet nuevo
// participa sin código extra; sus controles propios (X, backdrop, confirmar)
// siguen funcionando igual. Al desmontarse una vista (o el detalle que la
// contiene), el cleanup del efecto retira su entrada: no quedan huérfanas.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type Registrar = (onBack: () => void) => () => void;

const BackNavContext = createContext<Registrar | null>(null);

/** Pila de vistas internas abiertas. La posee FinanzasApp. */
export function useBackStack() {
  const [stack, setStack] = useState<{ id: number; onBack: () => void }[]>([]);
  const nextId = useRef(0);

  const register = useCallback<Registrar>((onBack) => {
    nextId.current += 1;
    const id = nextId.current;
    setStack((s) => [...s, { id, onBack }]);
    return () => setStack((s) => s.filter((entry) => entry.id !== id));
  }, []);

  return {
    register,
    depth: stack.length,
    /** Cierra la vista interna más profunda; null si no hay ninguna. */
    closeTop: stack.length > 0 ? stack[stack.length - 1].onBack : null,
  };
}

export function BackNavProvider({
  register,
  children,
}: {
  register: Registrar;
  children: React.ReactNode;
}) {
  return (
    <BackNavContext.Provider value={register}>{children}</BackNavContext.Provider>
  );
}

/**
 * Registra una vista interna en la pila de Atrás mientras `active` sea true.
 * `onBack` debe cerrar SOLO esta vista (volver al nivel que la abrió),
 * nunca saltar niveles.
 */
export function useBackView(active: boolean, onBack: () => void) {
  const register = useContext(BackNavContext);
  const ref = useRef(onBack);
  useEffect(() => {
    ref.current = onBack;
  });
  useEffect(() => {
    if (!active || !register) return;
    return register(() => ref.current());
  }, [active, register]);
}
