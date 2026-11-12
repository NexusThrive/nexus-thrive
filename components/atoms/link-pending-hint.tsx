"use client";

import { useLinkStatus } from "next/link";

/**
 * Punto discreto que se enciende dentro de un `<Link>` mientras su destino carga (Next solo lo marca cuando la ruta no estaba ya
 * precargada). Tamaño fijo y solo cambia la opacidad: no mueve nada. Lleva un pequeño retraso para no parpadear en navegaciones
 * rápidas. El `<Link>` que lo contiene debe ser `position: relative`.
 */
export function LinkPendingHint() {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" data-pending={pending ? "" : undefined} className="nx-link-pending" />;
}
