import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Breadcrumbs } from "@/components/molecules/breadcrumbs";

/**
 * Migas de un registro (base de Odoo, modernizada): «← Atrás» vuelve a la lista de origen y la miga muestra
 * «Clientes › María Pérez». Reemplaza a la miga por ruta («Clientes › Detalle») en las fichas.
 */
export function RecordBreadcrumbs({ list, record, className }: { list: { label: string; href: string }; record: string; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Link href={list.href} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Atrás
      </Link>
      <Breadcrumbs items={[{ label: list.label, href: list.href }, { label: record }]} className="min-w-0" />
    </div>
  );
}
