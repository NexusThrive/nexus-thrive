"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

/**
 * NAVBAR — menú de cuenta (acción GLOBAL): email + cerrar sesión.
 * Aquí crecerán configuración y soporte sin invadir el sidebar.
 */
export function MenuCuenta({ nombre, email }: { nombre: string; email: string }) {
  const [abierto, setAbierto] = useState(false);
  const iniciales = (nombre || email)
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg border border-nexus-border px-2.5 py-1.5 transition hover:border-nexus-gold/60 hover:bg-nexus-surface-alt"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-nexus-ink text-[11px] font-bold text-nexus-surface">
          {iniciales}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium text-nexus-ink sm:block">
          {nombre.split(" ")[0] ?? email}
        </span>
      </button>

      {abierto && (
        <>
          <button
            type="button"
            aria-hidden
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-nexus-border bg-nexus-surface shadow-lg">
            <div className="border-b border-nexus-border/70 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-nexus-ink">{nombre}</p>
              <p className="truncate text-xs text-nexus-muted">{email}</p>
            </div>
            <form action="/api/auth/signout" method="post">
              <input type="hidden" name="callbackUrl" value="/login" />
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-red-text"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}