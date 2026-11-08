import { Skeleton } from "@/components/atoms/skeleton";
import { EmptyPageFrame } from "@/components/molecules/empty-page-frame";
import { GridBackdrop } from "@/components/molecules/grid-backdrop";
import { SkeletonEmptySwitch } from "./skeleton-empty-switch";

export type PageSkeletonVariant = "dashboard" | "table" | "detail" | "form" | "profile" | "apps" | "list" | "record";

function HeaderSkeleton({ actions = true }: { actions?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid w-full max-w-md gap-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64 max-w-[80%]" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      {actions ? <Skeleton className="h-10 w-36" /> : null}
    </div>
  );
}

function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="grid gap-3 rounded-lg border border-border bg-card p-4">
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
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex gap-6 border-b border-border px-4 py-3.5">
        {[28, 18, 14, 12].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
          <Skeleton className="size-[34px] shrink-0" />
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

/** Inicio (raíz): saludo y pastilla de prueba; debajo «Este mes», el cajón de 9 apps en 4 columnas, y «Hoy» y «Atención». */
function AppsSkeleton({ label }: { label: string }) {
  const side = "grid w-full max-w-xl gap-4 pt-2 min-[1100px]:w-auto min-[1100px]:min-w-[220px] min-[1100px]:max-w-[290px] min-[1100px]:flex-[1_1_240px]";
  return (
    <div data-bleed="" role="status" aria-busy="true" aria-label={label} className="relative isolate min-h-[calc(100dvh-var(--topbar-height)-7rem-env(safe-area-inset-bottom,0px))] overflow-hidden md:min-h-[calc(100dvh-var(--topbar-height)-4rem)]">
      <GridBackdrop variant="home" />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-6 pb-20 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-2.5">
            <Skeleton className="h-2.5 w-36" />
            <Skeleton className="h-7 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 w-80 max-w-full rounded-[10px]" />
        </div>
        <div className="flex flex-wrap items-start justify-center gap-8">
          <div className={side}>
            <Skeleton className="h-2.5 w-20" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid gap-2 py-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-3 w-44" />
              </div>
            ))}
          </div>
          <ul className="mx-auto grid w-fit grid-cols-[repeat(2,112px)] justify-center gap-x-7 gap-y-[30px] pt-2 min-[420px]:grid-cols-[repeat(3,112px)] min-[600px]:grid-cols-[repeat(4,112px)] min-[1100px]:mx-0">
            {Array.from({ length: 9 }).map((_, i) => (
              <li key={i} className="grid justify-items-center gap-3">
                <Skeleton className="size-[84px] rounded-[22px]" />
                <Skeleton className="h-2.5" style={{ width: `${48 + ((i * 13) % 30)}px` }} />
              </li>
            ))}
          </ul>
          <div className={side}>
            <Skeleton className="h-2.5 w-12" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3 py-1">
                <Skeleton className="mt-1 size-2 shrink-0 rounded-full" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
            <Skeleton className="mt-3 h-2.5 w-20" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3 py-1">
                <Skeleton className="mt-1 size-2 shrink-0 rounded-full" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Panel de control de una lista a todo el ancho: nuevo, título y menú; búsqueda al centro; paginador y vista a la derecha. */
function ListToolbarSkeleton() {
  return (
    <div className="grid items-center gap-x-4 gap-y-3 px-5 py-4 min-[1100px]:grid-cols-[1fr_minmax(0,543px)_1fr]">
      <div className="flex items-center gap-3">
        <Skeleton className="h-[34px] w-[84px]" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="size-[34px]" />
      </div>
      <Skeleton className="h-[34px] w-full justify-self-center max-w-[543px]" />
      <div className="hidden items-center justify-end gap-2 min-[1100px]:flex">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="size-[34px]" />
        <Skeleton className="size-[34px]" />
        <Skeleton className="ms-2 size-[34px]" />
      </div>
    </div>
  );
}

/** Estado vacío en precarga: el mismo marco (alto disponible, N grande abajo) con el título, la descripción y la acción en esqueleto. */
function EmptySkeleton() {
  return (
    <EmptyPageFrame remember={false}>
      <div className="grid w-full max-w-2xl justify-items-center gap-6">
        <Skeleton className="size-12 rounded-xl" />
        <div className="grid justify-items-center gap-2.5">
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-[34px] w-32" />
          <Skeleton className="h-[34px] w-36" />
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid gap-2.5 rounded-xl border border-border bg-card p-4">
              <Skeleton className="size-8 rounded-lg" />
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
      <div className="hidden border-b border-border md:block">
        <div className="flex h-[38px] items-center gap-6 border-b border-border px-5">
          <Skeleton className="size-3.5 shrink-0" />
          {widths.map((w, i) => (
            <span key={i} className={i === 0 ? "flex-[1.6]" : "flex-1"}>
              <Skeleton className="h-3" style={{ width: `${40 + w}%` }} />
            </span>
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex h-[38px] items-center gap-6 border-b border-border/60 px-5 last:border-b-0">
            <Skeleton className="size-3.5 shrink-0" />
            <span className="flex flex-[1.6] items-center gap-2.5">
              <Skeleton className="size-6 shrink-0 rounded-md" />
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
          <li key={i} className="flex items-center gap-3 border-b border-border/60 px-5 py-2.5">
            <Skeleton className="size-8 shrink-0 rounded-md" />
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

/** Registro (ficha o formulario): panel de control y, a todo el ancho, tarjetas a la izquierda y la columna lateral a la derecha. */
function RecordSkeleton({ label }: { label: string }) {
  const card = "rounded-xl border border-border bg-card p-[22px]";
  return (
    <div data-bleed="" role="status" aria-busy="true" aria-label={label} className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-[34px]" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-[34px] w-20" />
          <Skeleton className="h-[34px] w-24" />
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-6 px-5 pb-2 pt-2 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <div className={`${card} flex flex-wrap items-start gap-5`}>
            <Skeleton className="size-[88px] shrink-0 rounded-[22px]" />
            <div className="grid min-w-0 flex-1 basis-64 gap-3">
              <Skeleton className="h-8 w-64 max-w-full" />
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-3.5 w-52" />
              <Skeleton className="h-3.5 w-36" />
            </div>
          </div>
          <div className={card}>
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className={card}>
            <Skeleton className="mb-4 h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex w-full min-w-0 shrink-0 flex-col gap-4 lg:w-[400px] lg:border-l lg:border-border lg:ps-6 xl:w-[440px]">
          <div className={`${card} grid gap-3`}>
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-[30px] shrink-0" />
                <Skeleton className="h-3.5 flex-1" />
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
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 sm:p-5">
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
            <Skeleton className="size-10" />
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
            <div className="rounded-lg border border-border bg-card p-5">
              <Skeleton className="h-[220px] w-full" />
            </div>
            <div className="grid gap-3 rounded-lg border border-border bg-card p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0" />
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
          <div className="flex gap-4 border-b border-border pb-2.5">
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
            <div className="grid gap-3 rounded-lg border border-border bg-card p-5 lg:col-span-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="grid gap-3 rounded-lg border border-border bg-card p-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-4 border-b border-border pb-2.5">
            {[90, 110, 90, 120, 100].map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: w }} />
            ))}
          </div>
          <TableSkeleton rows={5} />
        </>
      ) : null}

      {variant === "form" ? (
        <>
          <div className="flex gap-4 border-b border-border pb-2.5">
            {[110, 110, 70, 90].map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: w }} />
            ))}
          </div>
          <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
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
