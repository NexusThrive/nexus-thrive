"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, CalendarPlus, Camera, ChevronDown, History, Mail, Phone, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Field, focusFirstInvalid } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { TopbarCrumbs } from "@/components/molecules/topbar-crumbs";
import { checkDuplicateAction, createNewCustomerAction } from "@/app/[tenant]/(app)/contactos/nuevo/actions";
import {
  COUNTRIES,
  CUSTOMER_SOURCES,
  DOCUMENT_TYPES,
  EMPTY_NEW_CUSTOMER,
  TAX_RESPONSIBILITIES,
  phoneDigits,
  validateNewCustomer,
  type NewCustomerInput,
} from "@/lib/business/customers/new-customer";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<keyof NewCustomerInput, string>>;
type Duplicate = { id: string; name: string; field: "phone" | "email" } | null;
type SaveMode = "open" | "book" | "another";

const card = "rounded-(--radius-widget) border border-border/60 bg-card p-6";

/** Cabecera de una tarjeta del formulario: título y una línea que dice para qué es (como las de la ficha). */
function SectionHead({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div className="mb-5 grid gap-0.5">
      <h2 id={id} className="text-ui font-semibold text-foreground">
        {title}
      </h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/**
 * Vista «Nuevo cliente», con la misma estructura de la ficha: arriba volver, título y guardar (la ruta va en la barra superior); a la
 * izquierda el formulario en tarjetas suaves y, a la derecha, la vista previa en vivo como perfil y lo que se podrá hacer al guardar. Solo el nombre es obligatorio. Salir con cambios sin guardar pide confirmación.
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
    <div
      data-bleed=""
      className="flex flex-col pb-6"
      style={{ backgroundImage: "radial-gradient(70% 55% at 0% 0%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 70%), radial-gradient(60% 50% at 100% 100%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 70%)" }}
    >
      {/* La ruta («Clientes › Nuevo cliente») vive en la barra superior. */}
      <TopbarCrumbs items={[{ label: customersLabel, href: listHref }, { label: editId ? (customerName ?? "Editar cliente") : "Nuevo cliente" }]} />
      {/* Cabecera: volver, título y guardar */}
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 pb-2 pt-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href={backHref} aria-label={editId ? `Volver a la ficha de ${customerName ?? "este cliente"}` : `Volver a ${customersLabel}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-muted text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
          <p className="font-display text-xl font-medium tracking-tight text-foreground min-[820px]:text-2xl">{editId ? "Editar cliente" : "Nuevo cliente"}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? <span className="text-xs text-muted-foreground">Sin guardar</span> : null}
          <button type="button" onClick={discard} disabled={pending} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 rounded-full border border-border/60 bg-transparent px-5")}>
            Descartar
          </button>
          <button type="button" onClick={() => save("open")} disabled={pending} className={cn(buttonVariants({ variant: "accent", size: "sm" }), "h-11 rounded-full px-6 text-sm font-semibold")}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="grid w-full items-start gap-4 px-6 pt-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save("open");
          }}
          className="grid min-w-0 gap-4"
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
                className="grid size-24 place-items-center overflow-hidden rounded-full border border-dashed border-border-strong bg-surface-muted/60 text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
            <SectionHead id="nc-contacto" title="Contacto" subtitle="Cómo hablarle y cómo identificarlo" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-5 gap-y-[18px]">
              <Field label="Teléfono" error={errors.phone} hint="Lo usamos para recordatorios de citas por WhatsApp.">
                {(c) => (
                  <div className="flex">
                    <span aria-hidden="true" className="grid w-10 shrink-0 place-items-center rounded-s-xl border border-e-0 border-border bg-surface-muted text-sm text-muted-foreground">
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
            <SectionHead id="nc-ubicacion" title="Ubicación" subtitle="Dónde queda, para visitas y envíos" />
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
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-(--radius-widget) p-6 outline-none focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <span className="grid gap-0.5">
                <span className="text-ui font-semibold text-foreground">Etiquetas, origen y notas</span>
                <span className="text-xs text-muted-foreground">Opcional · ayuda a segmentar y dar seguimiento</span>
              </span>
              <ChevronDown aria-hidden="true" className="size-9 shrink-0 rounded-full bg-surface-muted p-2.5 text-foreground transition-transform duration-(--d2) ease-(--nx-ease-out) group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="grid gap-[18px] px-6 pb-6">
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
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-(--radius-widget) p-6 outline-none focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <span className="grid gap-0.5">
                <span className="text-ui font-semibold text-foreground">Facturación electrónica</span>
                <span className="text-xs text-muted-foreground">Solo si le vas a facturar · correo y datos fiscales</span>
              </span>
              <ChevronDown aria-hidden="true" className="size-9 shrink-0 rounded-full bg-surface-muted p-2.5 text-foreground transition-transform duration-(--d2) ease-(--nx-ease-out) group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-5 gap-y-[18px] px-6 pb-6">
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
            <button type="submit" disabled={pending} className={cn(buttonVariants({ variant: "accent" }), "h-12 rounded-full px-7 text-sm font-semibold")}>
              {editId ? "Guardar cambios" : "Guardar"}
            </button>
            {canBook && !editId ? (
              <button type="button" disabled={pending} onClick={() => save("book")} className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-full border border-border/60 px-6")}>
                Guardar y agendar cita
              </button>
            ) : null}
            {editId ? null : (
              <button type="button" disabled={pending} onClick={() => save("another")} className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-full border border-border/60 px-6")}>
                Guardar y crear otro
              </button>
            )}
          </div>
        </form>

        {/* Columna lateral: la vista previa como perfil y lo que se podrá hacer al guardar */}
        <aside className="grid min-w-0 gap-4">
          <section aria-labelledby="nc-preview" className={cn(card, "grid justify-items-center gap-4 text-center")}>
            <h2 id="nc-preview" className="sr-only">
              Vista previa
            </h2>
            <span aria-hidden="true" className="grid size-[120px] shrink-0 place-items-center overflow-hidden rounded-full bg-accent-subtle text-base font-semibold text-accent-text ring-8 ring-accent-subtle/50">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="size-full object-cover" />
              ) : (
                <CustomerAvatar identity={{ name: previewName, email: v.email, phone: v.phone }} className="size-full" />
              )}
            </span>
            <div className="grid justify-items-center gap-2">
              <p className={cn("break-words font-display text-2xl font-semibold tracking-tight", previewName ? "text-foreground" : "text-muted-foreground")}>{previewName || "Nombre del cliente"}</p>
              <Badge variant="outline">{v.kind === "COMPANY" ? "Empresa" : "Persona"}</Badge>
            </div>
            <ul className="grid w-full gap-1 text-left">
              <li className="flex items-center gap-3 rounded-2xl px-2 py-2">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground">
                  <Phone className="size-[18px]" strokeWidth={1.6} />
                </span>
                <span className={cn("text-ui", previewPhone ? "font-medium text-foreground" : "text-muted-foreground")}>{previewPhone ? `+57 ${previewPhone.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3")}` : "Teléfono"}</span>
              </li>
              <li className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-2">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground">
                  <Mail className="size-[18px]" strokeWidth={1.6} />
                </span>
                <span className={cn("truncate text-ui", v.email.trim() ? "font-medium text-foreground" : "text-muted-foreground")}>{v.email.trim() || "Correo electrónico"}</span>
              </li>
            </ul>
          </section>

          <section aria-labelledby="nc-despues" className={card}>
            <SectionHead id="nc-despues" title="Al guardar podrás" subtitle="Todo queda en su ficha" />
            <ul className="grid gap-1">
              {[
                { icon: CalendarPlus, label: "Agendar una cita" },
                { icon: ShoppingBag, label: "Crear una venta o membresía" },
                { icon: Banknote, label: "Registrar un pago" },
                { icon: History, label: "Ver historial, notas y actividad" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-accent-text">
                    <Icon className="size-[18px]" strokeWidth={1.6} />
                  </span>
                  <span className="text-ui text-foreground">{label}</span>
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
