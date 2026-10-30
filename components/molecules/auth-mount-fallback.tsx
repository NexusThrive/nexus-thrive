"use client";

import { useEffect, useRef, useState } from "react";
import { LifeBuoy, RefreshCw, TriangleAlert } from "lucide-react";
import { Skeleton } from "@/components/atoms/skeleton";

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
 *
 * Mientras el formulario no está en pantalla (todavía no cargó, o Clerk lo
 * retira al iniciar sesión y redirigir) se pinta encima un esqueleto con la
 * forma del formulario y su texto («Cargando acceso…» / «Entrando…»), en vez de
 * dejar el hueco con solo el selector Iniciar sesión / Crear cuenta.
 */

/** Un campo, un botón social o el botón principal de Clerk: el formulario está a la vista. */
const FORM_SELECTOR = ".cl-formButtonPrimary, .cl-formFieldInput, .cl-socialButtonsBlockButton, .cl-otpCodeFieldInput";

/** Tiempo de espera antes de avisar (el script normal tarda menos de 2 s). */
const TIMEOUT_MS = 6000;

/** Espera antes de pintar el esqueleto (un montaje normal es más rápido que esto). */
const SKELETON_DELAY_MS = 350;

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
  const [ready, setReady] = useState(false);
  const [wasReady, setWasReady] = useState(false);
  const [waited, setWaited] = useState(false);
  const [late, setLate] = useState(false);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const check = () => {
      const present = Boolean(el.querySelector(FORM_SELECTOR));
      setReady(present);
      if (present) setWasReady(true);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // El esqueleto solo sale si el formulario tarda: al cambiar entre Iniciar sesión y
  // Crear cuenta Clerk monta en milisegundos y no debe verse ningún destello.
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setWaited(true), SKELETON_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setWaited(false);
    };
  }, [ready]);

  // Red de seguridad: si por un cambio en las clases de Clerk nunca se detecta el
  // formulario, a los 3 s se muestra igual (nunca queda invisible).
  useEffect(() => {
    const timer = window.setTimeout(() => setLate(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

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

  if (failed && !ready) return <Failed />;

  // La primera carga pinta el esqueleto de inmediato (también en el HTML del servidor);
  // la espera de 350 ms solo aplica al cambiar de modo, cuando el formulario ya estuvo.
  const showSkeleton = !ready && (!wasReady || waited);

  return (
    <div ref={host} className="relative min-h-[380px]">
      {/* El formulario entra con un fundido al estar listo (no aparece de golpe al cambiar de modo). */}
      <div
        data-in={ready || late ? "" : undefined}
        className="translate-y-1.5 opacity-0 data-[in]:translate-y-0 data-[in]:opacity-100 data-[in]:transition-[opacity,transform] data-[in]:duration-300 data-[in]:ease-[var(--nx-ease-out)] motion-reduce:translate-y-0 motion-reduce:transition-none"
      >
        {children}
      </div>
      <div
        role={showSkeleton ? "status" : undefined}
        aria-hidden={showSkeleton ? undefined : true}
        aria-label={wasReady ? "Entrando" : "Cargando acceso"}
        className="absolute inset-0 grid content-start gap-[18px] bg-surface transition-opacity duration-300 ease-out data-[hidden]:pointer-events-none data-[hidden]:opacity-0 data-[hidden]:duration-200"
        data-hidden={showSkeleton ? undefined : ""}
      >
        <Skeleton className="h-11 w-full" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-px flex-1" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-px flex-1" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-11 w-full" />
        <p className="text-center text-[13px] text-muted-foreground">{wasReady ? "Entrando…" : "Cargando acceso…"}</p>
      </div>
    </div>
  );
}

function Failed() {

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
