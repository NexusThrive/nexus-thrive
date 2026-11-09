import { Clock } from "lucide-react";
import type { CardChip } from "@/lib/business/growth/pipeline";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import { cn } from "@/lib/utils";

/** Piezas del CRM que comparten el tablero, la lista y el detalle: estrellas, chip de actividad y avatares. */

const STAR = "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z";

/** Prioridad de 0 a 3 estrellas (solo lectura). */
export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "size-[22px]" : size === "md" ? "size-[18px]" : "size-3.5";
  return (
    <span role="img" aria-label={`Prioridad: ${value} de 3`} className="inline-flex gap-px">
      {[1, 2, 3].map((n) => (
        <svg key={n} viewBox="0 0 24 24" aria-hidden="true" className={cls}>
          <path d={STAR} strokeWidth={1.5} strokeLinejoin="round" className={n <= value ? "fill-accent stroke-accent" : "fill-none stroke-border-strong"} />
        </svg>
      ))}
    </span>
  );
}

/** Prioridad editable: tres botones (clic en la estrella activa más alta la apaga). Grupo de radio accesible. */
export function StarsInput({ value, onChange, size = "md", label = "Prioridad" }: { value: number; onChange: (v: number) => void; size?: "md" | "lg"; label?: string }) {
  const cls = size === "lg" ? "size-[22px]" : "size-[18px]";
  return (
    <span role="radiogroup" aria-label={label} className="inline-flex shrink-0 gap-0.5">
      {[1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
          onClick={() => onChange(value === n ? n - 1 : n)}
          className="grid place-items-center rounded outline-none focus-visible:outline-2 focus-visible:outline-ring"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={cls}>
            <path d={STAR} strokeWidth={1.5} strokeLinejoin="round" className={n <= value ? "fill-accent stroke-accent" : "fill-none stroke-border-strong hover:stroke-accent"} />
          </svg>
        </button>
      ))}
    </span>
  );
}

const CHIP_TONE = {
  today: "bg-accent-subtle text-accent-text",
  overdue: "bg-danger-subtle text-danger",
  planned: "bg-surface-muted text-muted-foreground",
  done: "border border-success/40 text-success",
} as const;

/** Chip de la próxima actividad (o «Pedido creado» / «Cobrado» en las ganadas). */
export function ActivityChip({ chip, className }: { chip: CardChip; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-[3px] text-2xs font-medium", CHIP_TONE[chip.tone], className)}>
      {chip.tone === "today" || chip.tone === "overdue" || (chip.tone === "planned" && chip.text !== "Sin actividad") ? <Clock aria-hidden="true" className="size-[11px]" /> : null}
      {chip.text}
    </span>
  );
}

/**
 * Avatar de una persona (cliente o integrante del equipo): su blobatar determinista, como en el resto de la app. 20 px (contacto en
 * la tarjeta), 24 px (responsable) o 28 px (detalle). Decorativo: el nombre siempre va escrito al lado o en el lector de pantalla.
 */
export function Initials({ name, id, email, size = 20, className }: { name: string; id?: string | null; email?: string | null; size?: 20 | 24 | 28; tone?: "muted" | "accent"; className?: string }) {
  const box = size === 28 ? "size-7 rounded-lg" : size === 24 ? "size-6 rounded-lg" : "size-5 rounded-md";
  return <CustomerAvatar identity={{ name, id, email }} className={cn(box, className)} />;
}
