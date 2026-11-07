"use client";

import { formatCurrency } from "@/lib/foundation/format";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SwipeCard } from "@/components/molecules/swipe-card";
import { ArrowDown, ArrowUp, Archive, Banknote, MessageCircle, Pencil, Plus, RotateCcw, X } from "lucide-react";
import {
  archiveCustomerAction,
  deleteCustomersAction,
  restoreCustomerAction,
  type CustomerActionResult,
} from "@/app/[tenant]/(app)/contactos/actions";
import { ConfirmDialog } from "@/components/organisms/confirm-dialog";
import CustomerSheet from "./customer-sheet";
import { useVerticalTerms } from "../../vertical-terms-context";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";
import { useQuickCreate } from "@/components/organisms/quick-create-host";
import { useCustomerSelection } from "./customer-selection";
import { ColumnChooser, ResizeHandle, useColumnPrefs, type ColumnKey } from "./customer-columns";

export type CustomerRow = {
  /** Próxima cita (ISO) o null. */
  nextAppointment: string | null;
  /** Saldo abierto por cobrar en pesos (0 si no debe nada). */
  owed: number;
  /** Parte del saldo ya vencida. */
  overdue: number;
  city: string;
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
  /** Gimnasio: tiene una membresía vigente (si no, se marca en rojo). */
  hasMembership: boolean;
};

/** Foto del cliente o sus iniciales. */
function Face({ row, className }: { row: CustomerRow; className: string }) {
  return row.photoId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/files/${row.photoId}`} alt="" className={`${className} object-cover`} />
  ) : (
    <span aria-hidden="true" className={className}>
      {row.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Aviso de membresía: solo para gimnasios con el módulo y sin plan vigente. */
function MembershipAlert({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-2xs font-semibold uppercase text-destructive ${className}`}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-destructive" />
      Sin membresía
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

/** Próxima cita en la lista: «7 nov, 10:30» (hora de Bogotá). */
const formatAppointment = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Contenido de cada columna configurable; los vacíos se muestran con «—». */
function cellFor(key: ColumnKey, row: CustomerRow): ReactNode {
  const empty = <span className="text-muted-foreground/70">—</span>;
  switch (key) {
    case "email":
      return row.email || empty;
    case "phone":
      return row.phone || empty;
    case "next":
      return row.nextAppointment ? formatAppointment(row.nextAppointment) : empty;
    case "owed":
      return row.owed > 0 ? <span className="font-medium text-danger">{formatCurrency(row.owed)}</span> : empty;
    case "overdue":
      return row.overdue > 0 ? <span className="font-medium text-danger">{formatCurrency(row.overdue)}</span> : empty;
    case "document":
      return row.documentId || empty;
    case "city":
      return row.city || empty;
    case "tags":
      return row.tags.length ? row.tags.join(", ") : empty;
    case "created":
      return row.createdAt;
  }
}

export default function CustomerTable({
  tenantSlug,
  rows,
  status,
  sort,
  query,
  canRemove = true,
  showMembership = false,
}: {
  tenantSlug: string;
  rows: CustomerRow[];
  status: "active" | "archived";
  /** Orden actual (URL): «recent», «name_asc» o «name_desc». */
  sort: "recent" | "name_asc" | "name_desc";
  query: string;
  /** El rol puede archivar, restaurar y eliminar (el servidor lo vuelve a exigir). */
  canRemove?: boolean;
  /** Gimnasio con membresías: marca en rojo a quien no tiene plan vigente. */
  showMembership?: boolean;
}) {
  const router = useRouter();
  const quick = useQuickCreate();
  const columns = useColumnPrefs();
  const [boxWidth, setBoxWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setBoxWidth(Math.floor(entry!.contentRect.width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  const setSort = (next: "recent" | "name_asc" | "name_desc") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", next);
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };
  const nameSort = sort === "name_asc" ? "name_desc" : "name_asc";
  const sortIcon = (active: boolean, descending: boolean) =>
    active ? (descending ? <ArrowDown aria-hidden="true" className="size-3.5" /> : <ArrowUp aria-hidden="true" className="size-3.5" />) : null;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const terms = useVerticalTerms();
  const customerLabel = terms.customer.toLowerCase();
  const customersLabel = terms.customers.toLowerCase();

  // La selección solo aplica a la vista de archivados. Se guarda junto a la
  // vista en la que se hizo: si el usuario cambia de pestaña, la selección
  // vieja queda ignorada (derivada, sin efecto que reinicie estado).
  const { selection, setSelection, register } = useCustomerSelection();
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

  const bulkRun = (action: (id: string) => Promise<CustomerActionResult>, done: (count: number) => string) => {
    const ids = [...selected];
    runAction(
      async () => {
        for (const id of ids) {
          const result = await action(id);
          if (!result.ok) return result;
        }
        return { ok: true };
      },
      () => {
        replaceSelection(new Set());
        setNotice({ kind: "success", text: done(ids.length) });
      },
    );
  };
  const bulkArchive = () => bulkRun((id) => archiveCustomerAction(tenantSlug, id), (n) => `Se archivaron ${n} ${n === 1 ? customerLabel : customersLabel}.`);
  const bulkRestore = () => bulkRun((id) => restoreCustomerAction(tenantSlug, id), (n) => `Se restauraron ${n} ${n === 1 ? customerLabel : customersLabel}.`);

  // El panel de control ejecuta estas acciones desde su menú «Acciones».
  useEffect(() => {
    register({ archive: bulkArchive, restore: bulkRestore, remove: () => setConfirmOpen(true) });
  });

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

  // Toda la fila abre la ficha; los controles de dentro (enlaces, botones, casillas) conservan su acción.
  // El enlace del nombre sigue siendo el camino con teclado y lector de pantalla.
  const openProfile = (event: React.MouseEvent<HTMLElement>, id: string) => {
    if ((event.target as Element).closest("a, button, input, label, [role='button']")) return;
    if (window.getSelection()?.toString()) return; // se está seleccionando texto
    if (event.metaKey || event.ctrlKey) {
      window.open(`/${tenantSlug}/contactos/${id}`, "_blank");
      return;
    }
    router.push(`/${tenantSlug}/contactos/${id}`);
  };

  const isArchivedView = status === "archived";
  // Seleccionar es para eliminar: sin ese permiso no hay casillas ni barra.
  const selectable = canRemove;
  const stickyAvatar = selectable ? 44 : 0;
  const stickyName = stickyAvatar + 36;
  const stickyBg = (isSelected: boolean) => (isSelected ? "bg-accent-subtle" : "bg-background group-hover:bg-surface-muted");
  const fixedWidth = (selectable ? 44 : 0) + 36 + columns.widthOf("name") + 44;
  const dataWidth = columns.visible.reduce((sum, column) => sum + columns.widthOf(column.key), 0);
  // Las columnas de datos visibles llenan el ancho disponible; la casilla, el avatar y el nombre no se estiran.
  const scale = boxWidth > fixedWidth + dataWidth && dataWidth > 0 ? (boxWidth - fixedWidth) / dataWidth : 1;
  const shown = (key: ColumnKey) => Math.floor(columns.widthOf(key) * scale);
  const tableMinWidth = fixedWidth + columns.visible.reduce((sum, column) => sum + shown(column.key), 0);

  return (
    <div className="flex flex-col">
      {/* Aviso de éxito/error */}
      {notice ? (
        <div
          role="status"
          className={[
            "mx-5 mb-3 flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm",
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
      {/* ---------- Estado vacío ---------- */}
      {rows.length === 0 ? (
        <EmptyState
          className="items-center text-center"
          title={query ? `Sin coincidencias para «${query}»` : isArchivedView ? `No hay ${customersLabel} archivados` : `Aún no tienes ${customersLabel}`}
          description={query ? "Prueba con otro término o limpia la búsqueda." : isArchivedView ? `Los ${customersLabel} que archives aparecen aquí.` : "Registra el primero para llevar su historial, sus citas y sus cobros."}
          action={!query && !isArchivedView ? <button type="button" onClick={() => quick.open("new-customer")} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px]" })}><Plus aria-hidden="true" className="size-4" /> Nuevo</button> : undefined}
        />
      ) : (
        <>
          {/* ---------- Tabla (desktop) ---------- */}
          <div ref={boxRef} className="hidden overflow-x-auto sm:block">
            <table className="table-fixed text-left text-sm" style={{ width: tableMinWidth }}>
              <caption className="sr-only">
                {terms.customers} de {tenantSlug}
              </caption>
              <colgroup>
                {selectable ? <col style={{ width: 44 }} /> : null}
                <col style={{ width: 36 }} />
                <col style={{ width: columns.widthOf("name") }} />
                {columns.visible.map((column) => (
                  <col key={column.key} style={{ width: shown(column.key) }} />
                ))}
                <col style={{ width: 44 }} />
              </colgroup>
              <thead className="sticky top-0 z-(--z-sticky) border-b border-border bg-background text-xs font-medium text-muted-foreground">
                <tr className="h-[38px]">
                  {selectable ? (
                    <th scope="col" className="sticky left-0 z-(--z-raised) bg-background ps-5 pe-0">
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
                        className="size-3.5 cursor-pointer rounded accent-gold-600"
                      />
                    </th>
                  ) : null}
                  <th scope="col" className="sticky z-(--z-raised) bg-background px-2" style={{ left: stickyAvatar }}>
                    <span className="sr-only">Foto</span>
                  </th>
                  <th scope="col" className="group/th sticky z-(--z-raised) bg-background px-3" style={{ left: stickyName }} aria-sort={sort === "name_asc" ? "ascending" : sort === "name_desc" ? "descending" : "none"}>
                    <button type="button" onClick={() => setSort(nameSort)} className="inline-flex max-w-full items-center gap-1 truncate outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                      {terms.customer}
                      {sortIcon(sort !== "recent", sort === "name_desc")}
                    </button>
                    <ResizeHandle columnKey="name" label={terms.customer} prefs={columns} />
                  </th>
                  {columns.visible.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="group/th relative px-3"
                      aria-sort={column.key === "created" ? (sort === "recent" ? "descending" : "none") : undefined}
                    >
                      {column.key === "created" ? (
                        <button type="button" onClick={() => setSort("recent")} className="inline-flex max-w-full items-center gap-1 truncate outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                          {column.label}
                          {sortIcon(sort === "recent", true)}
                        </button>
                      ) : (
                        <span className="block truncate">{column.label}</span>
                      )}
                      <ResizeHandle columnKey={column.key} label={column.label} prefs={columns} scale={scale} />
                    </th>
                  ))}
                  <th scope="col" className="sticky right-0 z-(--z-raised) bg-background px-2">
                    <ColumnChooser prefs={columns} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border border-b border-border">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={(event) => openProfile(event, row.id)}
                    className={cn("group h-[38px] cursor-pointer transition hover:bg-muted/60", selected.has(row.id) && "bg-accent-subtle/30")}
                  >
                    {selectable ? (
                      <td className={cn("sticky left-0 z-(--z-raised) ps-5 pe-0", stickyBg(selected.has(row.id)))}>
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar a ${row.name}`}
                          checked={selected.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="size-3.5 cursor-pointer rounded accent-gold-600"
                        />
                      </td>
                    ) : null}
                    <td className={cn("sticky z-(--z-raised) px-2", stickyBg(selected.has(row.id)))} style={{ left: stickyAvatar }}>
                      <Face row={row} className="flex size-[22px] items-center justify-center rounded-[5px] bg-accent-subtle text-2xs font-semibold text-accent-text" />
                    </td>
                    <td className={cn("sticky z-(--z-raised) px-3", stickyBg(selected.has(row.id)))} style={{ left: stickyName }}>
                      <p className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                        <Link
                          href={`/${tenantSlug}/contactos/${row.id}`}
                          className="truncate text-foreground transition-colors hover:text-accent-text hover:underline"
                          title={`Ver ficha de ${row.name}`}
                        >
                          {row.name}
                        </Link>
                        {isArchivedView ? (
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-2xs font-semibold uppercase text-muted-foreground">Archivado</span>
                        ) : null}
                        {showMembership && !row.hasMembership ? <MembershipAlert /> : null}
                      </p>
                    </td>
                    {columns.visible.map((column) => (
                      <td key={column.key} className="truncate px-3 text-muted-foreground">
                        {cellFor(column.key, row)}
                      </td>
                    ))}
                    <td aria-hidden="true" className={cn("sticky right-0 z-(--z-raised)", stickyBg(selected.has(row.id)))} />
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
                    {selectable ? (
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar a ${row.name}`}
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="mt-2 h-4 w-4 cursor-pointer rounded accent-gold-600"
                      />
                    ) : null}
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-accent-subtle text-xs font-semibold text-accent-text">
                      {initialsOf(row.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        {row.name}
                        <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-semibold uppercase text-muted-foreground">Archivado</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.phone || "Sin teléfono"} · {row.createdAt}
                      </p>
                    </div>
                    {canRemove ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => runAction(() => restoreCustomerAction(tenantSlug, row.id))}
                        className={`${ICON_BUTTON} w-auto border-success/20 px-3 text-success`}
                      >
                        <RotateCcw aria-hidden="true" className="h-4 w-4" />
                        <span className="ml-1.5 text-xs font-medium">Restaurar</span>
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-border sm:hidden">
              <li className="px-5 py-2 text-xs text-muted-foreground">Desliza una fila a la izquierda para cobrar o recordar.</li>
              {rows.map((row) => {
                const digits = row.phone.replace(/\D/g, "");
                const wa = digits ? `https://wa.me/${digits.length === 10 ? `57${digits}` : digits}?text=${encodeURIComponent(`Hola ${row.name.split(" ")[0]}, te escribimos de parte de nuestro negocio.`)}` : undefined;
                return (
                  <li key={row.id}>
                    <SwipeCard
                      className="rounded-none border-0 bg-background"
                      actions={[
                        { label: "Cobrar", icon: Banknote, tone: "gold", href: `/${tenantSlug}/finanzas?nuevo=pago&cliente=${row.id}` },
                        { label: "Recordar", icon: MessageCircle, tone: "ink", href: wa, external: true, disabled: !wa },
                        { label: "Editar", icon: Pencil, tone: "muted", onClick: () => setEditTarget(row) },
                        ...(canRemove
                          ? [{ label: "Archivar", icon: Archive, tone: "danger" as const, onClick: () => runAction(() => archiveCustomerAction(tenantSlug, row.id)), disabled: isPending }]
                          : []),
                      ]}
                    >
                      <Link href={`/${tenantSlug}/contactos/${row.id}`} draggable={false} className="flex items-center gap-3 px-5 py-2.5">
                        <Face row={row} className="grid size-8 shrink-0 place-items-center rounded-md bg-accent-subtle text-2xs font-semibold text-accent-text" />
                        <span className="min-w-0 flex-1">
                          <b className="block truncate font-medium">{row.name}</b>
                          {showMembership && !row.hasMembership ? <MembershipAlert className="mt-1" /> : null}
                          <small className="block truncate text-xs text-muted-foreground">{[row.phone || row.email || "Sin contacto", row.documentId].filter(Boolean).join(" · ")}</small>
                          {row.tags.length ? (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {row.tags.slice(0, 3).map((t) => (
                                <span key={t} className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                                  {t}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                        {row.owed > 0 ? <small className="shrink-0 text-sm font-medium text-danger">{formatCurrency(row.owed)}</small> : <small className="shrink-0 text-xs text-muted-foreground">{row.createdAt}</small>}
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
      {/* ---------- Modales ---------- */}
      {editTarget ? (
        <CustomerSheet tenantSlug={tenantSlug} customerId={editTarget.id} onClose={() => setEditTarget(null)} />
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar definitivamente"
        description={`Esta acción no se puede deshacer. Los ${customersLabel} seleccionados se eliminarán del sistema.`}
        confirmLabel="Eliminar definitivamente"
        pendingLabel="Eliminando…"
        onConfirm={confirmBulkDelete}
      >
        {`${selected.size} ${
          selected.size === 1
            ? `${customerLabel} archivado seleccionado`
            : `${customersLabel} archivados seleccionados`
        } · sus pagos se conservan sin ${customerLabel} vinculado.`}
      </ConfirmDialog>
    </div>
  );
}
