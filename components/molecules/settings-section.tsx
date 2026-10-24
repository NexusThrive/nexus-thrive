import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";

/** Un dato en modo lectura: etiqueta pequeña, valor legible; sin dato se dice «Sin completar». */
export function SettingsRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-[14px] text-foreground">{value || <span className="text-muted-foreground">Sin completar</span>}</dd>
    </div>
  );
}

/**
 * Bloque de Configuración: título, descripción, datos de lectura y, si la persona puede, «Modificar».
 * Sin `onEdit` (o sin permiso) es solo informativo.
 */
export function SettingsSection({ id, title, description, canManage = false, onEdit, children }: { id: string; title: string; description: string; canManage?: boolean; onEdit?: () => void; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-card px-5 py-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id={id} className="font-display text-[15px] font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        </div>
        {canManage && onEdit ? (
          <button type="button" onClick={onEdit} aria-label={`Modificar ${title.toLowerCase()}`} className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}>
            <Pencil aria-hidden="true" className="size-3.5" /> Modificar
          </button>
        ) : null}
      </header>
      <dl className="mt-2 divide-y divide-border">{children}</dl>
    </section>
  );
}
