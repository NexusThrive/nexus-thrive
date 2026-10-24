"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { useToast } from "@/components/molecules/toast";
import { commitImportAction, previewImportAction, type ImportActionResult } from "@/app/[tenant]/(app)/data/actions";
import type { ImportKind, ImportReport } from "@/lib/data-exchange/exchange-db";

const KINDS: { kind: ImportKind; title: string; blurb: string; columns: string; matches: string; exportNote: string }[] = [
  {
    kind: "customers",
    title: "Clientes",
    blurb: "Tu base de clientes y contactos.",
    columns: "Nombre (obligatoria), Documento, Correo, Teléfono, Ciudad, Etiquetas.",
    matches: "Se emparejan por documento (o por correo si no hay documento): reimportar actualiza, no duplica.",
    exportNote: "Se exportan los clientes activos.",
  },
  {
    kind: "products",
    title: "Catálogo",
    blurb: "Productos y servicios con precio, costo e impuesto.",
    columns: "Nombre y Precio (obligatorias), SKU, Tipo, Categoría, Marca, Descripción, Costo, Controla existencias, Stock mínimo, Unidad, Impuesto, IVA %, Activo.",
    matches: "Se emparejan por SKU (o por nombre si no hay SKU). Las existencias no se importan: se mueven con compras, traslados y conteos.",
    exportNote: "Se exporta todo el catálogo, también lo inactivo.",
  },
];

export default function DataExchange({ slug }: { slug: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {KINDS.map((k) => (
        <ImportCard key={k.kind} slug={slug} {...k} />
      ))}
    </div>
  );
}

function ImportCard({ slug, kind, title, blurb, columns, matches, exportNote }: { slug: string } & (typeof KINDS)[number]) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportReport | null>(null);
  const [done, setDone] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const base = `/${slug}/data/export/${kind}`;
  const headingId = `data-${kind}`;

  const reset = () => {
    setFile(null);
    setPreview(null);
    setDone(null);
    setError(null);
    if (input.current) input.current.value = "";
  };
  const send = (action: typeof previewImportAction, after: (r: Extract<ImportActionResult, { ok: true }>) => void) => {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    start(async () => {
      setError(null);
      const r = await action(slug, kind, form);
      if (!r.ok) setError(r.message);
      else after(r);
    });
  };
  const changes = preview ? preview.created + preview.updated : 0;

  return (
    <section aria-labelledby={headingId} className="grid content-start gap-4 rounded-lg border border-border bg-surface p-5">
      <header className="grid gap-1">
        <h2 id={headingId} className="flex items-center gap-2 text-[15px] font-semibold">
          <FileSpreadsheet aria-hidden="true" className="size-4 text-muted-foreground" /> {title}
        </h2>
        <p className="text-[13px] text-muted-foreground">{blurb}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <a href={`${base}?plantilla=1`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Download aria-hidden="true" className="size-4" /> Plantilla
        </a>
        <a href={base} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Download aria-hidden="true" className="size-4" /> Exportar
        </a>
      </div>
      <p className="text-xs text-muted-foreground">{exportNote}</p>

      <hr className="border-border" />

      {done ? (
        <div className="grid gap-3">
          <Alert tone="success">
            {title}: {done.created} nuevos, {done.updated} actualizados, {done.unchanged} sin cambios{done.errors.length ? ` y ${done.errors.length} filas con error` : ""}.
          </Alert>
          {done.errors.length ? <ErrorList errors={done.errors} label={`Filas con error de ${title.toLowerCase()}`} /> : null}
          <button type="button" onClick={reset} className={buttonVariants({ variant: "outline", className: "justify-self-start" })}>
            Importar otro archivo
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor={`${headingId}-file`} className="text-[13px] font-medium">
              Archivo a importar (CSV o Excel)
            </label>
            <input
              ref={input}
              id={`${headingId}-file`}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              disabled={pending}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setError(null);
              }}
              className="block w-full cursor-pointer text-[13px] file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-surface-muted file:px-3 file:py-1.5 file:text-[13px] file:font-medium"
            />
            <p className="text-xs text-muted-foreground">Máximo 5 000 filas y 5 MB. {columns}</p>
            <p className="text-xs text-muted-foreground">{matches}</p>
          </div>

          {error ? <Alert tone="danger">{error}</Alert> : null}

          {preview ? (
            <div className="grid gap-3" aria-live="polite">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{preview.created} nuevos</Badge>
                <Badge variant="outline">{preview.updated} se actualizan</Badge>
                <Badge variant="secondary">{preview.unchanged} sin cambios</Badge>
                {preview.errors.length ? <Badge variant="destructive">{preview.errors.length} con error</Badge> : null}
              </div>
              {preview.errors.length ? (
                <>
                  <ErrorList errors={preview.errors} label={`Filas con error de ${title.toLowerCase()}`} />
                  <p className="text-xs text-muted-foreground">Las filas con error no se importan; las demás sí. Corrige el archivo y vuelve a subirlo: lo ya importado no se duplica.</p>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {preview ? (
              <button
                type="button"
                disabled={pending || changes === 0}
                onClick={() =>
                  send(commitImportAction, (r) => {
                    setDone(r.report);
                    toast(`${title} importados`, "success");
                  })
                }
                className={buttonVariants()}
              >
                <Upload aria-hidden="true" className="size-4" /> {pending ? "Importando…" : changes === 0 ? "No hay cambios que importar" : `Importar ${changes} filas`}
              </button>
            ) : (
              <button type="button" disabled={pending || !file} onClick={() => send(previewImportAction, (r) => setPreview(r.report))} className={buttonVariants()}>
                {pending ? "Revisando…" : "Revisar archivo"}
              </button>
            )}
            {file && !pending ? (
              <button type="button" onClick={reset} className={buttonVariants({ variant: "ghost" })}>
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function ErrorList({ errors, label }: { errors: ImportReport["errors"]; label: string }) {
  const shown = errors.slice(0, 50);
  return (
    <div role="region" aria-label={label} tabIndex={0} className="max-h-64 overflow-auto rounded-md border border-border focus-visible:outline-2 focus-visible:outline-accent">
      <table className="w-full text-[13px]">
        <caption className="sr-only">{label}</caption>
        <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-1.5 font-medium">Fila</th>
            <th scope="col" className="px-3 py-1.5 font-medium">Qué corregir</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {shown.map((e) => (
            <tr key={`${e.line}-${e.message}`}>
              <td className="px-3 py-1.5 font-mono tabular-nums">{e.line}</td>
              <td className="px-3 py-1.5">{e.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {errors.length > shown.length ? <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">…y {errors.length - shown.length} más.</p> : null}
    </div>
  );
}
