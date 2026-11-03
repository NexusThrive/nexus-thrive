"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ErrorState } from "@/components/molecules/error-state";

/**
 * Error de cualquier pantalla del negocio (DR-09). Vive dentro del `layout` de
 * `(app)`, así que la barra lateral, la superior y la inferior siguen
 * disponibles: la persona puede navegar a otra parte sin recargar. Las rutas
 * hijas lo heredan; no necesitan uno propio salvo que quieran un mensaje distinto.
 */
export default function TenantError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { tenant } = useParams<{ tenant: string }>();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorState
      title="No pudimos mostrar esta pantalla"
      onRetry={reset}
      reference={error.digest}
      action={
        tenant ? (
          <Link href={`/${tenant}`} className={buttonVariants({ variant: "outline" })}>
            Ir al inicio
          </Link>
        ) : null
      }
    />
  );
}
