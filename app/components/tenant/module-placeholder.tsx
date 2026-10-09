import type { LucideIcon } from "lucide-react";
import { Wrench } from "lucide-react";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

/**
 * Estado vacío de los módulos del tenant (CRM, Finanzas, ...)
 * Se reemplaza por la vista real de cada módulo en fases siguientes.
 */
export default function ModulePlaceholder({
  title,
  description,
  icon: Icon,
}: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-card px-6 py-14 text-center sm:py-20">
      <span
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-md bg-muted text-muted-foreground"
      >
        <Icon className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
        <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
        Módulo en construcción
      </span>
    </div>
  );
}