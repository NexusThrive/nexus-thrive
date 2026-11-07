"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { archiveCustomerAction, restoreCustomerAction } from "@/app/[tenant]/(app)/contactos/actions";
import { deleteCustomerFromFichaAction, duplicateCustomerAction } from "@/app/[tenant]/(app)/contactos/[id]/ficha-actions";
import { cn } from "@/lib/utils";

const outline = cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border bg-transparent");
const square = "grid size-[34px] shrink-0 place-items-center rounded-lg border border-border text-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Panel de control de la ficha: volver, ruta y menú ⋮ (archivar, duplicar, eliminar) a la izquierda; Editar, Nueva cita, Nueva venta
 * y el paginador de la lista de origen a la derecha.
 */
export default function FichaControl({
  slug,
  customerId,
  name,
  customersLabel,
  listHref,
  active,
  canRemove,
  bookHref,
  saleHref,
  pager,
}: {
  slug: string;
  customerId: string;
  name: string;
  customersLabel: string;
  /** Lista de origen con su búsqueda, filtro y orden. */
  listHref: string;
  active: boolean;
  canRemove: boolean;
  bookHref: string | null;
  saleHref: string | null;
  pager: { index: number; total: number; prevHref: string | null; nextHref: string | null } | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, start] = useTransition();

  const report = (r: { ok: boolean; message?: string }, success: string) => toast(r.ok ? success : (r.message ?? "No se pudo completar."), r.ok ? "success" : "error");

  const archive = () =>
    start(async () => {
      const r = active ? await archiveCustomerAction(slug, customerId) : await restoreCustomerAction(slug, customerId);
      report(r, active ? "Cliente archivado" : "Cliente restaurado");
      if (r.ok) router.refresh();
    });

  const duplicate = () =>
    start(async () => {
      const r = await duplicateCustomerAction(slug, customerId);
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok && r.id) router.push(`/${slug}/contactos/${r.id}?editar=1`);
    });

  const remove = async () => {
    if (!(await confirm({ title: `¿Eliminar a ${name}?`, description: "Se borra la ficha. Esta acción no se puede deshacer.", confirmLabel: "Eliminar", tone: "danger" }))) return;
    start(async () => {
      const r = await deleteCustomerFromFichaAction(slug, customerId);
      if (r.ok) {
        toast(r.message, "success");
        router.push(listHref);
        return;
      }
      if (!("suggestArchive" in r && r.suggestArchive)) return void toast(r.message, "error");
      // Con historial no se borra: se ofrece archivar, que conserva ventas, citas y facturas.
      if (!(await confirm({ title: "No se puede eliminar", description: r.message, confirmLabel: "Archivar" }))) return;
      const a = await archiveCustomerAction(slug, customerId);
      report(a, "Cliente archivado");
      if (a.ok) router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href={listHref} aria-label={`Volver a ${customersLabel}`} className={square}>
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <nav aria-label="Ruta" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1.5 text-lg font-medium">
            <li>
              <Link href={listHref} className="text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                {customersLabel}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-4 text-muted-foreground" />
            </li>
            <li aria-current="page" className="truncate text-foreground">
              {name}
            </li>
          </ol>
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Más acciones" disabled={pending} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <MoreVertical aria-hidden="true" className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {canRemove ? <DropdownMenuItem onSelect={archive}>{active ? "Archivar" : "Restaurar"}</DropdownMenuItem> : null}
            <DropdownMenuItem onSelect={duplicate}>Duplicar</DropdownMenuItem>
            {canRemove ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void remove()} className="text-danger">
                  Eliminar
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/${slug}/contactos/${customerId}?editar=1`} className={outline}>
          Editar
        </Link>
        {bookHref ? (
          <Link href={bookHref} className={outline}>
            Nueva cita
          </Link>
        ) : null}
        {saleHref ? (
          <Link href={saleHref} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px] font-semibold" })}>
            Nueva venta
          </Link>
        ) : null}
        {pager ? (
          <div className="ms-2 flex items-center gap-1 text-sm text-muted-foreground">
            <PagerLink href={pager.prevHref} label="Cliente anterior">
              <ChevronLeft aria-hidden="true" className="size-4" />
            </PagerLink>
            <span className="tabular-nums">
              {pager.index} / {pager.total}
            </span>
            <PagerLink href={pager.nextHref} label="Cliente siguiente">
              <ChevronRight aria-hidden="true" className="size-4" />
            </PagerLink>
          </div>
        ) : null}
      </div>
      {confirmDialog}
    </div>
  );
}

function PagerLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const cls = "grid size-[34px] place-items-center rounded-lg";
  if (!href)
    return (
      <span aria-disabled="true" aria-label={label} role="link" className={cn(cls, "opacity-40")}>
        {children}
      </span>
    );
  return (
    <Link href={href} aria-label={label} className={cn(cls, "text-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring")}>
      {children}
    </Link>
  );
}
