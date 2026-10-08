"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import {
  AtSign,
  CheckCircle2,
  Globe,
  Loader2,
  LogIn,
  MapPin,
  MessageCircle,
  Power,
  RotateCcw,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getVerticalIcon } from "@/lib/admin/vertical-icons";
import { MODULE_LABELS, VERTICAL_LABELS } from "@/lib/admin-catalogs";
import { paymentMethodLabel } from "@/lib/finance";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { TenantDetail } from "@/lib/admin-db";
import { cn } from "@/lib/utils";
import {
  activateTenantAction,
  createImpersonationAction,
  getTenantDetailAction,
  toggleTenantModuleAction,
  type AdminFormState,
} from "../actions";
import TenantStatusBadge from "./tenant-status-badge";
import SuspendDialog from "./suspend-dialog";

const IDLE: AdminFormState = { status: "idle" };

type TabId = "resumen" | "usuarios" | "modulos";

const TABS: { id: TabId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "usuarios", label: "Usuarios" },
  { id: "modulos", label: "Módulos" },
];

/**
 * Drawer de detalle de un negocio. Carga el detalle on-open vía Server
 * Action (autorizada) y permite gestionar módulos, suspender/reactivar e
 * impersonar, todo con auditoría. Sin datos inventados: lo que no hay se
 * muestra como no disponible.
 */
export default function TenantDrawer({
  tenantId,
  onClose,
}: {
  tenantId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("resumen");

  const { signIn } = useSignIn();
  const [impersonating, setImpersonating] = useState(false);
  const [impersonationError, setImpersonationError] = useState<string | null>(
    null,
  );

  const [moduleState, moduleAction, modulePending] = useActionState(
    toggleTenantModuleAction,
    IDLE,
  );
  const [activateState, activateAction, activatePending] = useActionState(
    activateTenantAction,
    IDLE,
  );

  const load = useCallback(async (id: string) => {
    const result = await getTenantDetailAction(id);
    setDetail(result);
  }, []);

  useEffect(() => {
    // Carga del detalle por interacción (client). El setState ocurre tras el
    // fetch resuelto, no de forma síncrona en el cuerpo del efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tenantId) void load(tenantId);
  }, [tenantId, load]);

  // Tras una mutación exitosa, recargar el detalle del drawer.
  useEffect(() => {
    if (
      (moduleState.status === "ok" || activateState.status === "ok") &&
      tenantId
    ) {
      // Refresco tras una mutación exitosa.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load(tenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleState.status, activateState.status]);

  const handleImpersonate = async () => {
    if (!tenantId) return;
    setImpersonating(true);
    setImpersonationError(null);
    try {
      const result = await createImpersonationAction(tenantId);
      if (result.status !== "ok" || !result.ticket) {
        setImpersonationError(result.message ?? "No se pudo impersonar.");
        return;
      }
      // Clerk 7 (signals): ticket → finalize, que activa la sesión y navega.
      const ticketAttempt = await signIn.ticket({ ticket: result.ticket });
      if (ticketAttempt.error) {
        setImpersonationError(
          ticketAttempt.error.longMessage ??
            ticketAttempt.error.message ??
            "No se pudo validar el ticket de acceso.",
        );
        return;
      }
      const target = result.url ?? "/";
      const finalized = await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          window.location.assign(decorateUrl(target));
        },
      });
      if (finalized.error) {
        setImpersonationError(
          finalized.error.longMessage ??
            finalized.error.message ??
            "No se pudo completar el cambio de sesión.",
        );
      }
    } catch (error) {
      console.error("[admin] impersonate:", error);
      setImpersonationError("No se pudo iniciar la impersonación.");
    } finally {
      setImpersonating(false);
    }
  };

  const visual = detail ? getVerticalIcon(detail.vertical) : null;
  const VerticalIcon = visual?.icon;

  return (
    <Sheet open={tenantId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        {!detail ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="border-b p-6">
              <div className="flex items-start gap-3">
                {visual && VerticalIcon ? (
                  <span
                    className={cn(
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
                      visual.chipClass,
                    )}
                  >
                    <VerticalIcon aria-hidden="true" className="h-5 w-5" />
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">{detail.name}</SheetTitle>
                  <SheetDescription className="truncate">
                    {VERTICAL_LABELS[detail.vertical]} ·{" "}
                    <span className="font-mono">{detail.slug}</span>
                  </SheetDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <TenantStatusBadge active={detail.active} />
                    {detail.suspendedReason && !detail.active ? (
                      <span className="text-xs text-rose-600">
                        Motivo: {detail.suspendedReason}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {detail.active ? (
                  <SuspendDialog
                    tenantId={detail.id}
                    tenantName={detail.name}
                    onSuspended={() => load(detail.id)}
                  />
                ) : (
                  <form action={activateAction}>
                    <input type="hidden" name="tenantId" value={detail.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={activatePending}
                    >
                      {activatePending ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <RotateCcw />
                      )}
                      Reactivar
                    </Button>
                  </form>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImpersonate}
                  disabled={impersonating || detail.users.length === 0}
                >
                  {impersonating ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <LogIn />
                  )}
                  Entrar como negocio
                </Button>
              </div>

              {impersonationError ? (
                <p className="mt-2 text-xs text-rose-600">
                  {impersonationError}
                </p>
              ) : null}
            </SheetHeader>

            <nav className="flex gap-1 border-b px-4" aria-label="Secciones">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition",
                    activeTab === tab.id
                      ? "border-amber-500 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="space-y-6 p-6">
              {activeTab === "resumen" ? (
                <ResumenTab detail={detail} />
              ) : null}
              {activeTab === "usuarios" ? <UsuariosTab detail={detail} /> : null}
              {activeTab === "modulos" ? (
                <ModulosTab
                  detail={detail}
                  action={moduleAction}
                  pending={modulePending}
                  message={
                    moduleState.status === "ok"
                      ? (moduleState.message ?? null)
                      : null
                  }
                />
              ) : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ResumenTab({ detail }: { detail: TenantDetail }) {
  const { metrics } = detail;
  const ecosystem = [
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: detail.whatsappNumber,
      href: detail.whatsappNumber
        ? `https://wa.me/${detail.whatsappNumber.replace(/[^0-9]/g, "")}`
        : null,
    },
    {
      icon: AtSign,
      label: "Instagram",
      value: detail.instagramHandle
        ? `@${detail.instagramHandle.replace(/^@/, "")}`
        : null,
      href: detail.instagramHandle
        ? `https://instagram.com/${detail.instagramHandle.replace(/^@/, "")}`
        : null,
    },
    {
      icon: Globe,
      label: "Sitio web",
      value: detail.websiteUrl,
      href: detail.websiteUrl,
    },
    {
      icon: MapPin,
      label: "Google Maps",
      value: detail.googleBusinessUrl,
      href: detail.googleBusinessUrl,
    },
  ];

  return (
    <>
      <section className="grid grid-cols-2 gap-3">
        <Stat label="Clientes" value={String(metrics.customersCount)} />
        <Stat
          label="Presupuestos"
          value={String(metrics.quotesCount)}
          hint={formatCurrency(metrics.quotesTotal)}
        />
        <Stat
          label="Pagos aprobados"
          value={formatCurrency(metrics.paymentsApprovedTotal)}
          hint={`${metrics.paymentsApprovedCount} de ${metrics.paymentsCount}`}
        />
        <Stat
          label="Membresías vigentes"
          value={String(metrics.membershipsActive)}
        />
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Identidad y ubicación
        </h3>
        <dl className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <InfoRow label="Ciudad" value={detail.city} />
          <InfoRow
            label="Dominio personalizado"
            value={detail.customDomain}
          />
          <InfoRow
            label="Métodos de pago"
            value={
              detail.paymentMethods.length > 0
                ? detail.paymentMethods
                    .map((method) => paymentMethodLabel(method))
                    .join(", ")
                : null
            }
          />
          <InfoRow
            label="Onboarding"
            value={
              detail.onboardingCompleted
                ? "Completo"
                : `Pendiente (${detail.onboardingProgress}%)`
            }
          />
          <InfoRow label="Creado" value={formatDateTime(detail.createdAtIso)} />
          <InfoRow
            label="Última actividad"
            value={detail.lastActivityLabel}
          />
        </dl>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ecosistema digital
        </h3>
        <ul className="mt-2 space-y-1.5">
          {ecosystem.map((row) => {
            const Icon = row.icon;
            return (
              <li
                key={row.label}
                className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm"
              >
                <Icon
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                />
                <span className="w-24 shrink-0 text-muted-foreground">
                  {row.label}
                </span>
                {row.value ? (
                  row.href ? (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate font-medium text-amber-700 hover:underline"
                    >
                      {row.value}
                    </a>
                  ) : (
                    <span className="min-w-0 truncate">{row.value}</span>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">Sin dato</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate">{value ?? "—"}</dd>
    </div>
  );
}

function UsuariosTab({ detail }: { detail: TenantDetail }) {
  if (detail.users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        El negocio todavía no tiene usuarios registrados.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {detail.users.map((user) => (
        <li key={user.id} className="flex items-center gap-3 py-3 first:pt-0">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase">
            {(user.name ?? user.email).slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {user.name ?? "Sin nombre"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </span>
          <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {user.roleLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ModulosTab({
  detail,
  action,
  pending,
  message,
}: {
  detail: TenantDetail;
  action: (formData: FormData) => void;
  pending: boolean;
  message: string | null;
}) {
  return (
    <>
      {message ? (
        <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          {message}
        </p>
      ) : null}
      <ul className="space-y-2">
        {detail.modules.map((module) => (
          <li
            key={module.moduleName}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {MODULE_LABELS[module.moduleName]}
              </span>
              <span className="block text-xs text-muted-foreground">
                {module.active ? "Activo en este negocio" : "Desactivado"}
              </span>
            </span>
            <form action={action} className="shrink-0">
              <input type="hidden" name="tenantId" value={detail.id} />
              <input
                type="hidden"
                name="moduleName"
                value={module.moduleName}
              />
              <input
                type="hidden"
                name="active"
                value={module.active ? "false" : "true"}
              />
              <Button
                type="submit"
                variant={module.active ? "outline" : "secondary"}
                size="sm"
                disabled={pending}
              >
                {pending ? <Loader2 className="animate-spin" /> : <Power />}
                {module.active ? "Desactivar" : "Activar"}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
