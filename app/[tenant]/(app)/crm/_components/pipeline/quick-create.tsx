"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";
import { useToast } from "@/components/molecules/toast";
import { quickCreateAction, searchContactsAction } from "@/app/[tenant]/(app)/crm/pipeline-actions";
import type { PickerCustomer } from "@/lib/business/growth/pipeline-read";
import { initialsOf, validateQuick, type ActivityKind } from "@/lib/business/growth/pipeline";
import { cn } from "@/lib/utils";
import { StarsInput } from "./pipeline-ui";

const field =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-background px-2.5 text-ui text-foreground outline-none placeholder:text-muted-foreground focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_15%,transparent)] aria-[invalid=true]:border-danger";

type Contact = { kind: "existing"; customer: PickerCustomer } | { kind: "new"; name: string } | null;

/** Resalta en dorado la parte del nombre que coincide con lo escrito. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLocaleLowerCase("es").indexOf(query.toLocaleLowerCase("es")) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b className="font-semibold text-accent-text">{text.slice(i, i + query.length)}</b>
      {text.slice(i + query.length)}
    </>
  );
}

/**
 * Creación rápida (tarjeta al inicio de la columna Nuevo). El contacto busca clientes que ya existen: elegir uno llena el correo y el
 * teléfono y liga la oportunidad a él; «Crear …» lo crea al añadir (sin duplicar: se busca antes por teléfono o correo). Solo el
 * nombre es obligatorio. Enter añade y cierra, Mayús+Enter añade y deja el formulario para la siguiente, Esc cancela.
 */
export function QuickCreate({ slug, stageId, preset = null, onClose }: { slug: string; stageId: string; preset?: PickerCustomer | null; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const listId = useId();
  const [query, setQuery] = useState(preset?.name ?? "");
  const [results, setResults] = useState<PickerCustomer[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [contact, setContact] = useState<Contact>(preset ? { kind: "existing", customer: preset } : null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(preset?.email ?? "");
  const [phone, setPhone] = useState(preset?.phone ?? "");
  const [value, setValue] = useState("");
  const [priority, setPriority] = useState(0);
  const [activity, setActivity] = useState<ActivityKind | "NONE">("CALL");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const contactRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    // Con el cliente ya elegido (desde su ficha) se empieza por el nombre de la oportunidad.
    (preset ? nameRef.current : contactRef.current)?.focus();
  }, [preset]);

  const search = (text: string) => {
    setQuery(text);
    setContact(text.trim() ? { kind: "new", name: text.trim() } : null);
    setOpen(Boolean(text.trim()));
    setActive(0);
    const n = ++seq.current;
    if (!text.trim()) return setResults([]);
    void searchContactsAction(slug, text).then((rows) => {
      if (n === seq.current) setResults(rows);
    });
  };

  const options = [...results.map((c) => ({ kind: "existing" as const, customer: c })), ...(query.trim() ? [{ kind: "new" as const, name: query.trim() }] : [])];
  const choose = (opt: (typeof options)[number]) => {
    setContact(opt);
    setOpen(false);
    if (opt.kind === "existing") {
      setQuery(opt.customer.name);
      setEmail(opt.customer.email ?? "");
      setPhone(opt.customer.phone ?? "");
    }
    nameRef.current?.focus();
  };

  const reset = () => {
    setQuery("");
    setResults([]);
    setContact(null);
    setName("");
    setEmail("");
    setPhone("");
    setValue("");
    setPriority(0);
    setActivity("CALL");
    setErrors({});
    contactRef.current?.focus();
  };

  const submit = (mode: "close" | "again" | "more") => {
    const found = validateQuick({ name, value, email, phone });
    if (Object.keys(found).length) {
      setErrors(found as Record<string, string>);
      (found.name ? nameRef.current : boxRef.current?.querySelector<HTMLElement>("[aria-invalid=true]"))?.focus();
      return;
    }
    start(async () => {
      const r = await quickCreateAction(slug, {
        stageId,
        name,
        customerId: contact?.kind === "existing" ? contact.customer.id : null,
        newCustomerName: contact?.kind === "new" ? contact.name : null,
        email,
        phone,
        value,
        priority,
        activity,
      });
      if (!r.ok) {
        toast(r.message, "error");
        return;
      }
      toast(r.message ?? "Oportunidad creada", "success");
      if (mode === "more") return router.push(`/${slug}/crm/oportunidades/${r.id}`);
      router.refresh();
      if (mode === "again") reset();
      else onClose();
    });
  };

  return (
    <div
      ref={boxRef}
      role="form"
      aria-label="Nueva oportunidad"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !open) {
          e.preventDefault();
          onClose();
        }
      }}
      className="flex flex-col gap-2.5 rounded-xl border border-accent bg-card p-3.5 shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_12%,transparent)]"
    >
      {/* Contacto: busca o crea */}
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={contactRef}
          role="combobox"
          aria-label="Contacto"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          value={query}
          placeholder="Contacto · busca o crea uno nuevo"
          onChange={(e) => search(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(options.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && options[active]) {
              e.preventDefault();
              choose(options[active]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          className={cn(field, "px-8", open && "border-accent")}
        />
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        {open && options.length ? (
          <ul id={listId} role="listbox" aria-label="Clientes" className="absolute inset-x-0 top-[42px] z-(--z-raised) rounded-[10px] border border-border-strong bg-popover p-1.5 shadow-[var(--nx-shadow-overlay)]">
            {results.length ? <li role="presentation" className="px-2 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-[0.09em] text-muted-foreground">Clientes</li> : null}
            {options.map((opt, i) =>
              opt.kind === "existing" ? (
                <li
                  key={opt.customer.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(opt)}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5", i === active && "bg-surface-muted")}
                >
                  <span aria-hidden="true" className={cn("grid size-[26px] shrink-0 place-items-center rounded-md text-2xs font-semibold", i === 0 ? "bg-accent-subtle text-accent-text" : "bg-surface-muted text-foreground")}>
                    {initialsOf(opt.customer.name)}
                  </span>
                  <span className="grid min-w-0">
                    <span className="truncate text-ui text-foreground">
                      <Highlight text={opt.customer.name} query={query.trim()} />
                    </span>
                    <span className="truncate text-2xs text-muted-foreground">
                      {opt.customer.kind === "COMPANY" && !opt.customer.phone && !opt.customer.email
                        ? `Empresa${opt.customer.document ? ` · NIT ${opt.customer.document}` : ""}`
                        : [opt.customer.phone, opt.customer.email].filter(Boolean).join(" · ") || "Sin teléfono ni correo"}
                    </span>
                  </span>
                </li>
              ) : (
                <li key="new" role="presentation" className="contents">
                  {results.length ? <span aria-hidden="true" className="mx-0.5 my-1.5 block h-px bg-border" /> : null}
                  <span
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(opt)}
                    onMouseEnter={() => setActive(i)}
                    className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-ui font-medium text-accent-text", i === active && "bg-surface-muted")}
                  >
                    <span aria-hidden="true" className="grid size-[26px] shrink-0 place-items-center rounded-md border border-dashed border-accent/50">
                      +
                    </span>
                    Crear «{opt.name}» como cliente nuevo
                  </span>
                </li>
              ),
            )}
          </ul>
        ) : null}
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit("close");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.shiftKey && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            submit("again");
          }
        }}
        className="contents"
      >
        <input
          ref={nameRef}
          aria-label="Nombre de la oportunidad"
          aria-required="true"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${listId}-err` : undefined}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((x) => ({ ...x, name: "" }));
          }}
          placeholder="Nombre de la oportunidad *"
          className={cn(field, "h-10 text-sm font-medium")}
        />
        {errors.name ? (
          <p id={`${listId}-err`} role="alert" className="-mt-1 text-xs text-danger">
            {errors.name}
          </p>
        ) : null}
        <div className="flex gap-2">
          <input type="email" aria-label="Correo" aria-invalid={errors.email ? true : undefined} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className={field} />
          <input type="tel" aria-label="Teléfono" aria-invalid={errors.phone ? true : undefined} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 Teléfono" className={field} />
        </div>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" aria-label="Valor estimado" aria-invalid={errors.value ? true : undefined} value={value} onChange={(e) => setValue(e.target.value)} placeholder="$ 0 · Valor estimado" className={field} />
          <StarsInput value={priority} onChange={setPriority} />
        </div>
        <Select aria-label="Próxima actividad" value={activity} onChange={(e) => setActivity(e.target.value as ActivityKind | "NONE")} className="h-9 text-ui">
          <option value="CALL">Próxima actividad: Llamar</option>
          <option value="MEETING">Reunión</option>
          <option value="PROPOSAL">Enviar propuesta</option>
          <option value="NONE">Sin actividad</option>
        </Select>
        <div className="flex items-center gap-2 pt-0.5">
          <button type="submit" disabled={pending} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px] font-semibold" })}>
            {pending ? "Añadiendo…" : "Añadir"}
          </button>
          <button type="button" disabled={pending} onClick={() => submit("more")} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border bg-transparent")}>
            Más opciones
          </button>
          <button type="button" aria-label="Cancelar" onClick={onClose} className="ms-auto grid size-[34px] place-items-center rounded-lg border border-border text-foreground outline-none hover:border-accent focus-visible:outline-2 focus-visible:outline-ring">
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </form>
      <p className="text-2xs text-muted-foreground">Enter para añadir · Esc para cancelar</p>
    </div>
  );
}
