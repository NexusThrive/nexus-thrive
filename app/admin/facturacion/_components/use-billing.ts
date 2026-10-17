"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/molecules/toast";
import type { BillingResult } from "../actions";

/** Ejecuta una acción de facturación, avisa y refresca. */
export function useBilling() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const run = (fn: () => Promise<BillingResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast(r.message ?? "Listo", "success");
        after?.();
        router.refresh();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });
  return { run, pending };
}
