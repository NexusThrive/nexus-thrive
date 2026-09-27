"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

/**
 * NAVBAR — menú de cuenta (acción GLOBAL): email + cerrar sesión.
 * Aquí crecerán configuración y soporte sin invadir el sidebar.
 *
 * LOGOUT: va por `signOut()` de next-auth, NO por un <form method="post">
 * contra /api/auth/signout. Ese form sin `csrfToken` hacía que next-auth
 * respondiera con un redirect a /api/auth/signout?csrf=true: el botón
 * "Cerrar sesión" NO cerraba la sesión y mandaba al usuario a una página
 * de next-auth sin estilo. signOut() pide el token y lo manda solo.
 */
export function MenuCuenta({ nombre, email }: { nombre: string; email: string }) {
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
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
            <button
              type="button"
              disabled={saliendo}
              onClick={async () => {
                setSaliendo(true);
                await signOut({ callbackUrl: "/login" });
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-red-text disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {saliendo ? "Cerrando…" : "Cerrar sesión"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}