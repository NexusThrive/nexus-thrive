import Link from "next/link";
import { Wallet, Plus } from "lucide-react";
import { prisma } from "@/lib/core/prisma";
import { getOrgActiva } from "@/lib/core/org";
import { crearFormatos } from "@/lib/shared/format";
import { cobrarPago } from "@/lib/modulos/pagos/acciones";
import { crearPlan } from "@/lib/modulos/planes/acciones";
import { getPlanesDeOrg } from "@/lib/modulos/planes/consultas";
import { getClientesPorVencer, getNombresClientes } from "@/lib/modulos/clientes/consultas";

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  const { org } = await getOrgActiva();

  // La moneda y el país los persiste el onboarding: el formato sigue a la org,
  // no a constantes del código.
  const presentacion = { moneda: org.moneda, pais: org.pais };
  const { formatDate, formatMoney } = crearFormatos(presentacion);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en7d = new Date(hoy);
  en7d.setDate(hoy.getDate() + 7);
  const desdeMes = new Date(hoy);
  desdeMes.setMonth(hoy.getMonth() - 1);

  // Los clientes y los planes vienen del servicio de su módulo, no de un
  // `prisma.*` suelto: la página no debe poder saltarse el scope por org
  // (ver lib/modulos/clientes/consultas.ts).
  const [clientes, planes, pagosRecientes, porVencer] = await Promise.all([
    getNombresClientes(org.id),
    getPlanesDeOrg(org.id),
    prisma.pago.findMany({
      where: { orgId: org.id, anulado: false, pagadoEl: { gte: desdeMes } },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { pagadoEl: "desc" },
      take: 20,
    }),
    getClientesPorVencer(org.id, { desde: hoy, hasta: en7d }),
  ]);

  const totalRecibidoMes = pagosRecientes.reduce((acc, p) => acc + Number(p.monto), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-nexus-ink">Pagos</h1>
          <p className="text-sm text-nexus-muted">
            {formatMoney(totalRecibidoMes)} cobrados este mes
          </p>
        </div>
      </div>

      {/* Cobro rápido */}
      <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-nexus-ink">
          <Wallet className="h-4 w-4" /> Cobro rápido
        </h2>
        <form action={cobrarPago} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            name="clienteId"
            required
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          >
            <option value="">¿A quién cobrás?</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <select
            name="planId"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          >
            <option value="">Mes libre (30 días)</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
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
          <select
            name="metodo"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          >
            {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "NEQUI", "OTRO"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="sm:col-span-2 lg:col-span-4 lg:justify-self-end">
            <button
              type="submit"
              className="rounded-lg bg-nexus-ink px-4 py-2 text-sm font-medium text-nexus-surface transition hover:opacity-85"
            >
              Registrar cobro
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximos vencimientos */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="text-sm font-semibold text-nexus-ink">Vencen esta semana</h2>
          {porVencer.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
              Nadie por vencer
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-nexus-border/70">
              {porVencer.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/modulos/clientes/${c.id}`} className="font-medium text-nexus-ink hover:underline">
                    {c.nombre}
                  </Link>
                  <span className="text-sm text-nexus-muted">
                    {c.plan ?? "—"} · {formatDate(c.periodoFin!)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Historial reciente */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-nexus-ink">Últimos cobros (30 días)</h2>
          {pagosRecientes.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
              Sin cobros aún — registrá el primero arriba
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-nexus-border/70">
              {pagosRecientes.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-nexus-ink">{p.cliente.nombre}</p>
                    <p className="text-xs text-nexus-muted">
                      {p.concepto} · {formatDate(p.pagadoEl)} · {p.metodo}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-nexus-green-text">
                    +{formatMoney(Number(p.monto))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Planes */}
      <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-nexus-ink">
          <Plus className="h-4 w-4" /> Planes de membresía
        </h2>
        {planes.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {planes.map((p) => (
              <div key={p.id} className="rounded-lg border border-nexus-border bg-nexus-bg p-4">
                <p className="font-semibold text-nexus-ink">{p.nombre}</p>
                <p className="text-sm text-nexus-muted">
                  {formatMoney(Number(p.precio))} · {p.duracionDias} días
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-nexus-muted">Todavía no hay planes — creá el primero:</p>
        )}
        <form action={crearPlan} className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            name="nombre"
            required
            placeholder="Ej: Mensual"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          />
          <input
            name="precio"
            required
            type="number"
            step="0.01"
            min="0"
            placeholder="Precio (COP)"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          />
          <input
            name="duracionDias"
            type="number"
            required
            defaultValue={30}
            placeholder="Días que cubre"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          />
          <button
            type="submit"
            className="rounded-lg border border-nexus-border px-4 py-2 text-sm font-medium text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-ink"
          >
            Crear plan
          </button>
        </form>
      </div>
    </div>
  );
}