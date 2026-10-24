"use client";

import { useRef, useState } from "react";
import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Alert } from "@/components/molecules/alert";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import { ResponsiveSheet, SheetCloseButton } from "@/components/organisms/responsive-sheet";
import { formatRelativeTime } from "@/lib/format";
import type { ApiKeyRow } from "@/lib/api/keys";

export type CreateKeyInput = { name: string; environment: string; scopes: string[]; expiresInDays: number | null };
export type CreateKeyOutcome =
  | { ok: true; secret: string; row: ApiKeyRow }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Qué puede hacer la llave, en palabras de negocio (cada una es una lista de alcances). */
export const ACCESS_PRESETS = [
  { id: "read", label: "Solo lectura (recomendado)", hint: "Consulta todo lo que su rol puede ver; no cambia nada.", scopes: ["read"] },
  { id: "customers", label: "Solo clientes", hint: "Busca clientes.", scopes: ["customers.*"] },
  { id: "catalog", label: "Catálogo e inventario", hint: "Busca productos y consulta existencias.", scopes: ["products.*", "inventory.*"] },
  { id: "finance", label: "Finanzas (lectura)", hint: "Ingresos, gastos y movimientos. Requiere rol con acceso al dinero.", scopes: ["finance.*", "sales.*"] },
  { id: "all", label: "Todo lo que mi rol permita", hint: "Incluye lo que se agregue después. Úsala con cuidado.", scopes: ["*"] },
] as const;

const EXPIRY = [
  { value: "", label: "Sin vencimiento" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "365", label: "1 año" },
] as const;

const presetOf = (scopes: string[]) => ACCESS_PRESETS.find((p) => p.scopes.join() === scopes.join())?.label ?? scopes.join(", ");

function status(key: ApiKeyRow, now = Date.now()): { label: string; tone: "ok" | "off" } {
  if (key.revokedAt) return { label: "Revocada", tone: "off" };
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= now) return { label: "Vencida", tone: "off" };
  return { label: "Activa", tone: "ok" };
}

/**
 * Llaves de API del negocio (X.02): crear, ver y revocar. La llave completa se
 * muestra **una sola vez**, al crearla; después solo queda su prefijo. Quien la
 * crea le da su rol (no puede dar más de lo que puede); los alcances recortan.
 * Documento de la API: /api/v1/openapi.json.
 */
export function ApiKeysPanel({
  keys,
  canManage,
  onCreate,
  onRevoke,
  onChanged,
}: {
  keys: ApiKeyRow[];
  canManage: boolean;
  onCreate: (input: CreateKeyInput) => Promise<CreateKeyOutcome>;
  onRevoke: (id: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Tras crear o revocar (refrescar la lista). */
  onChanged?: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ secret: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [access, setAccess] = useState<string>("read");
  const lastCreated = useRef<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const [error, setError] = useState<string | null>(null);

  async function revoke(key: ApiKeyRow) {
    setError(null);
    const sure = await confirm({
      title: `¿Revocar «${key.name}»?`,
      description: "Deja de funcionar al instante: cualquier flujo o sistema que la use empezará a recibir 401.",
      confirmLabel: "Revocar llave",
      tone: "danger",
    });
    if (!sure) return;
    const res = await onRevoke(key.id);
    if (res.ok) onChanged?.();
    else setError(res.message);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el navegador no dejó copiar: la llave sigue visible para copiarla a mano */
    }
  }

  const base = typeof window === "undefined" ? "https://tu-dominio" : window.location.origin;

  return (
    <section aria-labelledby="api-keys-title" className="rounded-lg border border-border bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 id="api-keys-title" className="font-display text-base font-semibold">
            Llaves de API
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Conectan n8n, otros sistemas y agentes de IA a tu negocio. Cada llave ve solo tu negocio, con el permiso de quien la creó.{" "}
            <a href="/api/v1/openapi.json" target="_blank" rel="noopener noreferrer" className="font-medium text-accent-text underline-offset-4 hover:underline">
              Ver documentación (OpenAPI)
            </a>
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" className="size-4" /> Nueva llave
          </Button>
        ) : null}
      </header>

      {error ? (
        <div className="px-5 pt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      {!canManage ? (
        <div className="p-5">
          <Alert tone="info">Solo el dueño o administración puede crear y revocar llaves de API.</Alert>
        </div>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={<KeyRound />}
          title="Aún no hay llaves"
          description="Crea una para conectar n8n o un agente. Empieza con «Solo lectura»."
          action={
            <Button variant="outline" onClick={() => setCreating(true)}>
              Crear la primera llave
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {keys.map((key) => {
            const st = status(key);
            return (
              <li key={key.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="truncate">{key.name}</span>
                    <Badge variant={key.environment === "live" ? "solid" : "outline"}>{key.environment === "live" ? "Producción" : "Prueba"}</Badge>
                    <Badge variant={st.tone === "ok" ? "success" : "destructive"}>{st.label}</Badge>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <code className="font-mono">{key.keyPrefix}…</code> · {presetOf(key.scopes)} ·{" "}
                    {key.lastUsedAt ? `último uso ${formatRelativeTime(key.lastUsedAt)}` : "sin uso todavía"}
                    {key.expiresAt && !key.revokedAt ? ` · vence ${new Date(key.expiresAt).toLocaleDateString("es-CO")}` : ""}
                  </p>
                </div>
                {st.tone === "ok" ? (
                  <Button variant="outline" size="sm" onClick={() => revoke(key)} aria-label={`Revocar ${key.name}`}>
                    Revocar
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva llave de API"
        description="La llave completa se muestra una sola vez."
        submitLabel="Crear llave"
        onSubmit={async (data) => {
          const preset = ACCESS_PRESETS.find((p) => p.id === data.get("access")) ?? ACCESS_PRESETS[0];
          const days = String(data.get("expiry") ?? "");
          const res = await onCreate({
            name: String(data.get("name") ?? ""),
            environment: String(data.get("environment") ?? "live"),
            scopes: [...preset.scopes],
            expiresInDays: days ? Number(days) : null,
          });
          if (!res.ok) return { ok: false, message: res.message, fieldErrors: res.fieldErrors };
          lastCreated.current = res.secret;
          setCreated({ secret: res.secret, name: String(data.get("name") ?? "") });
          onChanged?.();
          return { ok: true };
        }}
      >
        {({ fieldErrors }) => (
          <>
            <Field label="Nombre" required error={fieldErrors.name} hint="Para reconocerla: «n8n en casa», «Agente de ventas».">
              {(p) => <Input {...p} name="name" autoComplete="off" placeholder="n8n en casa" />}
            </Field>
            <Field label="Entorno" hint="Producción usa datos reales; prueba es para ensayar sin riesgo.">
              {(p) => (
                <Select {...p} name="environment" defaultValue="live">
                  <option value="live">Producción</option>
                  <option value="test">Prueba</option>
                </Select>
              )}
            </Field>
            <Field label="Qué puede hacer" hint={ACCESS_PRESETS.find((a) => a.id === access)?.hint}>
              {(p) => (
                <Select {...p} name="access" value={access} onChange={(e) => setAccess(e.target.value)}>
                  {ACCESS_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Vencimiento" optional>
              {(p) => (
                <Select {...p} name="expiry" defaultValue="">
                  {EXPIRY.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </>
        )}
      </FormDialog>

      <ResponsiveSheet
        open={created !== null}
        onOpenChange={(open) => !open && setCreated(null)}
        title="Guarda tu llave ahora"
        description={created ? `«${created.name}» se muestra una sola vez; después solo verás su inicio.` : undefined}
        footer={
          <SheetCloseButton asChild>
            <Button>Ya la guardé</Button>
          </SheetCloseButton>
        }
      >
        {created ? (
          <div className="grid gap-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted p-2.5">
              <code data-testid="api-secret" className="min-w-0 flex-1 break-all font-mono text-[13px]">
                {created.secret}
              </code>
              <Button variant="outline" size="sm" onClick={() => copy(created.secret)} aria-label="Copiar la llave">
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                {copied ? "Copiada" : "Copiar"}
              </Button>
            </div>
            <Alert tone="warning" title="Trátala como una contraseña">
              Quien la tenga puede leer los datos que permite. Si se filtra, revócala desde esta lista.
            </Alert>
            <p className="text-[13px] text-muted-foreground">Para probarla:</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-surface-muted p-2.5 font-mono text-[12px] leading-relaxed">{`curl ${base}/api/v1/me \\\n  -H "Authorization: Bearer ${created.secret.slice(0, 12)}…"`}</pre>
          </div>
        ) : null}
      </ResponsiveSheet>
      {confirmDialog}
    </section>
  );
}
