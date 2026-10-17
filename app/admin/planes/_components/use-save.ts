"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/molecules/toast";
import type { CatalogResult } from "../actions";

/** Guarda con una acción del catálogo, avisa y refresca la página. */
export function useSave() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const save = (fn: () => Promise<CatalogResult>, done: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast(done, "success");
        after?.();
        router.refresh();
      } else toast({ title: "No se guardó", description: r.message, variant: "error" });
    });
  return { save, pending };
}
