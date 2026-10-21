"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { LifeBuoy, LogIn, LogOut, Mail } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";

/**
 * Aviso de la página de invitación: qué falta para entrar al panel. Todos los
 * casos ofrecen una salida real (no un enlace a un panel que rechazará el
 * acceso).
 */
export function InviteNotice({
  kind,
  title,
  text,
  email,
  roleName,
  token,
}: {
  kind: "invalid" | "signin" | "other_account" | "inactive";
  title: string;
  text: string;
  email?: string;
  roleName?: string;
  token?: string;
}) {
  const href = token ? `/invitacion/${token}` : "/";
  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="font-display text-xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        {email ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm bg-surface-muted px-3 py-2 text-sm">
            <Mail aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            {/* El correo va en monoespaciada y sin cortes: si no se parte, empuja
                la columna más allá de la pantalla y la tarjeta se ve cortada
                y descentrada. */}
            <span className="min-w-0 break-all font-mono">{email}</span>
            {roleName ? <span className="text-xs text-muted-foreground">· {roleName}</span> : null}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {kind === "signin" ? (
            <>
              <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
                <LogIn aria-hidden="true" className="size-3.5" /> Crear mi cuenta
              </Link>
              <Link href="/sign-in" className={buttonVariants({ size: "sm", variant: "outline" })}>
                <LogIn aria-hidden="true" className="size-3.5" /> Ya tengo cuenta
              </Link>
            </>
          ) : kind === "other_account" ? (
            <SignOutButton>
              <button type="button" className={buttonVariants({ size: "sm" })}>
                <LogOut aria-hidden="true" className="size-3.5" /> Cerrar sesión y entrar con la otra
              </button>
            </SignOutButton>
          ) : kind === "inactive" ? (
            <Link href={href} className={buttonVariants({ size: "sm" })}>
              Reintentar
            </Link>
          ) : null}
          <a
            href="mailto:soporte@nexusthrive.com.co?subject=Invitación%20al%20equipo%20NEXUS"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <LifeBuoy aria-hidden="true" className="size-3.5" /> Escríbenos
          </a>
        </div>
      </div>
    </main>
  );
}
