"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { inputClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

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
    <div className="relative w-full min-w-[200px] sm:max-w-xs sm:flex-1">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={cn(inputClasses, "h-11 rounded-full pl-[42px] pr-10 [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
        {isPending ? (
          <NLoader size={16} className="text-current" />
        ) : value ? (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setValue("")}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </span>
    </div>
  );
}
