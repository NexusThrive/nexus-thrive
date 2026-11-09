import Link from "next/link";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import type { AvatarIdentity } from "@/lib/business/customers/avatar";
import { cn } from "@/lib/utils";

export type StackPerson = { key: string; name: string; href: string; identity: AvatarIdentity; photoUrl?: string | null };

/**
 * Personas en círculos superpuestos (uno detrás de otro): la cara de cada una (foto o blobatar) enlaza a su ficha; al pasar el
 * cursor o al enfocar, el círculo se alza. Al final, un círculo de resumen opcional («+3», p. ej. los clientes nuevos de hoy).
 * Usos: clientes nuevos y equipo en Inicio.
 */
export function AvatarStack({ people, extra, label, size = "md" }: { people: StackPerson[]; extra?: { text: string; href: string; label: string } | null; label: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8" : "size-10";
  const lift = "relative rounded-full ring-2 ring-background outline-none transition-transform duration-(--d1) ease-(--nx-ease-out) hover:z-(--z-raised) hover:-translate-y-1 focus-visible:z-(--z-raised) focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0";
  return (
    <ul aria-label={label} className="flex items-center ps-2.5">
      {people.map((p) => (
        <li key={p.key} className="-ms-2.5">
          <Link href={p.href} aria-label={p.name} className={cn("block overflow-hidden bg-accent-subtle", lift)}>
            <CustomerAvatar identity={p.identity} photoUrl={p.photoUrl} className={cn(box, "rounded-full", !p.photoUrl && "p-1")} />
          </Link>
        </li>
      ))}
      {extra ? (
        <li className="-ms-2.5">
          <Link href={extra.href} aria-label={extra.label} className={cn("grid place-items-center bg-surface-muted text-xs font-semibold text-foreground", box, lift)}>
            {extra.text}
          </Link>
        </li>
      ) : null}
    </ul>
  );
}
