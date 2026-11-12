"use client";

import { useEffect } from "react";
import { setTopbarCrumbs, type TopbarCrumb } from "@/lib/experience/hooks/use-topbar-crumbs";

/** Pone la ruta («Clientes › María Pérez») en la barra superior mientras la pantalla está montada, en lugar del nombre de la sección. No pinta nada. */
export function TopbarCrumbs({ items }: { items: readonly TopbarCrumb[] }) {
  const key = JSON.stringify(items);
  useEffect(() => {
    setTopbarCrumbs(JSON.parse(key) as TopbarCrumb[]);
    return () => setTopbarCrumbs(null);
  }, [key]);
  return null;
}
