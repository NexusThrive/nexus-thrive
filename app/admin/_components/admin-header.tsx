"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { PageHeader } from "@/components/molecules/page-header";
import { useAdminActions } from "./admin-shell";

/**
 * Encabezado del panel CEO: título y el CTA oro "Nuevo negocio" (el único de
 * la pantalla). El buscador vive en la barra superior (Ctrl/⌘ K).
 */
export default function AdminHeader() {
  const { openCreate } = useAdminActions();
  return (
    <PageHeader
      eyebrow="Panel CEO"
      title="Resumen general"
      description="Gestión global de negocios, verticales y módulos de la plataforma."
      actions={
        <Button type="button" variant="accent" magnetic onClick={openCreate}>
          <Plus aria-hidden="true" />
          Nuevo negocio
        </Button>
      }
    />
  );
}
