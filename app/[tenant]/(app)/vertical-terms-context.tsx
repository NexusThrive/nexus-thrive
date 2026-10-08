"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { VerticalTerms } from "@/lib/vertical-terms";

/**
 * Vocabulario adaptativo de la vertical en vivo.
 *
 * Se inyecta en el layout `(app)` con `getVerticalTerms(Tenant.vertical)`;
 * los componentes client del negocio (CRM, reservas, inventario…) lo leen
 * con `useVerticalTerms()` en vez de hardcodear "Cliente"/"Reserva"/
 * "Producto" (Socios vs Pacientes vs Turistas…).
 */
const VerticalTermsContext = createContext<VerticalTerms | null>(null);

export function VerticalTermsProvider({
  terms,
  children,
}: {
  terms: VerticalTerms;
  children: ReactNode;
}) {
  return (
    <VerticalTermsContext.Provider value={terms}>
      {children}
    </VerticalTermsContext.Provider>
  );
}

/** Términos de la vertical activa. Solo dentro de `VerticalTermsProvider`. */
export function useVerticalTerms(): VerticalTerms {
  const terms = useContext(VerticalTermsContext);
  if (!terms) {
    throw new Error(
      "useVerticalTerms debe usarse dentro de <VerticalTermsProvider>",
    );
  }
  return terms;
}
