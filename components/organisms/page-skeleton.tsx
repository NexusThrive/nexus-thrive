import { Skeleton } from "@/components/atoms/skeleton";
import { EmptyPageFrame } from "@/components/molecules/empty-page-frame";
import { SkeletonEmptySwitch } from "./skeleton-empty-switch";

/** Tarjeta de tablero (misma que `Widget`): esquinas suaves y borde casi invisible. */
const W = "rounded-(--radius-widget) border border-border/60 bg-card";

export type PageSkeletonVariant = "dashboard" | "table" | "detail" | "form" | "profile" | "apps" | "list" | "record" | "board";

function HeaderSkeleton({ actions = true }: { actions?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid w-full max-w-md gap-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64 max-w-[80%]" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      {actions ? <Skeleton className="h-11 w-36 rounded-full" /> : null}
    </div>
  );
}

function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="grid gap-3 rounded-(--radius-widget) border border-border/60 bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-(--radius-widget) border border-border/60 bg-card">
      <div className="flex gap-6 border-b border-border/50 px-5 py-4">
        {[28, 18, 14, 12].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border/50 px-5 py-3.5 last:border-b-0">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Skeleton className="h-3.5" style={{ width: `${30 + ((i * 7) % 40)}%` }} />
            <Skeleton className="h-2.5 w-1/5" />
          </div>
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Widget en esqueleto: título con su botón circular, una cifra y líneas. Misma forma que los de Inicio. */
function WidgetSkeleton({ lines = 2, tall = false, className = "" }: { lines?: number; tall?: boolean; className?: string }) {
  return (
    <div className={`${W} grid content-start gap-4 p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="size-9 shrink-0 rounded-full" />
      </div>
      <Skeleton className="h-8 w-40 max-w-full" />
      {tall ? <Skeleton className="h-36 w-full rounded-3xl" /> : null}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${86 - i * 18}%` }} />
      ))}
    </div>
  );
}

/** Inicio (raíz): el saludo en su tarjeta cálida con AURI, cuatro cifras y dos filas de widgets, como el tablero real. */
function AppsSkeleton({ label }: { label: string }) {
  return (
    <div data-bleed="" role="status" aria-busy="true" aria-label={label} className="mx-auto flex max-w-[1680px] flex-col gap-4 px-5 pb-16 pt-6 md:px-6">
      <div className="relative grid items-center gap-6 overflow-hidden rounded-sheet bg-accent-subtle/40 px-6 py-7 min-[820px]:grid-cols-[minmax(0,1fr)_auto] min-[820px]:px-9 min-[820px]:py-9">
        <div className="grid gap-5">
          <Skeleton className="h-12 w-80 max-w-full bg-card/70" />
          <Skeleton className="h-12 w-52 max-w-full bg-card/70" />
          <Skeleton className="h-4 w-96 max-w-full bg-card/70" />
        </div>
        <Skeleton className="hidden size-[200px] rounded-full bg-card/60 min-[820px]:block" />
      </div>
      <div className="grid gap-4 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <WidgetSkeleton key={i} lines={1} />
        ))}
      </div>
      <div className="grid gap-4 min-[820px]:grid-cols-2 min-[1280px]:grid-cols-3">
        <WidgetSkeleton tall lines={0} />
        <WidgetSkeleton tall lines={0} className="bg-accent-subtle/40" />
        <WidgetSkeleton tall lines={0} />
      </div>
      <div className="grid gap-4 min-[820px]:grid-cols-2 min-[1280px]:grid-cols-3">
        <WidgetSkeleton lines={4} />
        <WidgetSkeleton lines={4} />
        <WidgetSkeleton lines={4} />
      </div>
    </div>
  );
}

/** Panel de control de una lista a todo el ancho: «Nuevo» en píldora, título y menú; búsqueda en píldora al centro; paginador y vistas redondos a la derecha. */
function ListToolbarSkeleton() {
  return (
    <div className="grid items-center gap-x-5 gap-y-4 px-6 py-6 min-[1100px]:grid-cols-[1fr_minmax(0,620px)_1fr]">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-[116px] rounded-full" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="size-11 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full max-w-[620px] justify-self-center rounded-full" />
      <div className="hidden items-center justify-end gap-2 min-[1100px]:flex">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="ms-2 h-11 w-36 rounded-full" />
      </div>
    </div>
  );
}

/** Estado vacío en precarga: el mismo marco (alto disponible, N grande abajo) con el título, la descripción y la acción en esqueleto. */
function EmptySkeleton() {
  return (
    <EmptyPageFrame remember={false}>
      <div className="grid w-full max-w-2xl justify-items-center gap-6">
        <Skeleton className="size-16 rounded-full" />
        <div className="grid justify-items-center gap-2.5">
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid gap-2.5 rounded-3xl bg-card/85 p-5">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </EmptyPageFrame>
  );
}

/** Lista a todo el ancho (Clientes): panel de control de tres zonas y tabla de filas de 38 px; en móvil, lista compacta. */
function ListSkeleton({ label }: { label: string }) {
  const widths = [22, 14, 12, 10, 9];
  return (
    <div data-bleed="" role="status" aria-busy="true" aria-label={label} className="flex flex-col">
      <ListToolbarSkeleton />
      <div className="hidden border-b border-border/50 md:block">
        <div className="flex h-[54px] items-center gap-6 border-b border-border/50 px-5">
          <Skeleton className="size-4 shrink-0 rounded-md" />
          {widths.map((w, i) => (
            <span key={i} className={i === 0 ? "flex-[1.6]" : "flex-1"}>
              <Skeleton className="h-3" style={{ width: `${40 + w}%` }} />
            </span>
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex h-[54px] items-center gap-6 border-b border-border/50 px-5 last:border-b-0">
            <Skeleton className="size-4 shrink-0 rounded-md" />
            <span className="flex flex-[1.6] items-center gap-2.5">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-3" style={{ width: `${35 + ((i * 17) % 40)}%` }} />
            </span>
            {widths.slice(1).map((w, j) => (
              <span key={j} className="flex-1">
                <Skeleton className="h-3" style={{ width: `${30 + w * 2 - ((i + j) % 3) * 8}%` }} />
              </span>
            ))}
          </div>
        ))}
      </div>
      <ul className="md:hidden">
        {Array.from({ length: 9 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-border/50 px-5 py-2.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <span className="grid min-w-0 flex-1 gap-1.5">
              <Skeleton className="h-3.5" style={{ width: `${40 + ((i * 11) % 35)}%` }} />
              <Skeleton className="h-2.5 w-1/3" />
            </span>
            <Skeleton className="h-3 w-14" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tablero por etapas (CRM): panel de control de la lista y columnas de 300 px con su encabezado y tarjetas; desborda a lo ancho. */
function BoardSkeleton({ label }: { label: string }) {
  const cards = [3, 2, 2, 1];
  return (
    <div data-bleed="" role="status" aria-busy="true" aria-label={label} className="flex flex-col">
      <ListToolbarSkeleton />
      <div className="flex items-start gap-4 overflow-hidden px-5 pb-12 pt-1">
        {cards.map((n, col) => (
          <div key={col} className="flex w-[300px] shrink-0 flex-col gap-3">
            <div className="grid gap-2 px-1">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4" style={{ width: `${70 + ((col * 23) % 40)}px` }} />
                <Skeleton className="size-8 rounded-full" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="grid gap-2.5 rounded-3xl border border-border/60 bg-card p-4">
                <Skeleton className="h-3.5" style={{ width: `${55 + (((col + i) * 17) % 35)}%` }} />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 shrink-0 rounded-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Registro (ficha o formulario): cabecera con volver, a la izquierda tarjetas anchas y a la derecha el perfil y sus datos, como la ficha real. */
function RecordSkeleton({ label }: { label: string }) {
  return (
    <div data-bleed="" role="status" aria-busy="true" aria-label={label} className="flex flex-col pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-2 pt-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="h-7 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>
      <div className="grid w-full items-start gap-4 px-6 pt-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid min-w-0 gap-4">
          <div className={`${W} grid gap-4 p-6`}>
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-2">
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-10 w-28 rounded-full" />
              </div>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-3xl" />
              ))}
            </div>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[112px] rounded-3xl" />
            ))}
          </div>
          <div className={`${W} grid gap-3 p-4`}>
            <div className="flex gap-2">
              {[70, 110, 130, 80].map((w, i) => (
                <Skeleton key={i} className="h-10 rounded-full" style={{ width: w }} />
              ))}
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="grid min-w-0 gap-4">
          <div className={`${W} grid justify-items-center gap-4 p-6`}>
            <Skeleton className="size-[120px] rounded-full" />
            <Skeleton className="h-7 w-44" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="size-11 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
          <div className={`${W} grid gap-4 p-6`}>
            <div className="grid gap-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Precarga de una pantalla mientras el servidor responde: la misma forma que
 * la vista real (encabezado, KPIs, filtros, tabla o detalle) con el brillo
 * que cruza en el ángulo de la N. Reemplaza la intro de la N al cambiar de
 * módulo: la intro grande queda solo para la entrada al negocio.
 */
export function PageSkeleton({
  variant = "table",
  label = "Cargando",
  kpis = true,
}: {
  variant?: PageSkeletonVariant;
  /** Texto para lectores de pantalla. */
  label?: string;
  /** Muestra la fila de KPIs (variante tabla). */
  kpis?: boolean;
}) {
  if (variant === "apps") return <AppsSkeleton label={label} />;
  if (variant === "record") return <RecordSkeleton label={label} />;
  if (variant === "board") return <BoardSkeleton label={label} />;
  // Si la vista estaba vacía la última vez, la precarga pinta su estado vacío (sin filas) con la misma cabecera.
  if (variant === "list")
    return (
      <SkeletonEmptySwitch
        normal={<ListSkeleton label={label} />}
        empty={
          <div data-bleed="" role="status" aria-busy="true" aria-label={label} className="flex flex-col">
            <ListToolbarSkeleton />
            <EmptySkeleton />
          </div>
        }
      />
    );
  if (variant === "table" || variant === "dashboard" || variant === "detail")
    return (
      <SkeletonEmptySwitch
        normal={<GenericSkeleton variant={variant} label={label} kpis={kpis} />}
        empty={
          <div className="grid gap-5" role="status" aria-busy="true" aria-label={label}>
            <HeaderSkeleton actions={variant !== "dashboard"} />
            <EmptySkeleton />
          </div>
        }
      />
    );
  return <GenericSkeleton variant={variant} label={label} kpis={kpis} />;
}

function GenericSkeleton({ variant, label, kpis }: { variant: PageSkeletonVariant; label: string; kpis: boolean }) {
  return (
    <div className="grid gap-5" role="status" aria-busy="true" aria-label={label}>
      {variant === "profile" ? (
        // Ficha 360°: cabecera con foto y acciones, resumen en tres columnas y pestañas.
        <div className="flex flex-wrap items-center gap-4 rounded-(--radius-widget) border border-border/60 bg-card p-4 sm:p-5">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="grid min-w-0 flex-1 gap-2.5">
            <Skeleton className="h-6 w-56 max-w-[70%]" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="size-10 rounded-full" />
          </div>
        </div>
      ) : variant === "detail" ? (
        <div className="grid gap-2.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-72 max-w-[85%]" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>
      ) : (
        <HeaderSkeleton actions={variant !== "dashboard"} />
      )}

      {variant === "dashboard" ? (
        <>
          <KpiRowSkeleton />
          <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="rounded-(--radius-widget) border border-border/60 bg-card p-5">
              <Skeleton className="h-[220px] w-full" />
            </div>
            <div className="grid gap-3 rounded-(--radius-widget) border border-border/60 bg-card p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <Skeleton className="h-3.5 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {variant === "table" ? (
        <>
          {kpis ? <KpiRowSkeleton /> : null}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-full sm:w-80" />
            <Skeleton className="h-10 w-40" />
          </div>
          <TableSkeleton />
        </>
      ) : null}

      {variant === "detail" ? (
        <>
          <div className="flex gap-4 border-b border-border/50 pb-2.5">
            {[90, 110, 90, 120, 100].map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: w }} />
            ))}
          </div>
          <KpiRowSkeleton />
          <TableSkeleton rows={5} />
        </>
      ) : null}

      {variant === "profile" ? (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="grid gap-3 rounded-(--radius-widget) border border-border/60 bg-card p-5 lg:col-span-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="grid gap-3 rounded-(--radius-widget) border border-border/60 bg-card p-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-4 border-b border-border/50 pb-2.5">
            {[90, 110, 90, 120, 100].map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: w }} />
            ))}
          </div>
          <TableSkeleton rows={5} />
        </>
      ) : null}

      {variant === "form" ? (
        <>
          <div className="flex gap-4 border-b border-border/50 pb-2.5">
            {[110, 110, 70, 90].map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: w }} />
            ))}
          </div>
          <div className="grid gap-4 rounded-(--radius-widget) border border-border/60 bg-card p-5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
