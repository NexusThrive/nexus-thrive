"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Quién está usando la app: su nombre de pila, para los saludos (AURI AI, por ejemplo). Lo pone el layout del negocio con lo que ya
 * leyó del equipo; fuera del negocio no hay proveedor y el nombre es `null`.
 */
const CurrentUserContext = createContext<{ firstName: string | null }>({ firstName: null });

export function CurrentUserProvider({ firstName, children }: { firstName: string | null; children: ReactNode }) {
  return <CurrentUserContext.Provider value={{ firstName }}>{children}</CurrentUserContext.Provider>;
}

/** Nombre de pila de la persona conectada, o `null` si no se conoce. */
export function useCurrentUserName(): string | null {
  return useContext(CurrentUserContext).firstName;
}
