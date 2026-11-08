import type { CapabilityCategory } from "@/lib/core/capabilities/registry";
import type { NavMenu, NavMenuItem } from "@/lib/core/capabilities/nav-types";
import { can } from "@/lib/core/auth/permissions";
import type { ModuleValue } from "@/lib/core/capabilities/modules";

/**
 * Los menús «Informes» y «Configuración» de la barra de cada app, como en Odoo (ideas del árbol de menús de Odoo 17; ver
 * `docs/product/nexus-platform/comercio-general.md` §7.0). Cada app los tiene aunque hoy traiga pocas entradas: así el lugar queda
 * fijo y las pantallas se van sumando. Una entrada sin pantalla es `soon` y se ve apagada; nunca un enlace roto.
 *
 * Los permisos siguen a Odoo (`group_*_manager`): quien gerencia el negocio (`business.manage`) ve los dos menús; el resto de la gente
 * del equipo (cajero, recepción) no los ve.
 */
const soon = (key: string, label: string): NavMenuItem => ({ key, label, href: "", soon: true });
const link = (key: string, label: string, href: string, module?: ModuleValue): NavMenuItem => ({ key, label, href, module });

type Def = { informes: NavMenu["sections"]; configuracion: NavMenu["sections"] };

const SETTINGS = link("ajustes", "Ajustes del negocio", "/settings");

/** Menús por app (la categoría del registro de capacidades es la app). */
export const APP_MENUS: Partial<Record<CapabilityCategory, Def>> = {
  "Ventas y cobros": {
    informes: [{ items: [link("cot-anteriores", "Cotizaciones anteriores", "/ventas/cotizaciones/anteriores", "quotes"), link("ventas", "Ventas del mostrador", "/pos/informes?periodo=30d", "pos"), soon("vendedores", "Vendedores"), link("productos", "Productos más vendidos", "/pos/informes?periodo=30d", "pos"), soon("clientes", "Clientes")] }],
    configuracion: [
      { items: [SETTINGS, soon("canales", "Canales de venta"), soon("entregas", "Entregas"), link("pagos", "Medios de pago", "/pos/medios-de-pago", "pos")] },
      { title: "Productos", items: [link("categorias", "Categorías", "/inventario/categorias", "inventory"), link("atributos", "Atributos", "/inventario/atributos", "inventory"), link("listas", "Listas de precios", "/ventas/listas-precios", "inventory")] },
      { title: "Documentos de venta", items: [soon("plantillas", "Plantillas"), soon("pies", "Encabezados y pies de página")] },
    ],
  },
  "Punto de venta": {
    informes: [{ items: [link("ventas-dia", "Ventas del día", "/pos/informes?periodo=hoy", "pos"), link("por-cajero", "Ventas por cajero y producto", "/pos/informes?periodo=7d", "pos"), link("turnos", "Reporte de turnos", "/pos/informes/turnos", "pos")] }],
    configuracion: [{ items: [SETTINGS, link("pagos", "Medios de pago", "/pos/medios-de-pago", "pos"), soon("cajas", "Cajas y terminales"), soon("comprobante", "Impresión del comprobante")] }],
  },
  Inventario: {
    informes: [{ items: [link("existencias", "Existencias", "/inventario/existencias"), link("reposicion", "Reposición", "/inventario/existencias?tab=reorder"), link("kardex", "Movimientos (kardex)", "/inventario/existencias/kardex", "inventory"), link("valorizacion", "Valorización", "/inventario/existencias/valorizacion", "inventory")] }],
    configuracion: [
      { items: [SETTINGS, link("bodegas", "Ubicaciones y bodegas", "/inventario/existencias?tab=warehouses"), soon("operaciones", "Tipos de operación")] },
      { title: "Productos", items: [link("categorias", "Categorías", "/inventario/categorias"), link("atributos", "Atributos", "/inventario/atributos"), soon("unidades", "Unidades de medida"), soon("barras", "Códigos de barras")] },
    ],
  },
  "Facturación": {
    informes: [{ items: [link("emitidas", "Facturas emitidas", "/finanzas/facturacion"), link("electronica", "Factura electrónica", "/finanzas/facturacion-electronica", "einvoicing"), link("cartera", "Cartera", "/finanzas/cartera", "receivables"), soon("pendientes", "Pendientes de facturar")] }],
    configuracion: [
      { items: [SETTINGS, link("series", "Series de comprobantes", "/finanzas/impuestos", "taxes"), link("impuestos", "Impuestos", "/finanzas/impuestos", "taxes"), link("proveedor", "Proveedor tecnológico", "/integrations")] },
      { items: [link("medios", "Medios de pago", "/pos/medios-de-pago", "pos"), soon("terminos", "Términos de pago")] },
    ],
  },
};

/**
 * Menús de una app para esta persona y estos módulos. Se quitan las entradas de módulos apagados y los bloques que quedan
 * vacíos; sin permiso (cuando la app lo pide) el menú no sale. Sin rol se muestra todo (Storybook).
 */
export function menusFor(category: string, activeModules: ReadonlySet<ModuleValue>, role?: string): NavMenu[] | undefined {
  const def = APP_MENUS[category as CapabilityCategory];
  if (!def) return undefined;
  if (role && !can(role, "business.manage")) return undefined;
  const clean = (sections: NavMenu["sections"]): NavMenu["sections"] =>
    sections
      .map((section) => ({ ...section, items: section.items.filter((item) => !item.module || activeModules.has(item.module)) }))
      .filter((section) => section.items.length > 0);
  const menus: NavMenu[] = [
    { key: "informes", label: "Informes", sections: clean(def.informes) },
    { key: "configuracion", label: "Configuración", sections: clean(def.configuracion) },
  ];
  return menus.filter((menu) => menu.sections.length > 0);
}

