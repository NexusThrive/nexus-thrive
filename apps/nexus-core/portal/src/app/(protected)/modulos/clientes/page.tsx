import { Users } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { getOrgActiva } from "@/lib/core/org";
import { crearFormatos } from "@/lib/shared/format";
import { crearCliente } from "@/lib/modulos/clientes/acciones";
import { getClientesDeOrg } from "@/lib/modulos/clientes/consultas";
import { getPlanesDeOrg } from "@/lib/modulos/planes/consultas";
import { ListaClientes } from "@/components/modulos/clientes/ListaClientes";

export const dynamic = "force-dynamic";

/**
 * Errores que las acciones devuelven por redirect. Antes no se leía ninguno:
 * `?error=nombre` rebotaba al listado sin explicar nada.
 */
const ERRORES: Record<string, string> = {
  nombre: "El nombre del socio es obligatorio.",
  fecha: "La fecha de nacimiento no es válida.",
  plan: "La membresía seleccionada no pertenece a este negocio. No se registró el socio.",
};

const ESTADO_CLASES: Record<string, string> = {
  ACTIVO: "bg-nexus-green-soft text-nexus-green-text",
  CONGELADO: "bg-nexus-surface-alt text-nexus-muted",
  VENCIDO: "bg-nexus-red-soft text-nexus-red-text",
};
const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  CONGELADO: "Congelado",
  VENCIDO: "Vencido",
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { org } = await getOrgActiva();
  // La moneda y el país los persiste el onboarding: el formato sigue a la org,
  // no a constantes del código.
  const presentacion = { moneda: org.moneda, pais: org.pais };
  const { formatDate } = crearFormatos(presentacion);

  const { error } = await searchParams;
  const errorMsg = error ? ERRORES[error] : undefined;

  const [clientes, planes] = await Promise.all([
    getClientesDeOrg(org.id),
    getPlanesDeOrg(org.id),
  ]);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-nexus-red-text/30 bg-nexus-red-soft px-4 py-3 text-sm text-nexus-red-text"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-nexus-ink">Clientes</h1>
          <p className="text-sm text-nexus-muted">{clientes.length} socios registrados</p>
        </div>
      </div>

      {/* Alta de cliente */}
      <form
        action={crearCliente}
        className="rounded-xl border border-nexus-border bg-nexus-surface p-5"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-nexus-ink">
          <Users className="h-4 w-4" /> Registrar socio
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="nombre"
            required
            placeholder="Nombre completo"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          />
          <input
            name="documento"
            placeholder="Cédula (opcional)"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          />
          <input
            name="telefono"
            placeholder="Teléfono (opcional)"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          />
          <input
            name="email"
            type="email"
            placeholder="Correo (opcional)"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          />
          <select
            name="planId"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          >
            <option value="">Sin membresía</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <input
            name="fechaNacimiento"
            type="date"
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
          />
          <textarea
            name="nota"
            placeholder="Nota (lesiones, alergias, preferencias…)"
            rows={1}
            className="rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold sm:col-span-2"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-nexus-ink px-4 py-2 text-sm font-medium text-nexus-surface transition hover:opacity-85"
          >
            Registrar socio
          </button>
        </div>
      </form>

      {/* Listado con búsqueda (cliente) */}
      <ListaClientes
        clientes={clientes.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          documento: c.documento,
          telefono: c.telefono,
          // Desde el Eje B el estado vive en la membresía: un cliente sin
          // membresía no tiene estado → "Sin membresía" (cliente genérico).
          estado: c.membresia?.estado ?? null,
          plan: c.plan?.nombre ?? null,
          vence: c.membresia?.periodoFin ? formatDate(c.membresia.periodoFin) : null,
          estadoClase: c.membresia?.estado
            ? ESTADO_CLASES[c.membresia.estado] ?? "bg-nexus-surface-alt text-nexus-muted"
            : "bg-nexus-surface-alt text-nexus-muted",
          estadoLabel: c.membresia?.estado ? ESTADO_LABEL[c.membresia.estado] ?? c.membresia.estado : "Sin membresía",
          ultimoPago: c.membresia?.pagos[0] ? formatDate(c.membresia.pagos[0].pagadoEl) : null,
        }))}
      />
    </div>
  );
}