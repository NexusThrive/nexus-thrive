import type { LucideIcon } from "lucide-react";
import type { ModuleValue } from "@/lib/core/capabilities/modules";

/**
 * Forma de los elementos y grupos del menú lateral. Es solo un contrato de tipos: lo comparten el menú del negocio
 * (`tenant-nav.ts`) y el del panel de operaciones (`lib/platform/team/nav.ts`) sin que uno dependa del otro.
 */

export type NavItem = {
  /** Clave estable (para React y para la paleta de comandos). */
  key: string;
  /** Módulo del negocio al que pertenece (no aplica en el panel CEO). */
  module?: ModuleValue | "settings";
  label: string;
  /** Ruta relativa al negocio: "" = inicio, "/contactos", "/proyectos"… */
  href: string;
  icon: LucideIcon;
};

/**
 * Una entrada de un menú desplegable de la barra de la app («Informes», «Configuración»). `soon`: la pantalla aún no existe; se
 * muestra apagada con «Pronto» para que el lugar quede a la vista sin llevar a un enlace roto.
 */
export type NavMenuItem = {
  key: string;
  label: string;
  /** Ruta relativa al negocio. Vacía si `soon`. */
  href: string;
  icon?: LucideIcon;
  soon?: boolean;
  /** Solo se muestra con este módulo encendido. */
  module?: ModuleValue;
};

/** Un bloque del desplegable, con título opcional (en Odoo: «Pedidos de venta» › Plantillas…). */
export type NavMenuSection = { title?: string; items: NavMenuItem[] };

/** Menú desplegable al final de la barra de una app. */
export type NavMenu = { key: "informes" | "configuracion"; label: string; sections: NavMenuSection[] };

/** `collapsible`: el grupo se despliega y se oculta en la barra lateral (Ingresos, Gastos). */
export type NavGroup = {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  /** Si lo tiene, el grupo se pinta como una opción más (icono, nombre y flecha) que despliega sus ítems, sin título aparte. */
  icon?: LucideIcon;
  /** Menús desplegables de la barra de la app (Informes y Configuración). */
  menus?: NavMenu[];
  /** Se ancla al pie de la barra lateral, fuera del desplazamiento (Sistema: configuración). */
  pinned?: boolean;
};
