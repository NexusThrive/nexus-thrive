"use client";

import type { ReactNode } from "react";
import { useRememberedEmpty } from "@/components/molecules/empty-page-frame";

/** Elige la precarga: la del estado vacío si la vista de esta ruta estaba vacía la última vez; si no, la de siempre. */
export function SkeletonEmptySwitch({ normal, empty }: { normal: ReactNode; empty: ReactNode }) {
  return <>{useRememberedEmpty() ? empty : normal}</>;
}
