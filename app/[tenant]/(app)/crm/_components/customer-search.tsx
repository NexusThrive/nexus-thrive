"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import { useVerticalTerms } from "../../vertical-terms-context";

const DEBOUNCE_MS = 250;

/**
 * Buscador "en tiempo real": escribe → debounce 250 ms → actualiza `?q=` en
 * la URL → la página RSC relee `searchParams` y refresca. La URL es la única
 * fuente de verdad (back/forward y enlaces comparten el estado).
 */
export default function CustomerSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const terms = useVerticalTerms();

  const paramQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(paramQ);

  // Evita que un cambio externo de la URL pise lo que el usuario está
  // escribiendo en este mismo momento (solo sincroniza sin foco).
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(paramQ);
    }
  }, [paramQ]);

  // Debounce → reemplaza la URL sin recargar (scroll intacto).
  useEffect(() => {
    if (value === paramQ) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const next = value.trim();
      if (next) {
        params.set("q", next);
      } else {
        params.delete("q");
      }
      params.delete("page");
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
        aria-label={`Buscar ${terms.customers.toLowerCase()}`}
        placeholder="Buscar por nombre, correo o teléfono…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-card pr-9 pl-9 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-foreground/20 focus:border-gold-500 focus:outline-2 focus:outline-gold-600/30"
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
