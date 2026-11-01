import type { LucideIcon } from "lucide-react";
import type { ModuleValue } from "@/lib/capabilities/modules";

/**
 * Forma de los elementos y grupos del menú lateral. Es solo un contrato de tipos: lo comparten el menú del negocio
 * (`tenant-nav.ts`) y el del panel de operaciones (`lib/ops/nav.ts`) sin que uno dependa del otro.
 */

export type NavItem = {
  /** Clave estable (para React y para la paleta de comandos). */
  key: string;
  /** Módulo del negocio al que pertenece (no aplica en el panel CEO). */
  module?: ModuleValue | "settings";
  label: string;
  /** Ruta relativa al negocio: "" = inicio, "/crm", "/projects"… */
  href: string;
  icon: LucideIcon;
};

/** `collapsible`: el grupo se despliega y se oculta en la barra lateral (Ingresos, Gastos). */
export type NavGroup = {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  /** Se ancla al pie de la barra lateral, fuera del desplazamiento (Sistema: configuración). */
  pinned?: boolean;
};
