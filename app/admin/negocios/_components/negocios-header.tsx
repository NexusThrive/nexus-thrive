"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { PageHeader } from "@/components/molecules/page-header";
import { useOps } from "../../_components/ops-shell";

/** Encabezado del directorio con el único CTA oro: "Nuevo negocio" (si el rol puede crear). */
export default function NegociosHeader({ total, canCreate }: { total: number; canCreate: boolean }) {
  const { openCreate } = useOps();
  return (
    <PageHeader
      eyebrow="Operaciones"
      title="Negocios"
      description={`${total} ${total === 1 ? "cuenta" : "cuentas"} en la plataforma. Busca, filtra y abre la ficha 360° de cada una.`}
      actions={
        canCreate ? (
          <Button type="button" variant="accent" magnetic onClick={openCreate}>
            <Plus aria-hidden="true" />
            Nuevo negocio
          </Button>
        ) : null
      }
    />
  );
}
