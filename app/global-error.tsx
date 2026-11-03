"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/molecules/error-state";
import "./globals.css";

/**
 * Último recurso: falla el propio layout raíz. Reemplaza toda la página, así que
 * trae su `html` y `body`. Sin proveedores ni navegación: solo explica y deja
 * reintentar o recargar.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="es">
      <body>
        <ErrorState
          title="NEXUS no pudo cargar"
          description="Algo falló al abrir la aplicación. Reintenta; si continúa, recarga la página o avísanos con la referencia."
          onRetry={reset}
          retryLabel="Reintentar"
          reference={error.digest}
          headingLevel={1}
        />
      </body>
    </html>
  );
}
