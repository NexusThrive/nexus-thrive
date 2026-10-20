"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, RefreshCw, TriangleAlert } from "lucide-react";

/**
 * Red de seguridad del formulario de acceso.
 *
 * Clerk monta su UI en el navegador. Si el script de ClerkJS no baja (DNS,
 * certificado, red bloqueada o dominio sin configurar en Clerk), el `<SignIn>`
 * se queda vacío y el usuario ve una columna en blanco sin explicación.
 *
 * Este componente vigila el montaje: si tras `TIMEOUT_MS` el formulario no
 * aparece, muestra un aviso con lo que puede estar pasando y un botón de
 * reintento. Nunca oculta el formulario cuando sí funciona.
 */

/** Tiempo de espera antes de avisar (el script normal tarda menos de 2 s). */
const TIMEOUT_MS = 6000;

/** Cada cuánto se revisa el montaje. */
const POLL_MS = 400;

function clerkMounted(): boolean {
  if (typeof window === "undefined") return true;
  const clerk = (window as unknown as { Clerk?: { load?: unknown } }).Clerk;
  // `window.Clerk` existe cuando ClerkJS ya cargó y se está montando.
  return Boolean(clerk && clerk.load);
}

export function AuthMountFallback({ children }: { children: React.ReactNode }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (clerkMounted()) {
        window.clearInterval(timer);
        return;
      }
    }, POLL_MS);

    const timeout = window.setTimeout(() => {
      if (!clerkMounted()) setFailed(true);
    }, TIMEOUT_MS);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, []);

  if (!failed) return <>{children}</>;

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-surface p-6 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-amber-100 text-amber-700">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </span>
      <div className="grid gap-1.5">
        <p className="font-display text-[15px] font-bold">No pudimos cargar el acceso</p>
        <p className="text-[13px] text-muted-foreground">
          El formulario de inicio de sesión no se pudo cargar. Puede ser un problema de conexión o
          que el dominio no esté habilitado todavía.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-sm bg-ink px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-black"
        >
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Reintentar
        </button>
        <a
          href="mailto:soporte@nexusthrive.com.co"
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3.5 py-2 text-[13px] font-semibold transition hover:bg-surface-muted"
        >
          <LifeBuoy aria-hidden="true" className="size-3.5" />
          Escríbenos
        </a>
      </div>
    </div>
  );
}
