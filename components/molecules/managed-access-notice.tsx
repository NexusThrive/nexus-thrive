import Link from "next/link";
import { buttonVariants } from "@/components/atoms/button-variants";

export function ManagedAccessNotice({ reason }: { reason: "preparing" | "suspended" | "unauthorized" }) {
  const copy = {
    preparing: ["Tu negocio está en preparación", "NexusThrive está preparando tu acceso. Recibirás una invitación cuando el negocio esté activado."],
    suspended: ["Acceso suspendido", "El acceso a tu negocio está suspendido. Contacta al equipo de NexusThrive para revisarlo."],
    unauthorized: ["Acceso no autorizado", "Tu cuenta no tiene una invitación vigente ni una membresía habilitada. Solicita acceso al equipo de NexusThrive."],
  }[reason];
  return (
    <main className="grid min-h-dvh place-items-center bg-surface-muted px-4 py-10">
      <section className="w-full max-w-lg space-y-5 rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">{copy[0]}</h1>
        <p className="text-muted-foreground">{copy[1]}</p>
        <a href="mailto:soporte@nexusthrive.com.co" className={buttonVariants()}>Contactar a NexusThrive</a>
        <div><Link href="/sign-in" className={buttonVariants({ variant: "outline" })}>Volver al acceso</Link></div>
      </section>
    </main>
  );
}
