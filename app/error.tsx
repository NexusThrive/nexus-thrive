"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ErrorState } from "@/components/molecules/error-state";

/**
 * Error de ruta de la raíz (DR-09): cualquier pantalla sin un `error.tsx` más
 * cercano cae aquí en lugar de la pantalla genérica de Next. Lo que ya se pintó
 * (el layout) se conserva; solo el contenido se reemplaza.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorState
      onRetry={reset}
      reference={error.digest}
      action={
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Ir al inicio
        </Link>
      }
    />
  );
}
