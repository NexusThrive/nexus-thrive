import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pause, Play, Wallet } from "lucide-react";
import { prisma } from "@/lib/core/prisma";
import { getOrgActiva } from "@/lib/core/org";
import { formatDate, formatMoney } from "@/lib/shared/format";
import { cobrarPago, anularPago } from "@/lib/modulos/pagos/acciones";
import { congelarCliente, reactivarCliente } from "@/lib/modulos/clientes/acciones";
import { getClienteDeOrg } from "@/lib/modulos/clientes/consultas";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await getOrgActiva();
  const { id } = await params;

  // getClienteDeOrg acota el cliente Y su plan a la org. Con
  // `include: { plan: true }` un planId envenenado mostraba el nombre y el
  // precio de un plan de otro negocio. Ver lib/modulos/clientes/consultas.ts.
  const cliente = await getClienteDeOrg(id, org.id);
  if (!cliente) notFound();

  const planes = await prisma.plan.findMany({ where: { orgId: org.id, activo: true }, orderBy: { precio: "asc" } });

  const estadoClase =
    cliente.estado === "ACTIVO"
      ? "bg-nexus-green-soft text-nexus-green-text"
      : cliente.estado === "VENCIDO"
        ? "bg-nexus-red-soft text-nexus-red-text"
        : "bg-nexus-surface-alt text-nexus-muted";

  return (
    <div className="space-y-6">
      <Link href="/plantillas/gym/clientes" className="flex items-center gap-1 text-sm text-nexus-muted hover:text-nexus-ink">
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Perfil */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold text-nexus-ink">{cliente.nombre}</h1>
              <p className="mt-0.5 text-sm text-nexus-muted">
                {cliente.documento || "Sin cédula"}
                {cliente.telefono ? ` · ${cliente.telefono}` : ""}
              </p>
              <p className="text-sm text-nexus-muted">{cliente.email || ""}</p>
            </div>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${estadoClase}`}>
              {cliente.estado}
            </span>
          </div>

          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-nexus-muted">Membresía</dt>
              <dd className="font-medium text-nexus-ink">{cliente.plan?.nombre ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-nexus-muted">Ingresó</dt>
              <dd className="font-medium text-nexus-ink">{formatDate(cliente.fechaIngreso)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-nexus-muted">Vence</dt>
              <dd className="font-medium text-nexus-ink">
                {cliente.periodoFin ? formatDate(cliente.periodoFin) : "—"}
              </dd>
            </div>
            {cliente.nota && (
              <div className="border-t border-nexus-border/70 pt-2">
                <dt className="text-nexus-muted">Nota</dt>
                <dd className="mt-1 text-nexus-ink">{cliente.nota}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 flex flex-col gap-2">
            {cliente.estado === "CONGELADO" ? (
              <form action={reactivarCliente}>
                <input type="hidden" name="id" value={cliente.id} />
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-nexus-green px-3 py-2 text-sm font-medium text-white transition hover:opacity-85">
                  <Play className="h-4 w-4" /> Reactivar
                </button>
              </form>
            ) : (
              <form action={congelarCliente}>
                <input type="hidden" name="id" value={cliente.id} />
                <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-nexus-border px-3 py-2 text-sm font-medium text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-ink">
                  <Pause className="h-4 w-4" /> Congelar membresía
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Cobrar */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-nexus-ink">
            <Wallet className="h-4 w-4" /> Cobrar membresía
          </h2>
          <form action={cobrarPago} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="clienteId" value={cliente.id} />
            <select name="planId" className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold">
              <option value="">Mes libre (30 días)</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id} data-precio={Number(p.precio)}>
                  {p.nombre} · {formatMoney(Number(p.precio))}
                </option>
              ))}
            </select>
            <input
              name="monto"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto"
              className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            />
            <select name="metodo" className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold">
              {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "NEQUI", "OTRO"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-nexus-ink px-4 py-2 text-sm font-medium text-nexus-surface transition hover:opacity-85"
            >
              Registrar cobro
            </button>
          </form>
          <p className="mt-3 text-xs text-nexus-muted">
            El cobro extiende la membresía {cliente.periodoFin && cliente.periodoFin > new Date()
              ? "desde su vencimiento actual"
              : "desde hoy"}.
          </p>

          {/* Historial */}
          <h3 className="mt-6 text-sm font-semibold text-nexus-ink">Historial de pagos</h3>
          {cliente.pagos.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
              Sin pagos todavía
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-nexus-border/70">
              {cliente.pagos.map((p) => (
                <li key={p.id} className={`flex items-center justify-between py-2.5 ${p.anulado ? "opacity-60" : ""}`}>
                  <div>
                    <p className="text-sm font-medium text-nexus-ink">
                      {p.concepto}
                      {p.anulado && <span className="ml-2 text-xs font-normal text-nexus-red-text">(anulado)</span>}
                    </p>
                    <p className="text-xs text-nexus-muted">
                      {formatDate(p.pagadoEl)} · {p.metodo} · cubre hasta {formatDate(p.periodoFin)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-nexus-ink">{formatMoney(Number(p.monto))}</p>
                    {p.anulado ? (
                      <p className="text-xs text-nexus-red-text">{p.motivoAnulacion ?? "Anulado"}</p>
                    ) : (
                      <form action={anularPago} className="mt-1">
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          name="motivo"
                          required
                          placeholder="Motivo de anulación"
                          className="w-44 rounded border border-nexus-border bg-nexus-bg px-2 py-0.5 text-xs outline-none focus:border-nexus-red"
                        />
                        <button type="submit" className="mt-1 block text-xs text-nexus-red-text hover:underline">
                          Anular
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}