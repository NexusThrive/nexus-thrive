"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";

const DEBOUNCE_MS = 250;

/**
 * Buscador "en tiempo real" que mantiene la URL como fuente de verdad.
 * `paramKey` es el parámetro de texto de la sección (`pq`, `gq`, `q`) y
 * `pageParam` el de su paginación: cada búsqueda vuelve a la primera
 * página de su sección sin tocar los demás filtros.
 */
export default function SearchInput({
  paramKey,
  pageParam,
  ariaLabel,
  placeholder,
  defaultValue,
}: {
  paramKey: string;
  pageParam: string;
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
      params.delete(pageParam);
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
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-card pr-9 pl-9 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-ring/40 focus:border-ring focus:outline-2 focus:outline-ring/30"
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
        {isPending ? (
          <NLoader size={16} className="text-current" />
        ) : value ? (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setValue("")}
            className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </span>
    </div>
  );
}
