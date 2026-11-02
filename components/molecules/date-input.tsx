"use client";

import { useId, useState, type ComponentProps } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/molecules/popover";
import { addMonths, dayNumber, monthGrid, monthLabel, sameMonth } from "@/lib/foundation/dates/calendar";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", month: "short" }).format(new Date(Date.UTC(2026, i, 15))).replace(".", ""));
const shown = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/** Hoy en Bogotá como «AAAA-MM-DD». */
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

/** Lo mínimo de un evento de cambio: lo que los formularios ya leen (`event.target.value`). */
export type DateChange = { target: { name: string; value: string } };

type DateInputProps = Omit<ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "placeholder"> & {
  /** «AAAA-MM-DD» (vacío = sin fecha). */
  value?: string;
  defaultValue?: string;
  onChange?: (event: DateChange) => void;
  placeholder?: string;
};

/**
 * Selector de fecha de NEXUS en lugar del campo de fecha nativo del navegador: un botón con el aspecto del campo que
 * abre un calendario del mes (en español, lunes primero, hoy con borde oro). Se usa dentro de `Field` igual que un
 * input: recibe `id` y `aria-*`, y manda su valor `AAAA-MM-DD` en el formulario (`name`) y en `onChange`
 * (`event.target.value`). `min` y `max` desactivan los días fuera de rango; sin `required` se puede borrar.
 */
export function DateInput({ value, defaultValue = "", onChange, name = "", min, max, required, disabled, placeholder = "Elegir fecha", className, id, ...rest }: DateInputProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const today = todayKey();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(current || today);
  // Días → (título) → meses → (año) → años: saltar de año sin retroceder de uno en uno.
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const gridId = useId();
  const minDay = typeof min === "string" ? min : undefined;
  const maxDay = typeof max === "string" ? max : undefined;

  function pick(day: string) {
    setInner(day);
    onChange?.({ target: { name, value: day } });
    setOpen(false);
  }
  const viewYear = Number(view.slice(0, 4));
  const viewMonth = Number(view.slice(5, 7));
  const yearStart = viewYear - (viewYear % 12);
  const pad = (n: number) => String(n).padStart(2, "0");
  function shift(direction: -1 | 1) {
    if (mode === "days") setView(addMonths(view, direction));
    else if (mode === "months") setView(`${viewYear + direction}-${pad(viewMonth)}-01`);
    else setView(`${viewYear + direction * 12}-${pad(viewMonth)}-01`);
  }
  const chooseMonth = (month: number) => {
    setView(`${viewYear}-${pad(month + 1)}-01`);
    setMode("days");
  };
  const chooseYear = (year: number) => {
    setView(`${year}-${pad(viewMonth)}-01`);
    setMode("months");
  };
  const outOfRange = (day: string) => Boolean((minDay && day < minDay) || (maxDay && day > maxDay));

  return (
    <div className="relative min-w-0">
      {/* Valor para el formulario y la validación de «obligatorio» (el botón no es un campo). */}
      <input type="text" name={name || undefined} value={current} required={required} readOnly tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-0" />
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setView(current || today);
            setMode("days");
          }
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-haspopup="dialog"
            {...(rest as ComponentProps<"button">)}
            className={cn(inputClasses, "flex w-full items-center justify-between gap-2 text-left", !current && "text-muted-foreground", className)}
          >
            <span className="truncate">{current ? shown.format(new Date(`${current}T12:00:00Z`)) : placeholder}</span>
            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(300px,calc(100vw-24px))] p-3">
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              id={`${gridId}-title`}
              aria-live="polite"
              aria-label={mode === "days" ? `${monthLabel(view)}. Elegir mes y año` : mode === "months" ? `${viewYear}. Elegir año` : `${yearStart} a ${yearStart + 11}`}
              disabled={mode === "years"}
              onClick={() => setMode(mode === "days" ? "months" : "years")}
              className="group inline-flex min-h-9 items-center gap-1 rounded-md border border-transparent px-2 font-display text-[15px] font-semibold transition-colors enabled:cursor-pointer enabled:hover:border-border enabled:hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring pointer-coarse:min-h-11"
            >
              {mode === "days" ? monthLabel(view) : mode === "months" ? viewYear : `${yearStart} – ${yearStart + 11}`}
              {mode !== "years" ? <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-foreground" /> : null}
            </button>
            <div className="flex gap-1">
              <button type="button" aria-label={mode === "days" ? "Mes anterior" : mode === "months" ? "Año anterior" : "Años anteriores"} onClick={() => shift(-1)} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <button type="button" aria-label={mode === "days" ? "Mes siguiente" : mode === "months" ? "Año siguiente" : "Años siguientes"} onClick={() => shift(1)} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
          {mode === "days" ? (
            <div role="grid" aria-labelledby={`${gridId}-title`} className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} aria-hidden="true" className="h-7 text-2xs font-medium leading-7 text-muted-foreground">{d}</span>
              ))}
              {monthGrid(view).map((day) => {
                const selected = day === current;
                const off = outOfRange(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={off}
                    aria-pressed={selected}
                    aria-label={shown.format(new Date(`${day}T12:00:00Z`))}
                    onClick={() => pick(day)}
                    className={cn(
                      "relative grid aspect-square min-h-9 place-items-center rounded-sm text-ui tabular-nums transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-30 pointer-coarse:min-h-11",
                      selected ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted",
                      !sameMonth(day, view) && !selected && "text-muted-foreground opacity-45",
                      day === today && !selected && "shadow-[inset_0_0_0_1px_var(--nx-gold-600)]",
                    )}
                  >
                    {dayNumber(day)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {(mode === "months" ? MONTHS.map((label, i) => ({ label, value: i, active: i === viewMonth - 1 && viewYear === Number(current.slice(0, 4)) })) : Array.from({ length: 12 }, (_, i) => ({ label: String(yearStart + i), value: yearStart + i, active: yearStart + i === viewYear }))).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={item.active}
                  onClick={() => (mode === "months" ? chooseMonth(item.value) : chooseYear(item.value))}
                  className={cn(
                    "min-h-11 rounded-sm text-ui capitalize tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                    item.active ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button type="button" disabled={outOfRange(today)} onClick={() => pick(today)} className={buttonVariants({ variant: "ghost", size: "sm" })}>Hoy</button>
            {!required && current ? (
              <button type="button" onClick={() => pick("")} className={buttonVariants({ variant: "ghost", size: "sm" })}>Borrar</button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
