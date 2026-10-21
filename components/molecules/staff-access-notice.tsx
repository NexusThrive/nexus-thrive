"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { LifeBuoy, LogOut, RefreshCw, ShieldCheck, UserX } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";

/**
 * Aviso para quien entra con un correo que está en el equipo de NEXUS pero no
 * puede usar el panel:
 *
 * - Su acceso está **pausado** (el equipo lo desactivó): hay que reactivarlo.
 * - Su correo ya está **vinculado a otra cuenta** de Clerk: tiene que entrar
 *   con esa, o el equipo puede desvincular la ficha para que se enganche la
 *   nueva (botón "Desvincular cuenta" en Operaciones Center → Equipo).
 *
 * Antes de esto, estas personas caían en el onboarding y creaban un negocio
 * sin querer.
 *
 * Nota: aquí NO se ofrece "Ir al panel": con el acceso en pausa o con otra
 * cuenta, /admin no deja entrar, así que el botón solo frustrating. Lo que
 * sirve es cerrar sesión (para entrar con la otra cuenta) o escribir al
 * equipo.
 */
export function StaffAccessNotice({
  email,
  name,
  roleName,
  reason,
}: {
  email: string;
  name: string | null;
  roleName: string;
  reason: "inactive" | "other_account";
}) {
  const paused = reason === "inactive";
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm">
        <span
          className={cn(
            "grid size-11 place-items-center rounded-full",
            paused ? "bg-amber-100 text-amber-700" : "bg-surface-muted text-muted-foreground",
          )}
        >
          {paused ? (
            <UserX aria-hidden="true" className="size-5" />
          ) : (
            <ShieldCheck aria-hidden="true" className="size-5" />
          )}
        </span>
        <h1 className="mt-4 font-display text-xl font-bold tracking-tight">
          {paused ? "Tu acceso al equipo está en pausa" : "Ya estás en el equipo de NEXUS"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {paused ? (
            <>
              <b className="text-foreground">{email}</b> está en el equipo de NEXUS con el rol{" "}
              <b className="text-foreground">{roleName}</b>, pero tu acceso está desactivado. Escríbenos
              para reactivarlo.
            </>
          ) : (
            <>
              <b className="text-foreground">{email}</b> está en el equipo de NEXUS con el rol{" "}
              <b className="text-foreground">{roleName}</b>, pero esta sesión no es la que está
              vinculada. Cierra sesión y entra con la cuenta con la que te registraste la primera vez.
            </>
          )}
        </p>
        {name ? <p className="mt-1 text-sm text-muted-foreground">Hola, {name}.</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {paused ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={buttonVariants({ size: "sm" })}
            >
              <RefreshCw aria-hidden="true" className="size-3.5" /> Reintentar
            </button>
          ) : (
            <SignOutButton>
              <button type="button" className={buttonVariants({ size: "sm" })}>
                <LogOut aria-hidden="true" className="size-3.5" /> Cerrar sesión y entrar de nuevo
              </button>
            </SignOutButton>
          )}
          <a
            href="mailto:soporte@nexusthrive.com.co?subject=Acceso%20al%20equipo%20NEXUS"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <LifeBuoy aria-hidden="true" className="size-3.5" /> Escríbenos
          </a>
        </div>
        {paused ? (
          <p className="mt-3 text-[12px] text-muted-foreground">
            Si tu equipo ya te reactivó, vuelve a cargar la página.
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-muted-foreground">
            Si no recuerdas con qué cuenta te registraste, escríbenos y te lo arreglamos (o el equipo
            puede usar <b>Desvincular cuenta</b> en Equipo).
          </p>
        )}
        <p className="mt-3 text-[12px] text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
