import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ProgressBar } from "@/components/atoms/progress-bar";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { PRESENCE_STATES } from "@/lib/presence/presence";
import type { PresenceSnapshot } from "@/lib/presence/load";

/**
 * Presence Thrive (resumen del panel): solo el porcentaje y el botón
 * "Administrar", que lleva a la página completa `/presence`. Aquí no va el
 * detalle: el layout apila título, puntaje y barra para no deformarse en móvil.
 */
export function PresenceSummary({
  presence,
  href,
}: {
  presence: PresenceSnapshot;
  href: string;
}) {
  const meta = PRESENCE_STATES[presence.state];

  return (
    <section
      aria-label="Presence Thrive"
      className="rounded-lg border border-border bg-surface px-4 py-3.5 sm:px-[18px]"
    >
      <div className="flex items-center gap-2.5">
        <span className="nx-slash shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate font-display text-[15px] font-semibold">Presence Thrive</h2>
            <Badge tone={meta.tone} className="shrink-0">
              {meta.label}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {presence.scannedAt
              ? `Último análisis ${formatRelativeTime(presence.scannedAt).toLowerCase()}.`
              : "Aún sin analizar."}
          </p>
        </div>
        <span className="shrink-0 font-display text-3xl font-semibold leading-none tabular-nums">
          {presence.score}%
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar
          value={presence.score / 100}
          tone={meta.bar}
          label="Presencia digital"
          className="h-1.5 flex-1"
        />
        <Link
          href={href}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          Administrar
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export default PresenceSummary;
