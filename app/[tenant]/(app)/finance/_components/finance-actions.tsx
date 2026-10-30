"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banknote, Camera, MinusCircle } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";
import { ConnectedExpenseSheet, ConnectedPaymentSheet, type CustomerOption } from "./finance-sheets";
import { ScanPaymentSheet } from "./scan-payment-sheet";

export type { CustomerOption };

type Open = "pago" | "gasto" | "escaneo" | null;

/**
 * Registrar pago (teclado + recibo impreso), registrar gasto (chips de
 * categoría) y escanear pago (foto del comprobante con lectura OCR/QR
 * best-effort). Los botones van dentro de la tarjeta de balance
 * (`tone="dark"`) o sobre fondo claro. `?nuevo=pago|gasto` y `?scan=1` abren
 * la hoja al llegar (acciones rápidas del inicio y del botón Crear). Las
 * escrituras son las Server Actions de siempre: validan, guardan y
 * revalidan Finanzas e Inicio.
 */
export default function FinanceActions({
  tenantSlug,
  business,
  customers,
  initial = null,
  initialCustomerId = "",
  tone = "dark",
  cashOpen = false,
}: {
  tenantSlug: string;
  business: { name: string; subtitle?: string };
  customers: CustomerOption[];
  initial?: Open;
  /** Cliente preseleccionado en el cobro (?cliente=, desde la ficha o la lista). */
  initialCustomerId?: string;
  tone?: "dark" | "light";
  /** Hay un turno de caja abierto: el gasto sale de caja por defecto. */
  cashOpen?: boolean;
}) {
  const [open, setOpen] = useState<Open>(initial);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setSheet = (next: Open) => {
    setOpen(next);
    // Quita ?nuevo=/?scan= al cerrar para que recargar no la vuelva a abrir.
    if (!next && (searchParams.has("nuevo") || searchParams.has("cliente") || searchParams.has("scan"))) {
      const params = new URLSearchParams(searchParams);
      params.delete("nuevo");
      params.delete("cliente");
      params.delete("scan");
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setSheet("pago")}
        className={cn(buttonVariants({ variant: "accent" }), "w-full sm:w-auto", tone === "light" && "sm:order-2")}
        data-mag=""
      >
        <Banknote aria-hidden="true" className="size-4" />
        Registrar pago
      </button>
      <button
        type="button"
        onClick={() => setSheet("escaneo")}
        className={cn(buttonVariants({ variant: "outline" }), "w-full sm:order-1 sm:w-auto")}
      >
        <Camera aria-hidden="true" className="size-4" />
        Escanear pago
      </button>
      <button
        type="button"
        onClick={() => setSheet("gasto")}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full sm:w-auto",
          tone === "dark" && "border-[#3A3A40] text-[#F7F6F3] hover:border-[#55555c] hover:bg-[#1E1E21]",
        )}
      >
        <MinusCircle aria-hidden="true" className="size-4" />
        Registrar gasto
      </button>

      <ScanPaymentSheet
        open={open === "escaneo"}
        onOpenChange={(next) => setSheet(next ? "escaneo" : null)}
        tenantSlug={tenantSlug}
        business={business}
        customers={customers.map((c) => ({ id: c.id, name: c.name, hint: c.email || undefined, phone: c.phone }))}
        defaultCustomerId={customers.some((c) => c.id === initialCustomerId) ? initialCustomerId : ""}
      />

      <ConnectedPaymentSheet
        tenantSlug={tenantSlug}
        open={open === "pago"}
        onOpenChange={(next) => setSheet(next ? "pago" : null)}
        business={business}
        customers={customers}
        defaultCustomerId={initialCustomerId}
      />

      <ConnectedExpenseSheet
        tenantSlug={tenantSlug}
        open={open === "gasto"}
        onOpenChange={(next) => setSheet(next ? "gasto" : null)}
        cashOpen={cashOpen}
      />
    </>
  );
}
