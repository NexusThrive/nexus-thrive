"use client";

import { Fragment, ViewTransition, type ReactNode } from "react";
import { useShell } from "@/components/providers/shell-context";
import { appTransitionName } from "@/lib/experience/navigation/tenant-nav";

/**
 * Escenario de la app activa: la vista lleva el mismo nombre de View Transition que su icono en Inicio. Al abrir una app el icono crece
 * hasta la vista; al volver a Inicio, la vista se encoge de vuelta a su icono. Cambiar de app vuelve a montar el escenario (otro nombre)
 * para que React forme la pareja; dentro de la misma app no se vuelve a montar. Si al salir no hay icono con quien formar pareja
 * (Inicio todavía cargando), la vista se encoge y se apaga en su sitio (`exit`). Dueño: <ViewTransition> (CSS `.nx-app` en motion.css).
 */
export function AppStage({ children }: { children: ReactNode }) {
  const { groups, activeKey } = useShell();
  const name = appTransitionName(groups, activeKey);
  if (!name) return <Fragment key="sin-app">{children}</Fragment>;
  return (
    <ViewTransition key={name} name={name} share="nx-app" exit="nx-app-exit" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
