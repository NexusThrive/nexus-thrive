"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut, Mail, RefreshCw, ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";

/**
 * Pantalla de «Sin acceso» a un negocio: la cuenta no es miembro (ni tiene una invitación pendiente a su correo verificado). Dice qué
 * negocio es y con qué cuenta se entró (para que se vea si es la equivocada) y ofrece lo que sí sirve: pedir la invitación, reintentar
 * después de recibirla o entrar con otra cuenta. No muestra datos del negocio.
 */
export function TenantAccessDenied({ tenantName, email, name }: { tenantName: string; email: string | null; name: string | null }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface-muted px-4 py-10">
      <div className="w-full max-w-lg rounded-(--radius-widget) border border-border/60 bg-card p-8 text-center sm:p-10">
        <span aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-accent-subtle text-accent-text">
          <ShieldAlert className="size-7" strokeWidth={1.6} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground">Aún no tienes acceso a {tenantName}</h1>
        <p className="mx-auto mt-2 max-w-sm text-ui text-muted-foreground">Tu cuenta no está vinculada a este negocio. Pide a un administrador que te invite y podrás entrar.</p>

        {email ? (
          <div className="mx-auto mt-6 flex max-w-sm items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3 text-left">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-muted-foreground">
              <Mail className="size-4" />
            </span>
            <span className="grid min-w-0">
              <span className="text-xs text-muted-foreground">Entraste como{name ? ` ${name}` : ""}</span>
              <span className="truncate text-ui font-medium text-foreground">{email}</span>
            </span>
          </div>
        ) : null}

        <ol className="mx-auto mt-6 grid max-w-sm gap-2.5 text-left text-ui">
          {[
            "Pídele a quien administra el negocio que te invite con este correo.",
            "Cuando la invitación llegue, vuelve a intentarlo: entrarás directo.",
          ].map((text, n) => (
            <li key={text} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-subtle text-xs font-semibold text-accent-text">{n + 1}</span>
              <span className="text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={() => window.location.reload()} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold")}>
            <RefreshCw aria-hidden="true" className="size-4" /> Volver a intentar
          </button>
          <SignOutButton>
            <button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full border-border/60 bg-transparent px-5")}>
              <LogOut aria-hidden="true" className="size-4" /> Entrar con otra cuenta
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
