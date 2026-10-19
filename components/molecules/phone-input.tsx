"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { inputClasses } from "@/components/atoms/input";
import { joinPhone, searchCountries, splitPhone, type Country } from "@/lib/business/countries";
import { cn } from "@/lib/utils";

/**
 * Teléfono con indicativo de país: Colombia primero, luego en orden
 * alfabético, con buscador por nombre o número. Entrega "+57 3001234567".
 */
export function PhoneInput({ id, value, onChange, name, placeholder = "300 123 4567", disabled }: { id?: string; value: string; onChange: (value: string) => void; name?: string; placeholder?: string; disabled?: boolean }) {
  const initial = splitPhone(value);
  const [country, setCountry] = useState<Country>(initial.country);
  const [number, setNumber] = useState(initial.number);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const list = searchCountries(q);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setQ("");
    onChange(joinPhone(c, number));
  };

  return (
    <div ref={box} className="relative flex">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Indicativo: ${country.name} +${country.dial}`}
        onClick={() => setOpen(!open)}
        className={cn(inputClasses, "flex w-auto shrink-0 items-center gap-1 rounded-r-none border-r-0 px-2.5 font-mono text-[13px]")}
      >
        <span aria-hidden="true">{country.flag}</span>+{country.dial}
        <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
      </button>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        value={number}
        placeholder={placeholder}
        onChange={(e) => {
          const n = e.target.value.replace(/[^\d\s]/g, "");
          setNumber(n);
          onChange(joinPhone(country, n));
        }}
        className={cn(inputClasses, "min-w-0 rounded-l-none font-mono tabular-nums")}
      />
      {name ? <input type="hidden" name={name} value={joinPhone(country, number)} /> : null}
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          <label className="flex items-center gap-2 border-b border-border px-2.5">
            <Search aria-hidden="true" className="size-4 text-muted-foreground" />
            <input autoFocus aria-label="Buscar país" value={q} onChange={(e) => setQ(e.target.value)} placeholder="País o indicativo" className="h-9 min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
          </label>
          <ul role="listbox" aria-label="Países" className="max-h-64 overflow-y-auto py-1">
            {list.map((c) => (
              <li key={c.iso}>
                <button type="button" role="option" aria-selected={c.iso === country.iso} onClick={() => pick(c)} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-surface-muted", c.iso === country.iso && "bg-surface-muted font-medium")}>
                  <span aria-hidden="true">{c.flag}</span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">+{c.dial}</span>
                </button>
              </li>
            ))}
            {list.length === 0 ? <li className="px-3 py-2 text-[13px] text-muted-foreground">Sin resultados.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

