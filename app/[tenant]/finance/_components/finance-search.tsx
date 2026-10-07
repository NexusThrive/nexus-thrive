"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

const DEBOUNCE_MS = 250;

/**
 * Buscador "en tiempo real" para Finanzas. Como la página tiene DOS
 * buscadores (pagos y gastos), el nombre del parámetro de URL se pasa por
 * prop (`paramKey`): `pq` para pagos, `gq` para gastos. Los filtros no se
 * pisan entre secciones.
 */
export default function FinanceSearch({
  paramKey,
  inputName,
  ariaLabel,
  placeholder,
  defaultValue,
}: {
  paramKey: string;
  inputName: string;
  ariaLabel: string;
  placeholder: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const paramValue = searchParams.get(paramKey) ?? "";
  const [value, setValue] = useState(defaultValue);

  // Re-sincroniza si la URL cambia por fuera (back/forward) pero sin patear
  // lo que el usuario está escribiendo en este momento.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(paramValue);
    }
  }, [paramValue]);

  useEffect(() => {
    if (value === paramValue) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const next = value.trim();
      if (next) {
        params.set(paramKey, next);
      } else {
        params.delete(paramKey);
      }
      // Volver a la primera página de esta sección.
      if (paramKey === "pq") {
        params.delete("ppage");
      } else {
        params.delete("gpage");
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <input
        ref={inputRef}
        name={inputName}
        type="text"
        role="searchbox"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-9 pl-9 text-sm text-slate-900 transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:outline-2 focus:outline-indigo-500/30"
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
        {isPending ? (
          <Loader2
            aria-hidden="true"
            className="h-4 w-4 animate-spin text-slate-400"
          />
        ) : value ? (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setValue("")}
            className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </span>
    </div>
  );
}