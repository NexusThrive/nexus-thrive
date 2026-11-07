"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, CalendarPlus, Camera, ChevronDown, ChevronRight, History, Mail, Phone, ShoppingBag } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Field, focusFirstInvalid } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { checkDuplicateAction, createNewCustomerAction } from "@/app/[tenant]/(app)/contactos/nuevo/actions";
import {
  COUNTRIES,
  CUSTOMER_SOURCES,
  DOCUMENT_TYPES,
  EMPTY_NEW_CUSTOMER,
  TAX_RESPONSIBILITIES,
  initials,
  phoneDigits,
  validateNewCustomer,
  type NewCustomerInput,
} from "@/lib/business/customers/new-customer";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<keyof NewCustomerInput, string>>;
type Duplicate = { id: string; name: string; field: "phone" | "email" } | null;
type SaveMode = "open" | "book" | "another";

const card = "rounded-xl border border-border bg-card p-[22px]";
const cardTitle = "mb-4 text-base font-semibold text-foreground";

/**
 * Vista «Nuevo cliente»: panel de control (volver, ruta, guardar), formulario en tarjetas y, a la derecha, la vista previa en
 * vivo y lo que se podrá hacer al guardar. Solo el nombre es obligatorio. Salir con cambios sin guardar pide confirmación.
 */
export default function NewCustomerForm({
  slug,
  customersLabel,
  canBook,
  editId,
  initial,
  customerName,
  focusField,
}: {
  slug: string;
  customersLabel: string;
  canBook: boolean;
  /** Edición desde la ficha (?editar=1): el cliente que se edita. */
  editId?: string;
  initial?: NewCustomerInput;
  customerName?: string;
  /** Campo que recibe el foco al abrir (enlaces «Añadir» de la ficha). */
  focusField?: keyof NewCustomerInput;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, start] = useTransition();
  const base = initial ?? EMPTY_NEW_CUSTOMER;
  const [v, setV] = useState<NewCustomerInput>(base);
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const listHref = `/${slug}/contactos`;
  const fichaHref = editId ? `/${slug}/contactos/${editId}` : null;
  const backHref = fichaHref ?? listHref;

  const dirty = photo !== null || (Object.keys(EMPTY_NEW_CUSTOMER) as (keyof NewCustomerInput)[]).some((k) => v[k] !== base[k]);
  const set = (key: keyof NewCustomerInput) => (value: string) => {
    setV((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // Al entrar, el foco va al nombre o al campo que pidió el enlace «Añadir» (abriendo su sección si está plegada).
  useEffect(() => {
    const target = focusField ? formRef.current?.querySelector<HTMLElement>(`[name="${focusField}"]`) : null;
    if (target) {
      target.closest("details")?.setAttribute("open", "");
      target.focus();
    } else nameRef.current?.focus();
  }, [focusField]);

  // La vista previa de la foto se libera al cambiarla o al salir.
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  // Salir con cambios sin guardar (flecha, «<» de la barra, pestañas o menú) pide confirmación; recargar avisa con el navegador.
  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      void confirm({ title: "¿Salir sin guardar?", description: "Perderás lo que escribiste en este cliente.", confirmLabel: "Salir sin guardar", tone: "danger" }).then((ok) => {
        if (ok) router.push(`${url.pathname}${url.search}`);
      });
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, confirm, router]);

  const checkDuplicate = (probe: { phone?: string; email?: string }) => {
    if (!probe.phone?.trim() && !probe.email?.trim()) return;
    void checkDuplicateAction(slug, probe).then((found) => {
      if (found) setDuplicate(found);
      else setDuplicate((current) => (current && current.field === (probe.phone ? "phone" : "email") ? null : current));
    });
  };

  const discard = async () => {
    if (dirty && !(await confirm({ title: "¿Descartar este cliente?", description: "Se borra lo que escribiste.", confirmLabel: "Descartar", tone: "danger" }))) return;
    router.push(backHref);
  };

  const reset = () => {
    setV(EMPTY_NEW_CUSTOMER);
    setErrors({});
    setPhoto(null);
    setDuplicate(null);
    nameRef.current?.focus();
  };

  const save = (mode: SaveMode) => {
    const found = validateNewCustomer(v);
    if (Object.keys(found).length) {
      setErrors(found);
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("data", JSON.stringify(v));
      if (editId) fd.set("id", editId);
      if (photo) fd.set("photo", photo.file);
      const r = await createNewCustomerAction(fd);
      if (!r.ok) {
        setErrors(r.errors ?? {});
        toast({ title: "No se guardó", description: r.message, variant: "error" });
        requestAnimationFrame(() => focusFirstInvalid(formRef.current));
        return;
      }
      toast(r.message, "success");
      if (editId) return router.push(`/${slug}/contactos/${editId}`);
      if (mode === "another") return reset();
      // Ya guardado: se sale sin preguntar (el formulario queda limpio antes de navegar).
      setV(EMPTY_NEW_CUSTOMER);
      setPhoto(null);
      router.push(mode === "book" ? `/${slug}/bookings?nuevo=1&cliente=${r.id}` : `/${slug}/contactos/${r.id}`);
    });
  };

  const field = (key: keyof NewCustomerInput) => ({ name: key, value: v[key], onChange: (event: { target: { value: string } }) => set(key)(event.target.value) });
  const previewName = v.name.trim();
  const previewPhone = phoneDigits(v.phone);

  return (
    <div data-bleed="" className="flex flex-col">
      {/* Panel de control */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} aria-label={editId ? `Volver a la ficha de ${customerName ?? "este cliente"}` : `Volver a ${customersLabel}`} className="grid size-[34px] shrink-0 place-items-center rounded-lg border border-border text-foreground outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
          <nav aria-label="Ruta" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1.5 text-lg font-medium">
              <li>
                <Link href={listHref} className="text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                  {customersLabel}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-4 text-muted-foreground" />
              </li>
              <li aria-current="page" className="truncate text-foreground">
                {editId ? (customerName ?? "Editar cliente") : "Nuevo cliente"}
              </li>
            </ol>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? <span className="text-xs text-muted-foreground">Sin guardar</span> : null}
          <button type="button" onClick={discard} disabled={pending} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border bg-transparent")}>
            Descartar
          </button>
          <button type="button" onClick={() => save("open")} disabled={pending} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px] font-semibold" })}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-start gap-5 px-5 pb-24 pt-2">
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save("open");
          }}
          className="flex min-w-0 max-w-[820px] shrink grow-[2] basis-[560px] flex-col gap-4"
        >
          {/* Identidad */}
          <section aria-label="Identidad" className={cn(card, "flex flex-wrap items-start gap-5")}>
            <div>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setPhoto({ file, url: URL.createObjectURL(file) });
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                aria-label={photo ? "Cambiar la foto" : "Agregar una foto"}
                className="grid size-[88px] place-items-center overflow-hidden rounded-[22px] border border-dashed border-border-strong bg-background text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid justify-items-center gap-1">
                    <Camera aria-hidden="true" className="size-5" />
                    <span className="text-2xs">Foto</span>
                  </span>
                )}
              </button>
            </div>
            <div className="grid min-w-0 flex-1 basis-64 gap-3">
              <SegmentedControl
                ariaLabel="Tipo de cliente"
                size="sm"
                value={v.kind}
                onChange={(kind) => set("kind")(kind)}
                options={[
                  { value: "PERSON", label: "Persona" },
                  { value: "COMPANY", label: "Empresa" },
                ]}
                className="w-fit"
              />
              <Field label={v.kind === "COMPANY" ? "Razón social" : "Nombre completo"} required error={errors.name}>
                {(c) => (
                  <input
                    {...c}
                    ref={nameRef}
                    {...field("name")}
                    autoComplete="off"
                    maxLength={120}
                    placeholder={v.kind === "COMPANY" ? "Ej. Restaurante Sol S.A.S." : "Ej. María Pérez"}
                    className={cn(inputClasses, "h-12 text-lg font-medium")}
                  />
                )}
              </Field>
            </div>
          </section>

          {/* Contacto */}
          <section aria-labelledby="nc-contacto" className={card}>
            <h2 id="nc-contacto" className={cardTitle}>
              Contacto
            </h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-5 gap-y-[18px]">
              <Field label="Teléfono" error={errors.phone} hint="Lo usamos para recordatorios de citas por WhatsApp.">
                {(c) => (
                  <div className="flex">
                    <span aria-hidden="true" className="grid w-10 shrink-0 place-items-center rounded-s-lg border border-e-0 border-border bg-surface-muted text-sm text-muted-foreground">
                      +57
                    </span>
                    <input
                      {...c}
                      {...field("phone")}
                      onBlur={() => checkDuplicate({ phone: v.phone })}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="300 123 4567"
                      className={cn(inputClasses, "rounded-s-none")}
                    />
                  </div>
                )}
              </Field>
              <Field label="Correo electrónico" error={errors.email} hint="Para enviar comprobantes y facturas.">
                {(c) => <input {...c} {...field("email")} onBlur={() => checkDuplicate({ email: v.email })} type="email" autoComplete="email" placeholder="maria@correo.com" className={inputClasses} />}
              </Field>
              <Field label="Tipo de documento" error={errors.documentType}>
                {(c) => (
                  <Select {...c} {...field("documentType")}>
                    {DOCUMENT_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Número de documento">
                {(c) => <input {...c} {...field("documentNumber")} autoComplete="off" placeholder="Sin puntos ni guiones" className={inputClasses} />}
              </Field>
            </div>
            {duplicate ? (
              <p role="status" className="mt-3 text-xs text-muted-foreground">
                Ya existe <b className="font-medium text-foreground">{duplicate.name}</b> con este {duplicate.field === "phone" ? "teléfono" : "correo"} ·{" "}
                <Link href={`/${slug}/contactos/${duplicate.id}`} className="font-medium text-accent-text underline-offset-2 hover:underline">
                  Ver
                </Link>
              </p>
            ) : null}
          </section>

          {/* Ubicación */}
          <section aria-labelledby="nc-ubicacion" className={card}>
            <h2 id="nc-ubicacion" className={cardTitle}>
              Ubicación
            </h2>
            <div className="grid gap-[18px]">
              <Field label="Dirección">
                {(c) => <input {...c} {...field("address")} autoComplete="street-address" placeholder="Calle, número y barrio" className={inputClasses} />}
              </Field>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-5 gap-y-[18px]">
                <Field label="Ciudad">{(c) => <input {...c} {...field("city")} autoComplete="address-level2" placeholder="Ej. Cartagena" className={inputClasses} />}</Field>
                <Field label="Departamento">{(c) => <input {...c} {...field("region")} autoComplete="address-level1" placeholder="Ej. Bolívar" className={inputClasses} />}</Field>
                <Field label="País" error={errors.country}>
                  {(c) => (
                    <Select {...c} {...field("country")}>
                      {COUNTRIES.map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
            </div>
          </section>

          {/* Etiquetas, origen y notas */}
          <details className={cn(card, "group p-0")}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-[22px] outline-none focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <span className="grid gap-0.5">
                <span className="text-base font-semibold text-foreground">Etiquetas, origen y notas</span>
                <span className="text-xs text-muted-foreground">Opcional · ayuda a segmentar y dar seguimiento</span>
              </span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--d2) ease-(--nx-ease-out) group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="grid gap-[18px] px-[22px] pb-[22px]">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-5 gap-y-[18px]">
                <Field label="Etiquetas" hint="Separadas por coma: VIP, mayorista, referido…">
                  {(c) => <input {...c} {...field("tags")} autoComplete="off" className={inputClasses} />}
                </Field>
                <Field label="¿Cómo nos conoció?">
                  {(c) => (
                    <Select {...c} {...field("source")}>
                      {CUSTOMER_SOURCES.map((source) => (
                        <option key={source.label} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              {editId ? null : <Field label="Notas internas">{(c) => <textarea {...c} {...field("notes")} rows={3} maxLength={2000} className={textareaClasses} />}</Field>}
            </div>
          </details>

          {/* Facturación electrónica */}
          <details className={cn(card, "group p-0")}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-[22px] outline-none focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <span className="grid gap-0.5">
                <span className="text-base font-semibold text-foreground">Facturación electrónica</span>
                <span className="text-xs text-muted-foreground">Solo si le vas a facturar · correo y datos fiscales</span>
              </span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--d2) ease-(--nx-ease-out) group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-5 gap-y-[18px] px-[22px] pb-[22px]">
              <Field label="Correo para facturas" error={errors.invoiceEmail}>
                {(c) => <input {...c} {...field("invoiceEmail")} type="email" autoComplete="off" placeholder="Si es distinto al de contacto" className={inputClasses} />}
              </Field>
              <Field label="Responsabilidad fiscal" error={errors.taxResponsibility}>
                {(c) => (
                  <Select {...c} {...field("taxResponsibility")}>
                    <option value="">Sin definir</option>
                    {TAX_RESPONSIBILITIES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </details>

          {/* Acciones */}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={pending} className={buttonVariants({ variant: "accent", className: "h-[38px] font-semibold" })}>
              {editId ? "Guardar cambios" : "Guardar"}
            </button>
            {canBook && !editId ? (
              <button type="button" disabled={pending} onClick={() => save("book")} className={cn(buttonVariants({ variant: "outline" }), "h-[38px] border border-border")}>
                Guardar y agendar cita
              </button>
            ) : null}
            {editId ? null : (
              <button type="button" disabled={pending} onClick={() => save("another")} className={cn(buttonVariants({ variant: "outline" }), "h-[38px] border border-border")}>
                Guardar y crear otro
              </button>
            )}
          </div>
        </form>

        {/* Columna lateral */}
        <aside className="flex min-w-0 max-w-[380px] shrink grow basis-[300px] flex-col gap-4">
          <section aria-labelledby="nc-preview" className={card}>
            <h2 id="nc-preview" className={cardTitle}>
              Vista previa
            </h2>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-[14px] bg-accent-subtle text-base font-semibold text-accent-text">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt="" className="size-full object-cover" />
                ) : (
                  initials(previewName) || <span className="text-muted-foreground">?</span>
                )}
              </span>
              <div className="min-w-0">
                <p className={cn("truncate text-base font-semibold", previewName ? "text-foreground" : "text-muted-foreground")}>{previewName || "Nombre del cliente"}</p>
                <p className="text-xs text-muted-foreground">{v.kind === "COMPANY" ? "Empresa" : "Persona"}</p>
              </div>
            </div>
            <ul className="mt-4 grid gap-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone aria-hidden="true" className="size-4 text-muted-foreground" />
                <span className={previewPhone ? "text-foreground" : "text-muted-foreground"}>{previewPhone ? `+57 ${previewPhone.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3")}` : "Teléfono"}</span>
              </li>
              <li className="flex min-w-0 items-center gap-2">
                <Mail aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className={cn("truncate", v.email.trim() ? "text-foreground" : "text-muted-foreground")}>{v.email.trim() || "Correo electrónico"}</span>
              </li>
            </ul>
          </section>

          <section aria-labelledby="nc-despues" className={card}>
            <h2 id="nc-despues" className={cardTitle}>
              Al guardar podrás
            </h2>
            <ul className="grid gap-3 text-sm">
              {[
                { icon: CalendarPlus, label: "Agendar una cita" },
                { icon: ShoppingBag, label: "Crear una venta o membresía" },
                { icon: Banknote, label: "Registrar un pago" },
                { icon: History, label: "Ver historial, notas y actividad" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-text">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
      {confirmDialog}
    </div>
  );
}
