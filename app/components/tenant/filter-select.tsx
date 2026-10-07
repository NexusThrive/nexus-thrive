"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

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
}: {
  paramKey: string;
  pageParam: string;
  allLabel: string;
  options: readonly { value: string; label: string }[];
  value: string;
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
    <span className="relative inline-flex">
      <select
        aria-label={allLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isPending}
        className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pr-8 pl-3 text-sm text-slate-700 transition hover:border-slate-300 focus:border-indigo-400 focus:outline-2 focus:outline-indigo-500/30 disabled:opacity-60 sm:w-auto"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        {isPending ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-slate-400" />
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 text-slate-400"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </span>
  );
}
