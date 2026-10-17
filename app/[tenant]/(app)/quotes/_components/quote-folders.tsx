import Link from "next/link";
import { CalendarClock, Folder, FolderClock } from "lucide-react";
import { QuoteStatusBadge } from "@/components/molecules/quote-badges";
import { ProjectStatusBadge } from "../../projects/_components/project-status-badge";
import { formatDateShort, formatMoneyMicro } from "@/lib/format";
import type { QuoteFolderRow } from "@/lib/construction/project-quotes";
import type { ProjectStatusValue } from "@/lib/projects";
import { buttonVariants } from "@/components/atoms/button-variants";

/**
 * Directorio de cotizaciones: una carpeta por obra, con el nombre de la obra
 * debajo del ícono. Abrir la carpeta lleva a la pestaña Cotizaciones de la
 * obra (versiones y seguimientos).
 */
export default function QuoteFolders({
  tenantSlug,
  folders,
  legacyCount,
}: {
  tenantSlug: string;
  folders: QuoteFolderRow[];
  legacyCount: number;
}) {
  if (folders.length === 0 && legacyCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <Folder aria-hidden="true" className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">Aún no hay carpetas</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Cada obra tiene su carpeta de cotizaciones. Crea una obra, arma su presupuesto y emite la
          primera versión.
        </p>
        <Link
          href={`/${tenantSlug}/projects`}
          className={`${buttonVariants()} mt-4`}
        >
          Ir a obras
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {legacyCount > 0 ? (
        <li>
          <Link
            href={`/${tenantSlug}/quotes?folder=anteriores`}
            className="flex h-full flex-col rounded-lg border border-dashed border-gold-300 bg-card p-4 transition hover:border-gold-500 hover:bg-gold-100/40 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <FolderClock aria-hidden="true" className="h-10 w-10 text-gold-700" />
            <span className="mt-2 font-medium text-foreground">Cotizaciones anteriores</span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              {legacyCount} sin obra. Pásalas a una obra para cotizarlas y darles seguimiento.
            </span>
          </Link>
        </li>
      ) : null}
      {folders.map((folder) => (
        <li key={folder.projectId}>
          <Link
            href={`/${tenantSlug}/projects/${folder.projectId}?tab=cotizaciones`}
            className="flex h-full flex-col rounded-lg border border-border bg-card p-4 transition hover:border-border-strong hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-start justify-between gap-2">
              <Folder aria-hidden="true" className="h-10 w-10 shrink-0 text-accent-text" />
              <ProjectStatusBadge status={folder.projectStatus as ProjectStatusValue} />
            </div>
            <span className="mt-2 line-clamp-2 font-medium text-foreground">{folder.projectName}</span>
            <span className="mt-0.5 truncate text-xs text-muted-foreground">
              <span className="font-mono">{folder.projectCode}</span>
              {folder.customerName ? ` · ${folder.customerName}` : ""}
            </span>

            <div className="mt-3 border-t border-border pt-3 text-xs">
              {folder.latest ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    v{folder.latest.version}
                    <QuoteStatusBadge status={folder.latest.status} />
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatMoneyMicro(folder.latest.grandTotal)}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">Sin cotizaciones emitidas</span>
              )}
              <div className="mt-1.5 flex items-center justify-between gap-2 text-muted-foreground">
                <span>
                  {folder.quoteCount} {folder.quoteCount === 1 ? "versión" : "versiones"}
                </span>
                {folder.pendingFollowUps > 0 ? (
                  <span className="inline-flex items-center gap-1 text-gold-700">
                    <CalendarClock aria-hidden="true" className="h-3 w-3" />
                    {folder.pendingFollowUps} pendiente{folder.pendingFollowUps === 1 ? "" : "s"}
                    {folder.nextFollowUp ? ` · ${formatDateShort(folder.nextFollowUp)}` : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
