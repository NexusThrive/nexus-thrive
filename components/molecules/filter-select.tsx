"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NLoader } from "@/components/atoms/n-loader";
import { cn } from "@/lib/utils";
import { Select } from "@/components/atoms/select";

/**
 * Select de filtro que mantiene la URL como única fuente de verdad.
 * `paramKey` identifica el parámetro de la sección (`pmethod`, `status`, …)
 * y `pageParam` el de su paginación (`ppage`, `page`, …): al cambiar el
 * filtro se resetea la página de esa sección.
 */
export default function FilterSelect({
  paramKey,
  pageParam,
  allLabel,
  options,
  value,
  fullWidth = false,
}: {
  paramKey: string;
  pageParam: string;
  allLabel: string;
  options: readonly { value: string; label: string }[];
  value: string;
  /** Ocupa todo el ancho de su celda (barras de filtros en rejilla). */
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set(paramKey, next);
    } else {
      params.delete(paramKey);
    }
    params.delete(pageParam);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <span className={cn("relative inline-flex", fullWidth && "w-full")}>
      <Select
        aria-label={allLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isPending}
        className={cn(fullWidth ? "w-full" : "w-full sm:w-auto", isPending && "pr-9")}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {isPending ? (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <NLoader size={14} className="text-current" />
        </span>
      ) : null}
    </span>
  );
}
