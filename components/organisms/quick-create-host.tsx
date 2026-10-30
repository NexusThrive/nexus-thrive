"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { loadQuickCreateDataAction, type QuickCreateData } from "@/app/[tenant]/(app)/_actions/quick-create";
import CustomerSheet from "@/app/[tenant]/(app)/crm/_components/customer-sheet";
import { ConnectedExpenseSheet, ConnectedPaymentSheet } from "@/app/[tenant]/(app)/finance/_components/finance-sheets";
import { SkeletonRows } from "@/components/molecules/skeleton-rows";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { useShell } from "@/components/providers/shell-context";
import { quickSheetFor, type QuickSheet } from "@/lib/navigation/quick-create";

type QuickCreateContextValue = {
  /** Abre el mini-modal de esa acción de «Crear» y devuelve `true`; sin mini-modal devuelve `false` (quien llama navega). */
  open: (key: string) => boolean;
};

export const QuickCreateContext = createContext<QuickCreateContextValue>({ open: () => false });

/** Para abrir un mini-modal desde «Crear», «Acciones rápidas» o la paleta. Fuera de un negocio no hace nada. */
export const useQuickCreate = () => useContext(QuickCreateContext);

/** Los datos del cobro y del gasto se reutilizan 60 s; al abrir se refrescan por detrás. */
const FRESH_MS = 60_000;

/**
 * Mini-modales de creación: pago, gasto y socio nuevo se registran **sin salir de
 * la pantalla en la que se está**; cada uno lleva «Abrir en el panel completo»
 * a su sección. Los datos (clientes, caja abierta) se piden una vez en reposo y
 * se refrescan al abrir, así la hoja sale al instante. Al cambiar de ruta se
 * cierran. Una acción sin mini-modal sigue navegando (`quickSheetFor`).
 */
export function QuickCreateProvider({ children }: { children: ReactNode }) {
  const { hrefFor, activeModules } = useShell();
  const slug = hrefFor("").slice(1);
  const pathname = usePathname();
  const [sheet, setSheet] = useState<QuickSheet | null>(null);
  const [data, setData] = useState<QuickCreateData | null>(null);
  const fetchedAt = useRef(0);
  const inflight = useRef(false);
  const withFinance = Boolean(activeModules?.includes("finance"));

  const load = useCallback(
    async (force = false) => {
      if (inflight.current || (!force && Date.now() - fetchedAt.current < FRESH_MS)) return;
      inflight.current = true;
      try {
        const next = await loadQuickCreateDataAction(slug);
        if (next) {
          setData(next);
          fetchedAt.current = Date.now();
        }
      } catch {
        // sin red: se reintenta al abrir
      } finally {
        inflight.current = false;
      }
    },
    [slug],
  );

  // En reposo, sin competir con la carga de la pantalla: así el cobro y el gasto abren con sus datos listos.
  useEffect(() => {
    if (!withFinance) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(() => void load()) : window.setTimeout(() => void load(), 1500);
    return () => {
      if (!idle) window.clearTimeout(id);
    };
  }, [withFinance, load]);

  // Navegar (p. ej. «Abrir en el panel completo») cierra el mini-modal.
  useEffect(() => {
    setSheet(null); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]);

  const open = useCallback(
    (key: string) => {
      const next = quickSheetFor(key);
      if (!next) return false;
      setSheet(next);
      if (next !== "customer") void load(true);
      return true;
    },
    [load],
  );
  const close = useCallback(() => setSheet(null), []);
  const value = useMemo(() => ({ open }), [open]);

  const onOpenChange = (next: boolean) => !next && close();

  return (
    <QuickCreateContext.Provider value={value}>
      {children}

      {sheet === "payment" ? (
        <ConnectedPaymentSheet
          tenantSlug={slug}
          open
          onOpenChange={onOpenChange}
          fullHref={hrefFor("/finance?nuevo=pago")}
          business={data?.business ?? { name: "" }}
          customers={data?.customers ?? []}
        />
      ) : null}

      {sheet === "expense" ? (
        data ? (
          <ConnectedExpenseSheet tenantSlug={slug} open onOpenChange={onOpenChange} fullHref={hrefFor("/finance?nuevo=gasto")} cashOpen={data.cashOpen} />
        ) : (
          // El gasto decide «de dónde sale» al montarse: se espera a tener la caja (casi nunca se ve, ya se pidió en reposo).
          <ResponsiveSheet open onOpenChange={onOpenChange} title="Registrar gasto" description="Se descuenta de la caja menor." unsavedGuard={false}>
            <SkeletonRows rows={5} variant="form" label="Cargando el formulario del gasto" />
          </ResponsiveSheet>
        )
      ) : null}

      {sheet === "customer" ? (
        <CustomerSheet
          tenantSlug={slug}
          onClose={close}
          fullHref={hrefFor("/crm")}
        />
      ) : null}
    </QuickCreateContext.Provider>
  );
}
