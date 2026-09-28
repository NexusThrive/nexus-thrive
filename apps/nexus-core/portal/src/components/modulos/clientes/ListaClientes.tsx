"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface ClienteRow {
  id: string;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  /** null = cliente sin membresía (Eje B). */
  estado: string | null;
  plan: string | null;
  vence: string | null;
  ultimoPago: string | null;
  estadoClase: string;
  estadoLabel: string;
}

export function ListaClientes({ clientes }: { clientes: ClienteRow[] }) {
  const [q, setQ] = useState("");

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(t) ||
        (c.documento ?? "").toLowerCase().includes(t) ||
        (c.telefono ?? "").toLowerCase().includes(t)
    );
  }, [q, clientes]);

  return (
    <div className="rounded-xl border border-nexus-border bg-nexus-surface">
      <div className="flex items-center justify-between gap-4 p-4 pb-2">
        <h2 className="text-sm font-semibold text-nexus-ink">Socios</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, cédula o teléfono…"
          className="w-72 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-1.5 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="m-4 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-10 text-center text-sm text-nexus-muted">
          {clientes.length === 0
            ? "Todavía no hay socios. Registrá el primero arriba."
            : "Nadie coincide con la búsqueda."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-nexus-border/70 text-xs uppercase tracking-wider text-nexus-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Socio</th>
                <th className="px-4 py-2.5 font-medium">Membresía</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Vence</th>
                <th className="px-4 py-2.5 font-medium">Último pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-border/70">
              {filtrados.map((c) => (
                <tr key={c.id} className="transition hover:bg-nexus-surface-alt/60">
                  <td className="px-4 py-3">
                    <Link href={`/modulos/clientes/${c.id}`} className="font-medium text-nexus-ink hover:underline">
                      {c.nombre}
                    </Link>
                    <span className="mt-0.5 block text-xs text-nexus-muted">
                      {c.documento ?? "—"} {c.telefono ? `· ${c.telefono}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-nexus-muted">{c.plan ?? "Sin membresía"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.estadoClase}`}>
                      {c.estadoLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-nexus-muted">{c.vence ?? "—"}</td>
                  <td className="px-4 py-3 text-nexus-muted">{c.ultimoPago ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}