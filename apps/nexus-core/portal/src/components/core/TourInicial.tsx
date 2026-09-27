"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Receipt,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button, Logo } from "@nexus/ui";

/**
 * Tour de bienvenida (side-out): después del onboarding, el sistema
 * aparece poco a poco — una guía paso a paso de las 4 secciones + el
 * checklist de arranque. Se guarda en localStorage para no repetirse.
 */

const PASOS = [
  {
    titulo: "Dashboard",
    icono: LayoutDashboard,
    texto:
      "Este es tu panel: cuánto entra, cuánto sale y quién te debe. Todo se actualiza solo mientras usás Nexus — sin digitar nada a mano.",
  },
  {
    titulo: "Clientes",
    icono: Users,
    texto:
      "Cargá a tus socios: nombre, plan y vencimiento. El estado (activo, vencido, congelado) se marca solo según los pagos.",
  },
  {
    titulo: "Pagos",
    icono: Wallet,
    texto:
      "Cobrá membresías en 3 toques. Nexus recuerda los vencimientos y el dashboard te avisa quién renueva esta semana.",
  },
  {
    titulo: "Gastos",
    icono: Receipt,
    texto:
      "Anotá lo que sale: arriendo, nómina, servicios. Ahí el panel cruza ingresos y egresos para que veas la foto real del mes.",
  },
  {
    titulo: "Tu arranque",
    icono: CheckCircle2,
    texto:
      "Para que tu panel empiece a hablar: cargá tu primer cliente, hacé tu primer cobro y anotá tu primer gasto. Cada sección tiene su botón.",
  },
];

const KEY = "nexus:tour:visto";

export function TourInicial({ abrir }: { abrir: boolean }) {
  const [visible, setVisible] = useState(false);
  const [paso, setPaso] = useState(0);
  const ultimo = paso === PASOS.length - 1;
  const actual = (PASOS[paso] ?? PASOS[0])!;
  const Icono = actual.icono;

  useEffect(() => {
    if (!abrir) return;
    if (localStorage.getItem(KEY) === "1") return;
    setVisible(true);
  }, [abrir]);

  function cerrar() {
    setVisible(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* modo privado: se repite, no importa */
    }
  }

  function siguiente() {
    if (ultimo) cerrar();
    else setPaso((p) => p + 1);
  }

  return (
    <>
      {/* Fondo suave para enfocar el panel detrás */}
      {visible && <div className="fixed inset-0 z-40 bg-nexus-ink/20" aria-hidden />}

      {/* Side-out */}
      <aside
        aria-label="Guía de Nexus"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-nexus-border bg-nexus-surface shadow-2xl transition-transform duration-300 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-nexus-border/70 px-5 py-4">
          <Logo size="sm" />
          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg p-1.5 text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-ink"
            aria-label="Cerrar guía"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-1 flex-col justify-center px-6 py-8">
          <div className="flex items-center justify-between text-xs text-nexus-muted">
            <span>
              Paso {paso + 1} de {PASOS.length}
            </span>
            <span className="font-medium text-nexus-gold-text">Guía de Nexus</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nexus-border/50">
            <div
              className="h-full rounded-full bg-nexus-gold transition-all"
              style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
            />
          </div>

          <div className="mt-10 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-nexus-gold/15">
              <Icono className="h-7 w-7 text-nexus-gold" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-nexus-ink">{actual.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed text-nexus-muted">{actual.texto}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-nexus-border/70 px-5 py-4">
          <Button size="lg" className="w-full" onClick={siguiente}>
            {ultimo ? "Empezar" : "Siguiente"}
            {!ultimo && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPaso((p) => Math.max(p - 1, 0))}
              disabled={paso === 0}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-ink disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
            <button
              type="button"
              onClick={cerrar}
              className="rounded-lg px-3 py-2 text-sm font-medium text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-ink"
            >
              Saltar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}