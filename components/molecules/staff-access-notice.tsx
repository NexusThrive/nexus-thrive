import Link from "next/link";
import { LifeBuoy, ShieldCheck, UserX } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";

/**
 * Aviso para quien entra con un correo que está en el equipo de NEXUS pero no
 * puede usar el panel:
 *
 * - Su acceso está **pausado** (el equipo lo desactivó): hay que reactivarlo.
 * - Su correo ya está **vinculado a otra cuenta** de Clerk: tiene que entrar
 *   con esa, o el equipo puede desvincular la ficha para que se enganche la
 *   nueva.
 *
 * Antes de esto, estas personas caían en el onboarding y creaban un negocio
 * sin querer.
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
              vinculada. Entra con la cuenta con la que te registraste la primera vez; si no la
              recuerdas, escríbenos y lo arreglamos.
            </>
          )}
        </p>
        {name ? <p className="mt-1 text-sm text-muted-foreground">Hola, {name}.</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin" className={buttonVariants({ size: "sm" })}>
            <ShieldCheck aria-hidden="true" className="size-3.5" /> Ir al panel
          </Link>
          <a
            href="mailto:soporte@nexusthrive.com.co?subject=Acceso%20al%20equipo%20NEXUS"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <LifeBuoy aria-hidden="true" className="size-3.5" /> Escríbenos
          </a>
        </div>
      </div>
    </main>
  );
}
