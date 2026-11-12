"use client";

import { parseMoney } from "@/lib/business/sales/money";
import { MoneyInput } from "@/components/molecules/money-input";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import { Select } from "@/components/atoms/select";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { quickCreateAction, searchContactsAction } from "@/app/[tenant]/(app)/crm/pipeline-actions";
import type { PickerCustomer } from "@/lib/business/growth/pipeline-read";
import { validateQuick, type ActivityKind } from "@/lib/business/growth/pipeline";
import { cn } from "@/lib/utils";
import { StarsInput } from "./pipeline-ui";

const field =
  "h-11 w-full min-w-0 rounded-2xl border border-border/60 bg-background px-4 text-ui text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-accent focus:shadow-focus";

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
 * Creación rápida (un modal: contacto, oportunidad y siguiente paso, con etiquetas visibles). El contacto busca clientes que ya existen: elegir uno llena el correo y el
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

  const formId = `${listId}-form`;
  const label = "text-xs font-medium text-muted-foreground";
  return (
    <ResponsiveSheet
      open
      onOpenChange={(next) => !next && onClose()}
      title="Nueva oportunidad"
      description="Anota a quién le vendes, cuánto vale y el siguiente paso."
      size="md"
      initialFocus="field"
      footer={
        <>
          <button type="button" disabled={pending} onClick={() => submit("more")} className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full border-border/60 bg-transparent px-5")}>
            Más opciones
          </button>
          <button type="button" disabled={pending} onClick={() => submit("again")} className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full border-border/60 bg-transparent px-5")}>
            Añadir y crear otra
          </button>
          <button type="submit" form={formId} disabled={pending} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold")}>
            {pending ? "Añadiendo…" : "Añadir"}
          </button>
        </>
      }
    >
      <div
        ref={boxRef}
        role="group"
        aria-label="Nueva oportunidad"
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className="grid gap-6"
      >
        {/* 1 · Contacto: busca a un cliente que ya existe o crea uno nuevo */}
        <section aria-labelledby={`${listId}-contacto`} className="grid gap-3">
          <h3 id={`${listId}-contacto`} className="text-ui font-semibold text-foreground">
            Contacto
          </h3>
          <div className="grid gap-1.5">
            <span className={label}>Busca o crea un contacto</span>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={contactRef}
          role="combobox"
          aria-label="Contacto"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          value={query}
          placeholder="Busca o crea un contacto"
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
          className={cn(field, "rounded-full pl-11 pr-10", open && "border-accent")}
        />
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        {open && options.length ? (
          <ul id={listId} role="listbox" aria-label="Clientes" className="absolute inset-x-0 top-[52px] z-(--z-raised) rounded-3xl border border-border/60 bg-popover p-2 shadow-overlay">
            {results.length ? <li role="presentation" className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">Clientes</li> : null}
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
                  className={cn("flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2", i === active && "bg-surface-muted")}
                >
                  <span aria-hidden="true" className={cn("grid size-9 shrink-0 place-items-center overflow-hidden rounded-full", i === 0 ? "bg-accent-subtle" : "bg-surface-muted")}>
                    <CustomerAvatar identity={opt.customer} className="size-full" />
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
                    className={cn("flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-ui font-medium text-accent-text", i === active && "bg-surface-muted")}
                  >
                    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-accent/50">
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

          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className={label}>Correo</span>
              <input type="email" aria-invalid={errors.email ? true : undefined} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" className={field} />
            </label>
            <label className="grid gap-1.5">
              <span className={label}>Teléfono</span>
              <input type="tel" aria-invalid={errors.phone ? true : undefined} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 300 123 4567" className={field} />
            </label>
          </div>
        </section>

        {/* 2 · La oportunidad */}
        <form
          id={formId}
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
          className="grid gap-3"
          aria-labelledby={`${listId}-op`}
        >
          <h3 id={`${listId}-op`} className="text-ui font-semibold text-foreground">
            Oportunidad
          </h3>
          <label className="grid gap-1.5">
            <span className={label}>
              Nombre <span aria-hidden="true">*</span>
            </span>
            <input
              ref={nameRef}
              aria-required="true"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? `${listId}-err` : undefined}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((x) => ({ ...x, name: "" }));
              }}
              placeholder="Ej. Uniformes para el colegio"
              className={cn(field, "h-12 text-base font-medium")}
            />
            {errors.name ? (
              <p id={`${listId}-err`} role="alert" className="text-xs text-danger">
                {errors.name}
              </p>
            ) : null}
          </label>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1.5">
              <span className={label}>Valor estimado</span>
              <MoneyInput aria-invalid={errors.value ? true : undefined} value={parseMoney(value)} onValueChange={(v) => setValue(v == null ? "" : String(v))} placeholder="0" className={field} />
            </label>
            <div className="grid gap-1.5">
              <span className={label}>Prioridad</span>
              <span className="flex h-11 items-center rounded-2xl border border-border/60 bg-background px-4">
                <StarsInput value={priority} onChange={setPriority} />
              </span>
            </div>
          </div>
          <label className="grid gap-1.5">
            <span className={label}>Próxima actividad</span>
            <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityKind | "NONE")} className="h-11 rounded-2xl text-ui">
              <option value="CALL">Llamar</option>
              <option value="MEETING">Reunión</option>
              <option value="PROPOSAL">Enviar propuesta</option>
              <option value="NONE">Sin actividad</option>
            </Select>
          </label>
        </form>
        <p className="text-xs text-muted-foreground">Enter añade · Mayús + Enter añade y deja el formulario listo para otra · Esc cancela</p>
      </div>
    </ResponsiveSheet>
  );
}
