"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/molecules/breadcrumbs";
import { useShell } from "@/components/providers/shell-context";
import { tenantRelativePath } from "@/lib/navigation/tenant-nav";

/**
 * Migas de la página actual, derivadas del menú del negocio: Inicio › categoría ›
 * sección (› Detalle si se entró a un registro). No aparece en el inicio ni
 * fuera de una sección del menú.
 */
export function RouteBreadcrumbs() {
  const { groups, activeKey, hrefFor } = useShell();
  const pathname = usePathname();
  const slug = hrefFor("").slice(1);
  const group = groups.find((g) => g.items.some((item) => item.key === activeKey));
  const item = group?.items.find((i) => i.key === activeKey);
  if (!group || !item || item.href === "") return null;

  const relative = tenantRelativePath(pathname, slug);
  const base = item.href.split("?")[0]!;
  const deeper = relative !== base && relative.startsWith(`${base}/`);
  const crumbs: Crumb[] = [
    { label: "Inicio", href: hrefFor("") },
    { label: group.label },
    { label: item.label, href: hrefFor(item.href) },
    ...(deeper ? [{ label: "Detalle" }] : []),
  ];
  return <Breadcrumbs items={crumbs} />;
}
