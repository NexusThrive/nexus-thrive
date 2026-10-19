"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SwipeCard } from "@/components/molecules/swipe-card";
import { Archive, Banknote, ChevronLeft, ChevronRight, Mail, MessageCircle, Pencil, Phone, RotateCcw, Trash2, X } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import {
  archiveCustomerAction,
  deleteCustomersAction,
  restoreCustomerAction,
  type CustomerActionResult,
} from "../actions";
import ConfirmDialog from "./confirm-dialog";
import CustomerSheet from "./customer-sheet";
import { useVerticalTerms } from "../../vertical-terms-context";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  /** Fecha ya formateada en el servidor (hidratación estable). */
  createdAt: string;
  photoId: string | null;
  tags: string[];
  documentId: string | null;
};

/** Foto del cliente o sus iniciales. */
function Face({ row, className }: { row: CustomerRow; className: string }) {
  return row.photoId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/files/${row.photoId}`} alt="" className={`${className} object-cover`} />
  ) : (
    <span aria-hidden="true" className={className}>
      {initialsOf(row.name)}
    </span>
  );
}

type Notice = { kind: "error" | "success"; text: string } | null;

const ICON_BUTTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-foreground/20 hover:bg-muted hover:text-foreground/80 disabled:cursor-not-allowed disabled:opacity-50";

/** Set de selección vacío compartido (solo lectura). */
const EMPTY_SELECTION: ReadonlySet<string> = new Set();

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

export default function CustomerTable({
  tenantSlug,
  rows,
  status,
  page,
  totalPages,
  total,
  query,
}: {
  tenantSlug: string;
  rows: CustomerRow[];
  status: "active" | "archived";
  page: number;
  totalPages: number;
  total: number;
  query: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const terms = useVerticalTerms();
  const customerLabel = terms.customer.toLowerCase();
  const customersLabel = terms.customers.toLowerCase();

  // La selección solo aplica a la vista de archivados. Se guarda junto a la
  // vista en la que se hizo: si el usuario cambia de pestaña, la selección
  // vieja queda ignorada (derivada, sin efecto que reinicie estado).
  const [selection, setSelection] = useState<{
    status: string;
    ids: Set<string>;
  }>(() => ({ status, ids: new Set() }));
  const [editTarget, setEditTarget] = useState<CustomerRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const selected = selection.status === status ? selection.ids : EMPTY_SELECTION;

  const replaceSelection = (ids: Set<string>) => {
    setSelection({ status, ids });
  };

  // Los avisos se auto-ocultan a los 5 s.
  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const runAction = (
    task: () => Promise<CustomerActionResult>,
    onSuccess?: (result: CustomerActionResult) => void,
  ) => {
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        setNotice(null);
        onSuccess?.(result);
      } else {
        setNotice({
          kind: "error",
          text: result.message ?? "No se pudo completar la acción.",
        });
      }
    });
  };

  const navigateToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const pageIds = rows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;
  const someSelected = selectedOnPage > 0 && !allSelected;

  const toggleRow = (id: string) => {
    setSelection((current) => {
      const base = current.status === status ? current.ids : new Set<string>();
      const next = new Set(base);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { status, ids: next };
    });
  };

  const toggleAllOnPage = () => {
    setSelection((current) => {
      const base = current.status === status ? current.ids : new Set<string>();
      const next = new Set(base);
      if (allSelected) {
        for (const id of pageIds) {
          next.delete(id);
        }
      } else {
        for (const id of pageIds) {
          next.add(id);
        }
      }
      return { status, ids: next };
    });
  };

  const confirmBulkDelete = () => {
    const ids = [...selected];
    setConfirmOpen(false);
    runAction(
      () => deleteCustomersAction(tenantSlug, ids),
      (result) => {
        replaceSelection(new Set());
        const count = result.deleted ?? ids.length;
        setNotice({
          kind: "success",
          text: `Se eliminaron ${count} ${count === 1 ? customerLabel : customersLabel} definitivamente.`,
        });
      },
    );
  };

  const isArchivedView = status === "archived";

  return (
    <div className="space-y-4">
      {/* Aviso de éxito/error */}
      {notice ? (
        <div
          role="status"
          className={[
            "flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm",
            notice.kind === "error"
              ? "border-destructive/20 bg-destructive/10 text-destructive"
              : "border-success/20 bg-success/10 text-success",
          ].join(" ")}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setNotice(null)}
            className="rounded p-0.5 opacity-70 transition hover:opacity-100"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Barra de selección múltiple (solo archivados) */}
      {isArchivedView && selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">
            {selected.size} {selected.size === 1 ? "seleccionado" : "seleccionados"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => replaceSelection(new Set())}
              className="h-9 rounded-lg border border-destructive/20 bg-card px-3 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-destructive px-3 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-60"
            >
              {isPending ? (
                <NLoader size={16} className="text-current" />
              ) : (
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              )}
              Eliminar definitivamente
            </button>
          </div>
        </div>
      ) : null}

      {/* ---------- Estado vacío ---------- */}
      {rows.length === 0 ? (
        <EmptyState
          className="rounded-lg border border-border bg-card"
          title={query ? `Sin coincidencias para «${query}»` : isArchivedView ? `No hay ${customersLabel} archivados` : `Aún no hay ${customersLabel} registrados`}
          description={query ? "Prueba con otro término o limpia la búsqueda." : isArchivedView ? `Los ${customersLabel} que archives aparecerán aquí.` : `Crea el primer ${customerLabel} con el botón «Nuevo ${customerLabel}».`}
        />
      ) : (
        <>
          {/* ---------- Tabla (desktop) ---------- */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card sm:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                {terms.customers} de {tenantSlug}
              </caption>
              <thead className="border-b border-border bg-muted text-xs font-semibold text-muted-foreground">
                <tr>
                  {isArchivedView ? (
                    <th scope="col" className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar todos los ${customersLabel} de esta página`}
                        checked={allSelected}
                        ref={(element) => {
                          if (element) {
                            element.indeterminate = someSelected;
                          }
                        }}
                        onChange={toggleAllOnPage}
                        className="h-4 w-4 cursor-pointer rounded accent-gold-600"
                      />
                    </th>
                  ) : null}
                  <th scope="col" className="px-4 py-3">
                    {terms.customer}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Teléfono
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Registrado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-muted/60">
                    {isArchivedView ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar a ${row.name}`}
                          checked={selected.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="h-4 w-4 cursor-pointer rounded accent-gold-600"
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Face row={row} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent-subtle text-xs font-semibold text-accent-text" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium text-foreground">
                            <Link
                              href={`/${tenantSlug}/crm/${row.id}`}
                              className="truncate text-foreground transition-colors hover:text-accent-text hover:underline"
                              title={`Ver ficha de ${row.name}`}
                            >
                              {row.name}
                            </Link>
                            {isArchivedView ? (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                Archivado
                              </span>
                            ) : null}
                          </p>
                          {row.email ? (
                            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <Mail aria-hidden="true" className="h-3 w-3 shrink-0" />
                              <span className="truncate">{row.email}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.phone ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                          {row.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.createdAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {isArchivedView ? (
                          <button
                            type="button"
                            title="Restaurar"
                            aria-label={`Restaurar a ${row.name}`}
                            disabled={isPending}
                            onClick={() =>
                              runAction(() => restoreCustomerAction(tenantSlug, row.id))
                            }
                            className={`${ICON_BUTTON} border-success/20 text-success hover:border-success/40 hover:bg-success/10 hover:text-success`}
                          >
                            <RotateCcw aria-hidden="true" className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              title="Archivar"
                              aria-label={`Archivar a ${row.name}`}
                              disabled={isPending}
                              onClick={() =>
                                runAction(() => archiveCustomerAction(tenantSlug, row.id))
                              }
                              className={ICON_BUTTON}
                            >
                              <Archive aria-hidden="true" className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Editar"
                              aria-label={`Editar a ${row.name}`}
                              disabled={isPending}
                              onClick={() => setEditTarget(row)}
                              className={ICON_BUTTON}
                            >
                              <Pencil aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- Tarjetas (mobile) ---------- */}
          {isArchivedView ? (
            <ul className="space-y-3 sm:hidden">
              {rows.map((row) => (
                <li key={row.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar a ${row.name}`}
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className="mt-2 h-4 w-4 cursor-pointer rounded accent-gold-600"
                    />
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-accent-subtle text-xs font-semibold text-accent-text">
                      {initialsOf(row.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        {row.name}
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">Archivado</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.phone || "Sin teléfono"} · {row.createdAt}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction(() => restoreCustomerAction(tenantSlug, row.id))}
                      className={`${ICON_BUTTON} w-auto border-success/20 px-3 text-success`}
                    >
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      <span className="ml-1.5 text-xs font-medium">Restaurar</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid gap-2.5 sm:hidden">
              <li className="text-center text-xs text-muted-foreground">Desliza una tarjeta a la izquierda para cobrar o recordar.</li>
              {rows.map((row) => {
                const digits = row.phone.replace(/\D/g, "");
                const wa = digits ? `https://wa.me/${digits.length === 10 ? `57${digits}` : digits}?text=${encodeURIComponent(`Hola ${row.name.split(" ")[0]}, te escribimos de parte de nuestro negocio.`)}` : undefined;
                return (
                  <li key={row.id}>
                    <SwipeCard
                      actions={[
                        { label: "Cobrar", icon: Banknote, tone: "gold", href: `/${tenantSlug}/finance?nuevo=pago&cliente=${row.id}` },
                        { label: "Recordar", icon: MessageCircle, tone: "ink", href: wa, external: true, disabled: !wa },
                        { label: "Editar", icon: Pencil, tone: "muted", onClick: () => setEditTarget(row) },
                        { label: "Archivar", icon: Archive, tone: "danger", onClick: () => runAction(() => archiveCustomerAction(tenantSlug, row.id)), disabled: isPending },
                      ]}
                    >
                      <Link href={`/${tenantSlug}/crm/${row.id}`} draggable={false} className="flex items-center gap-3 px-3.5 py-3">
                        <Face row={row} className="grid size-[38px] shrink-0 place-items-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground" />
                        <span className="min-w-0 flex-1">
                          <b className="block truncate font-medium">{row.name}</b>
                          <small className="block truncate text-xs text-muted-foreground">{[row.phone || row.email || "Sin contacto", row.documentId].filter(Boolean).join(" · ")}</small>
                          {row.tags.length ? (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {row.tags.slice(0, 3).map((t) => (
                                <span key={t} className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                                  {t}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                        <small className="shrink-0 text-xs text-muted-foreground">{row.createdAt}</small>
                      </Link>
                    </SwipeCard>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ---------- Paginación ---------- */}
      {totalPages > 1 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {total} en total
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => navigateToPage(page - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => navigateToPage(page + 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Siguiente
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* ---------- Modales ---------- */}
      {editTarget ? (
        <CustomerSheet tenantSlug={tenantSlug} customerId={editTarget.id} onClose={() => setEditTarget(null)} />
      ) : null}

      {confirmOpen ? (
        <ConfirmDialog
          title="Eliminar definitivamente"
          description={`Esta acción no se puede deshacer. Los ${customersLabel} seleccionados se eliminarán del sistema.`}
          detail={`${selected.size} ${
            selected.size === 1
              ? `${customerLabel} archivado seleccionado`
              : `${customersLabel} archivados seleccionados`
          } · sus pagos se conserván sin ${customerLabel} vinculado.`}
          confirmLabel="Eliminar definitivamente"
          pending={isPending}
          onConfirm={confirmBulkDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </div>
  );
}
