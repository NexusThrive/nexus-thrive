"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./input";

type Opt = { value: string; label: string; disabled: boolean; group?: string };

/** Aplana `<option>`, `<optgroup>`, fragmentos y arreglos en una lista de opciones. */
function parseOptions(children: React.ReactNode, group?: string, out: Opt[] = []): Opt[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { value?: unknown; label?: string; disabled?: boolean; children?: React.ReactNode };
    if (child.type === "option") {
      const text = React.Children.toArray(props.children).join("");
      out.push({ value: props.value === undefined ? text : String(props.value), label: props.label ?? text, disabled: !!props.disabled, group });
    } else if (child.type === "optgroup") {
      parseOptions(props.children, props.label, out);
    } else if (props.children) {
      parseOptions(props.children, group, out); // Fragment u otro envoltorio
    }
  });
  return out;
}

/**
 * Select propio NEXUS: botón con la forma de un campo y una lista flotante
 * dibujada con divs (no el menú nativo del sistema). Misma API que `<select>`:
 * acepta `<option>`/`<optgroup>` como hijos, `value`/`defaultValue`, `name`,
 * `required`, `disabled`, `onChange(e)` con `e.target.value`, y participa en
 * formularios (incluidas las Server Actions) porque debajo vive un `<select>`
 * real oculto que es el que se envía y se valida.
 *
 * Teclado (patrón combobox de WAI-ARIA): ↑ ↓ ← → abren y mueven, Inicio/Fin,
 * letras para saltar a una opción, Enter o Espacio eligen, Esc cierra, Tab
 * cierra sin cambiar. La lista es `role="listbox"`; el foco se queda en el
 * botón (`aria-activedescendant`). Etiqueta con `<label htmlFor>` o `Field`.
 *
 * Táctil: opciones de 44 px. Sin hover para nada importante.
 */
function Select({
  className,
  children,
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  required,
  form,
  placeholder,
  autoFocus,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ref: _ref,
  ...rest
}: React.ComponentProps<"select"> & { placeholder?: string }) {
  void _ref;
  void rest;
  const options = React.useMemo(() => parseOptions(children), [children]);
  const nativeRef = React.useRef<HTMLSelectElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const uid = React.useId();
  const listId = `${uid}-list`;
  const controlled = value !== undefined;
  const firstValue = options.find((o) => !o.disabled)?.value ?? "";
  const [inner, setInner] = React.useState<string>(() => String(defaultValue ?? firstValue));
  const current = controlled ? String(value) : inner;
  const selected = options.find((o) => o.value === current);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const typed = React.useRef({ text: "", timer: 0 });

  const enabledIndexes = options.flatMap((o, i) => (o.disabled ? [] : [i]));

  function commit(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    setOpen(false);
    if (option.value === current) return;
    if (!controlled) setInner(option.value);
    // Se dispara un `change` real en el <select> oculto: el onChange del
    // padre, el formulario y la validación lo ven como en un select nativo.
    const native = nativeRef.current;
    if (native) {
      native.value = option.value;
      native.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function openList() {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === current && !o.disabled);
    setActive(i >= 0 ? i : (enabledIndexes[0] ?? -1));
    setOpen(true);
  }

  function move(to: "next" | "prev" | "first" | "last") {
    if (enabledIndexes.length === 0) return;
    const pos = enabledIndexes.indexOf(active);
    const next =
      to === "first" ? 0 : to === "last" ? enabledIndexes.length - 1 : to === "next" ? Math.min(enabledIndexes.length - 1, pos + 1) : Math.max(0, pos < 0 ? 0 : pos - 1);
    setActive(enabledIndexes[next]);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const { key } = event;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Enter", " "].includes(key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (key === "ArrowDown" || key === "ArrowRight") { event.preventDefault(); move("next"); }
    else if (key === "ArrowUp" || key === "ArrowLeft") { event.preventDefault(); move("prev"); }
    else if (key === "Home") { event.preventDefault(); move("first"); }
    else if (key === "End") { event.preventDefault(); move("last"); }
    else if (key === "Enter" || key === " ") { event.preventDefault(); commit(active); }
    else if (key === "Tab") setOpen(false);
    else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Escribir salta a la opción que empieza con esas letras.
      window.clearTimeout(typed.current.timer);
      typed.current.text += key.toLowerCase();
      typed.current.timer = window.setTimeout(() => (typed.current.text = ""), 600);
      const hit = enabledIndexes.find((i) => options[i].label.toLowerCase().startsWith(typed.current.text));
      if (hit !== undefined) setActive(hit);
    }
  }

  // La opción activa siempre a la vista al navegar con teclado.
  React.useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const groups: (string | undefined)[] = [];
  options.forEach((o) => { if (!groups.includes(o.group)) groups.push(o.group); });

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => (next ? openList() : setOpen(false))}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 ? `${uid}-opt-${active}` : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-invalid={ariaInvalid}
          aria-required={required || undefined}
          disabled={disabled}
          autoFocus={autoFocus}
          data-slot="select"
          data-placeholder={selected ? undefined : ""}
          onKeyDown={onKeyDown}
          className={cn(
            fieldClasses,
            "group flex h-[var(--control-h)] cursor-pointer items-center gap-2 text-left data-[state=open]:border-ring data-[state=open]:shadow-[0_0_0_3px_rgba(212,175,55,0.18)] data-[placeholder]:text-muted-foreground",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder ?? " "}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverPrimitive.Trigger>

      {/* El <select> real: lo que se envía y valida; fuera del orden de tabulación y de los lectores. */}
      <select
        ref={nativeRef}
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        form={form}
        required={required}
        disabled={disabled}
        {...(controlled ? { value, onChange } : { defaultValue, onChange })}
        className="pointer-events-none absolute size-px opacity-0"
      >
        {children}
      </select>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          role="presentation" /* Radix lo pone como role=dialog; aquí el rol útil es el del listbox interior */
          align="start"
          sideOffset={6}
          collisionPadding={12}
          // El foco se queda en el botón: la lista se maneja con aria-activedescendant.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          // Dentro de un diálogo modal el <body> queda con pointer-events:none; la lista flota fuera y debe seguir recibiendo clics.
          style={{ pointerEvents: "auto" }}
          className="nx-select-list z-(--z-popover) w-[max(var(--radix-popover-trigger-width),180px)] max-w-[calc(100vw-24px)] origin-(--radix-popover-content-transform-origin) rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-(--shadow-popover) outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-(--motion-popover)"
        >
          <div ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} className="max-h-[min(280px,var(--radix-popover-content-available-height))] overflow-y-auto">
            {groups.map((group) => (
              <div key={group ?? "_"} role={group ? "group" : "presentation"} aria-label={group}>
                {group ? <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground" aria-hidden="true">{group}</div> : null}
                {options.map((option, index) =>
                  option.group !== group ? null : (
                    <div
                      key={`${option.value}-${index}`}
                      id={`${uid}-opt-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={option.value === current}
                      aria-disabled={option.disabled || undefined}
                      data-active={index === active ? "" : undefined}
                      onPointerMove={() => !option.disabled && setActive(index)}
                      onClick={() => commit(index)}
                      className={cn(
                        "relative flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 outline-none md:min-h-9",
                        "data-[active]:bg-surface-muted data-[active]:before:absolute data-[active]:before:left-0 data-[active]:before:top-1/2 data-[active]:before:h-4 data-[active]:before:w-[3px] data-[active]:before:-translate-y-1/2 data-[active]:before:-skew-x-[24deg] data-[active]:before:bg-accent data-[active]:before:content-['']",
                        option.disabled && "cursor-not-allowed opacity-45",
                        option.value === current && "font-semibold",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {option.value === current ? <Check aria-hidden="true" className="size-4 shrink-0 text-accent-text" /> : null}
                    </div>
                  ),
                )}
              </div>
            ))}
            {options.length === 0 ? <div className="px-2.5 py-3 text-center text-muted-foreground">Sin opciones</div> : null}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { Select };
