"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/molecules/breadcrumbs";
import { useShell } from "@/components/providers/shell-context";
import { tenantRelativePath } from "@/lib/experience/navigation/tenant-nav";

/**
 * Migas de la página actual, derivadas del menú del negocio: sección (› Detalle si se entró a un registro). Solo en Sistema: en los
 * módulos la barra del módulo ya dice dónde se está. No aparece en el inicio ni fuera de una sección del menú.
 */
export function RouteBreadcrumbs() {
  const { groups, activeKey, hrefFor } = useShell();
  const pathname = usePathname();
  const slug = hrefFor("").slice(1);
  const group = groups.find((g) => g.items.some((item) => item.key === activeKey));
  const item = group?.items.find((i) => i.key === activeKey);
  if (!group || !item || item.href === "") return null;
  // Dentro de un módulo la barra del módulo ya dice la sección y cada registro trae su propia ruta («Pipeline › nombre»):
  // la miga solo queda en Sistema (Configuración, Funciones…), que no tiene barra de módulo.
  if (group.label !== "Sistema") return null;

  const relative = tenantRelativePath(pathname, slug);
  const base = item.href.split("?")[0]!;
  const deeper = relative !== base && relative.startsWith(`${base}/`);
  // La ficha de un contacto pone su propia miga de registro («Atrás» · «Clientes › María Pérez»).
  if (deeper && relative.startsWith("/contactos/")) return null;
  const crumbs: Crumb[] = [
    { label: item.label, href: hrefFor(item.href) },
    ...(deeper ? [{ label: "Detalle" }] : []),
  ];
  return <Breadcrumbs items={crumbs} className="max-md:hidden" />;
}
