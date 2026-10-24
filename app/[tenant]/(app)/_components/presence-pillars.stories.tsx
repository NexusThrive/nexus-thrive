import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../.storybook/decorators";
import PresencePillars from "./presence-pillars";

const pillars = [
  { key: "site" as const, label: "Sitio", weight: 30, score: 85, verified: true, hint: "Tu sitio responde y está optimizado." },
  { key: "onlineSales" as const, label: "Venta en línea", weight: 30, score: 70, verified: true, hint: "Publica productos, conecta una pasarela y recibe tu primer cobro en línea." },
  { key: "reputation" as const, label: "Reputación", weight: 15, score: null, verified: true, hint: "Sin medir: se mide cuando conectes tus reseñas." },
  { key: "attribution" as const, label: "Atribución", weight: 15, score: null, verified: true, hint: "Sin medir: se mide cuando registres de dónde llegan tus ventas." },
  { key: "basics" as const, label: "Datos básicos", weight: 10, score: 90, verified: false, hint: "Identidad, WhatsApp, ubicación y catálogo completos." },
];
const series = Array.from({ length: 12 }, (_, i) => ({ day: `2026-10-${String(i + 10).padStart(2, "0")}`, score: 40 + i * 2 }));

const meta = {
  title: "Páginas/Presencia/Pilares (fase A)",
  component: PresencePillars,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Presencia v2, fase A: visibilidad verificada por pilares con su tendencia. Lo que aún no se mide se muestra «Sin medir» (no se rellena) y la cobertura dice cuánto de la barra ya es medible." } } },
  args: { pillars, phase: { score: 81, coverage: 70, phase: "A" as const, measured: 3 }, trend: { direction: "up" as const, delta: 18, days: 30, series } },
} satisfies Meta<typeof PresencePillars>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sube: Story = {};
export const Baja: Story = { args: { trend: { direction: "down", delta: -9, days: 30, series: [...series].reverse() } } };
export const PrimerDia: Story = { args: { trend: { direction: "flat", delta: 0, days: 0, series: [] } } };
export const ListaParaFaseB: Story = { args: { phase: { score: 92, coverage: 100, phase: "B_READY", measured: 5 }, pillars: pillars.map((p) => ({ ...p, score: p.score ?? 90, hint: "Medido con datos reales." })) } };
