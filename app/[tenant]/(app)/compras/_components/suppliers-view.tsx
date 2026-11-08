"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserRound } from "lucide-react";
import { Select } from "@/components/atoms/select";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog, FormDrawer } from "@/components/organisms/form-sheet";
import { DOCUMENT_TYPES } from "@/lib/core/parties/documents";
import type { PartyRow } from "@/lib/core/parties/parties-db";
import { createSupplierAction, updateSupplierContactAction } from "@/app/[tenant]/(app)/compras/actions";

/** Proveedores: terceros con el rol SUPPLIER (un proveedor que también compra es la misma ficha). */
export default function SuppliersView({ slug, suppliers }: { slug: string; suppliers: PartyRow[] }) {
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PartyRow | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const shown = suppliers.filter((s) => !q.trim() || `${s.legalName} ${s.documentNumber ?? ""} ${s.email ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" aria-label="Buscar proveedor" placeholder="Buscar por nombre, documento o correo" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputClasses} max-w-sm`} />
        <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
          <Plus aria-hidden="true" className="size-4" /> Nuevo proveedor
        </button>
      </div>
      {shown.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {shown.map((s) => (
            <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <span className="grid min-w-0 gap-0.5">
              <b className="truncate text-ui font-medium">{s.legalName}</b>
              <small className="truncate text-xs text-muted-foreground">
                {[s.documentType && s.documentNumber ? `${s.documentType} ${s.documentNumber}` : s.documentNumber, s.phone, s.email, s.city].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                {s.roles.includes("CUSTOMER") ? " · también es cliente" : ""}
              </small>
              {s.contact ? <small className="flex items-center gap-1.5 truncate text-xs text-foreground/80"><UserRound aria-hidden="true" className="size-3 shrink-0" />{[s.contact.name, s.contact.phone, s.contact.email].filter(Boolean).join(" · ")}</small> : null}
              </span>
              <button type="button" onClick={() => setEditing(s)} aria-label={`Editar el contacto de ${s.legalName}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{s.contact ? "Contacto" : "Agregar contacto"}</button>
            </li>
          ))}
        </ul>
      ) : (
          <EmptyState mark="page" remember={!suppliers.length} title={suppliers.length ? "Sin resultados" : "Aún no hay proveedores"} description={suppliers.length ? "Prueba con otro nombre o documento." : "Registra a quienes te venden mercancía para poder hacerles órdenes de compra."} action={suppliers.length ? undefined : <button type="button" onClick={() => setCreating(true)} className={buttonVariants()}><Plus aria-hidden="true" className="size-4" /> Nuevo proveedor</button>} />
      )}

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing ? `Contacto de ${editing.legalName}` : "Contacto"}
        description="La persona con la que hablas para pedirle."
        submitLabel="Guardar contacto"
        onSubmit={async (data) => {
          if (!editing) return { ok: true };
          const r = await updateSupplierContactAction(slug, editing.id, { name: String(data.get("contactName") ?? ""), phone: String(data.get("contactPhone") ?? ""), email: String(data.get("contactEmail") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { contactEmail: r.message } };
        }}
        onSuccess={({ message }) => { if (message) toast(message, "success"); router.refresh(); }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Persona de contacto" optional>{(c) => <input {...c} name="contactName" autoComplete="off" defaultValue={editing?.contact?.name ?? ""} className={inputClasses} />}</Field>
            <Field label="Celular" optional>{(c) => <input {...c} name="contactPhone" type="tel" autoComplete="off" defaultValue={editing?.contact?.phone ?? ""} className={inputClasses} />}</Field>
            <Field label="Correo" optional error={fieldErrors.contactEmail}>{(c) => <input {...c} name="contactEmail" type="email" autoComplete="off" defaultValue={editing?.contact?.email ?? ""} className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>

      <FormDrawer
        open={creating}
        onOpenChange={setCreating}
        title="Nuevo proveedor"
        description="Si ya existe como cliente o proveedor con ese documento, no se duplica."
        submitLabel="Crear proveedor"
        pendingLabel="Creando…"
        onSubmit={async (data) => {
          const name = String(data.get("legalName") ?? "").trim();
          if (name.length < 2) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { legalName: "Escribe el nombre o la razón social." } };
          const r = await createSupplierAction(slug, {
            kind: data.get("kind") === "COMPANY" ? "COMPANY" : "PERSON",
            documentType: (String(data.get("documentType") ?? "") || null) as never,
            documentNumber: String(data.get("documentNumber") ?? "") || null,
            legalName: name,
            email: String(data.get("email") ?? "") || null,
            phone: String(data.get("phone") ?? "") || null,
            city: String(data.get("city") ?? "") || null,
            contact: { name: String(data.get("contactName") ?? ""), phone: String(data.get("contactPhone") ?? ""), email: String(data.get("contactEmail") ?? "") },
          });
          if (!r.ok) return { ok: false, message: r.message };
          if (r.duplicates?.length) toast({ title: "Ojo: puede estar repetido", description: `Se parece a «${r.duplicates[0].legalName}» (mismo ${r.duplicates[0].reason === "email" ? "correo" : r.duplicates[0].reason === "phone" ? "teléfono" : "nombre"}).`, variant: "warning" });
          return { ok: true, message: r.message };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre o razón social" required error={fieldErrors.legalName} className="sm:col-span-2">
              {(c) => <input {...c} name="legalName" autoComplete="off" className={inputClasses} placeholder="Nombre o razón social" />}
            </Field>
            <Field label="Tipo">
              {(c) => (
                <Select {...c} name="kind" defaultValue="COMPANY">
                  <option value="COMPANY">Empresa</option>
                  <option value="PERSON">Persona</option>
                </Select>
              )}
            </Field>
            <Field label="Documento" optional>
              {(c) => (
                <Select {...c} name="documentType" defaultValue="NIT">
                  <option value="">Sin documento</option>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Número" optional hint="Sin puntos ni dígito de verificación." className="sm:col-span-2">
              {(c) => <input {...c} name="documentNumber" inputMode="numeric" autoComplete="off" className={inputClasses} />}
            </Field>
            <Field label="Teléfono" optional>{(c) => <input {...c} name="phone" type="tel" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Correo" optional>{(c) => <input {...c} name="email" type="email" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Ciudad" optional className="sm:col-span-2">{(c) => <input {...c} name="city" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Persona de contacto" optional hint="Con quién hablas para pedirle." className="sm:col-span-2">{(c) => <input {...c} name="contactName" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Celular del contacto" optional>{(c) => <input {...c} name="contactPhone" type="tel" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Correo del contacto" optional>{(c) => <input {...c} name="contactEmail" type="email" autoComplete="off" className={inputClasses} />}</Field>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
