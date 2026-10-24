"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { PhoneInput } from "@/components/molecules/phone-input";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { bmi, profileFor, type FieldDef } from "@/lib/business/customer-fields";
import { PAYMENT_METHODS } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { useVerticalTerms } from "../../vertical-terms-context";
import { customerFormDataAction, getCustomerForEditAction, saveCustomerAction, type CustomerEdit } from "../profile-actions";
import { Select } from "@/components/atoms/select";

const EMPTY: CustomerEdit = { id: "", name: "", email: "", phone: "", documentId: "", birthDate: "", city: "", tags: "", profile: {}, photoId: null };

/**
 * Crear o editar un cliente con los campos de su rubro: el gym suma foto,
 * medidas, objetivo, salud, contacto de emergencia y el plan con el que
 * entra (crea la membresía y su cobro). Turismo, museo y constructora tienen
 * los suyos.
 */
export default function CustomerSheet({ tenantSlug, customerId, onClose, onSaved }: { tenantSlug: string; customerId?: string | null; onClose: () => void; onSaved?: (id: string) => void }) {
  const terms = useVerticalTerms();
  const [v, setV] = useState<CustomerEdit>(EMPTY);
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof customerFormDataAction>>>(null);
  const [loading, setLoading] = useState(!!customerId);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [planId, setPlanId] = useState("");
  const [method, setMethod] = useState("CASH");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    void customerFormDataAction(tenantSlug).then((m) => alive && setMeta(m));
    if (customerId)
      void getCustomerForEditAction(tenantSlug, customerId).then((c) => {
        if (!alive) return;
        if (c) setV(c);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tenantSlug, customerId]);

  const profile = profileFor(meta?.vertical ?? "");
  const setP = (k: string, val: string) => setV((x) => ({ ...x, profile: { ...x.profile, [k]: val } }));
  const b = bmi(Number(String(v.profile.weightKg ?? "").replace(",", ".")) || undefined, Number(v.profile.heightCm) || undefined);
  const plan = meta?.plans.find((p) => p.id === planId);

  const save = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("slug", tenantSlug);
      if (customerId) fd.set("id", customerId);
      for (const k of ["name", "email", "phone", "documentId", "birthDate", "city", "tags"] as const) fd.set(k, v[k]);
      for (const [k, val] of Object.entries(v.profile)) fd.set(`p_${k}`, String(val ?? ""));
      if (photo) fd.set("photo", photo);
      if (planId) {
        fd.set("planId", planId);
        fd.set("paymentMethod", method);
      }
      const r = await saveCustomerAction(fd);
      if (r.ok) {
        toast(r.message, "success");
        router.refresh();
        onSaved?.(r.id);
        onClose();
      } else {
        setErrors(r.errors ?? {});
        toast({ title: "No se guardó", description: r.message, variant: "error" });
      }
    });

  const renderField = (f: FieldDef) => {
    const val = String(v.profile[f.key] ?? "");
    const err = errors[`p_${f.key}`];
    if (f.type === "select")
      return (
        <Field key={f.key} label={f.label} error={err}>
          {(c) => (
            <Select {...c} value={val} onChange={(e) => setP(f.key, e.target.value)}>
              <option value="">Sin definir</option>
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          )}
        </Field>
      );
    if (f.type === "textarea")
      return (
        <Field key={f.key} label={f.label} error={err} className="sm:col-span-2">
          {(c) => <textarea {...c} rows={2} value={val} onChange={(e) => setP(f.key, e.target.value)} className={textareaClasses} placeholder={f.placeholder} />}
        </Field>
      );
    if (f.type === "number")
      return (
        <Field key={f.key} label={`${f.label} (${f.unit})`} error={err}>
          {(c) => <input {...c} inputMode="decimal" value={val} onChange={(e) => setP(f.key, e.target.value)} className={inputClasses} />}
        </Field>
      );
    return (
      <Field key={f.key} label={f.label} error={err} hint={"hint" in f ? f.hint : undefined}>
        {(c) => <input {...c} value={val} onChange={(e) => setP(f.key, e.target.value)} className={inputClasses} placeholder={f.placeholder} />}
      </Field>
    );
  };

  return (
    <ResponsiveSheet
      drawer
      size="lg"
      open
      onOpenChange={(o) => !o && !pending && onClose()}
      title={customerId ? `Editar ${terms.customer.toLowerCase()}` : `Nuevo ${terms.customer.toLowerCase()}`}
      description={profile.fields.length ? profile.title : "Datos de contacto e identificación."}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={pending} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending || loading} onClick={save} className={buttonVariants()}>
            {pending ? "Guardando…" : customerId ? "Guardar cambios" : plan ? `Registrar y cobrar ${formatCurrency(plan.price)}` : "Registrar"}
          </button>
        </>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid gap-5">
          <div className="flex items-start gap-4">
            {profile.photo ? (
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Foto" className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-border-input bg-surface-muted text-muted-foreground hover:border-border-input-hover">
                {preview || v.photoId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview ?? `/api/files/${v.photoId}`} alt="" className="size-full object-cover" />
                ) : (
                  <Camera aria-hidden="true" className="size-6" />
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (preview) URL.revokeObjectURL(preview);
                    setPhoto(f);
                    setPreview(f ? URL.createObjectURL(f) : null);
                  }} />
              </button>
            ) : null}
            <div className="grid min-w-0 flex-1 gap-3">
              <Field label="Nombre completo" required error={errors.name}>
                {(c) => <input {...c} autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputClasses} placeholder="María Pérez" />}
              </Field>
              {errors.photo ? <p className="text-xs text-danger">{errors.photo}</p> : null}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="WhatsApp / teléfono" error={errors.phone}>
              {(c) => <PhoneInput id={c.id} value={v.phone} onChange={(val) => setV({ ...v, phone: val })} />}
            </Field>
            <Field label="Correo" error={errors.email}>
              {(c) => <input {...c} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} className={inputClasses} />}
            </Field>
            <Field label={profile.documentLabel}>{(c) => <input {...c} value={v.documentId} onChange={(e) => setV({ ...v, documentId: e.target.value })} className={inputClasses} />}</Field>
            <Field label="Fecha de nacimiento" error={errors.birthDate}>
              {(c) => <input {...c} type="date" value={v.birthDate} onChange={(e) => setV({ ...v, birthDate: e.target.value })} className={inputClasses} />}
            </Field>
            <Field label="Ciudad">{(c) => <input {...c} value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} className={inputClasses} />}</Field>
            <Field label="Etiquetas" hint="Separadas por coma: VIP, mañana, referido…">
              {(c) => <input {...c} value={v.tags} onChange={(e) => setV({ ...v, tags: e.target.value })} className={inputClasses} />}
            </Field>
          </div>
          {profile.fields.length ? (
            <section className="grid gap-3">
              <h3 className="flex items-baseline justify-between gap-3 text-[13px] font-semibold">
                {profile.title}
                {b ? <span className="font-mono text-xs font-normal text-muted-foreground">IMC {b.value.toLocaleString("es-CO")} · {b.label}</span> : null}
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{profile.fields.map(renderField)}</div>
            </section>
          ) : null}
          {!customerId && profile.planOnCreate ? (
            <section className="grid gap-3 rounded-md bg-surface-muted p-3.5">
              <h3 className="text-[13px] font-semibold">Plan con el que entra</h3>
              {meta?.plans.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Plan">
                    {(c) => (
                      <Select {...c} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                        <option value="">Sin plan por ahora</option>
                        {meta.plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {formatCurrency(p.price)} · {p.days} días
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  {planId ? (
                    <Field label="Cobro">
                      {(c) => (
                        <Select {...c} value={method} onChange={(e) => setMethod(e.target.value)}>
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                          <option value="NONE">Aún no paga</option>
                        </Select>
                      )}
                    </Field>
                  ) : null}
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">Crea tus planes en Catálogo → Planes para inscribir desde aquí.</p>
              )}
            </section>
          ) : null}
        </div>
      )}
    </ResponsiveSheet>
  );
}
