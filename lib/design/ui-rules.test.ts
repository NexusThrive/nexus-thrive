import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Reglas del sistema de diseño que se pueden leer en el código
 * (DESIGN.md §3, docs/design/interaction-patterns.md). Lo que ya existía y
 * aún no se migró está en las listas de deuda: solo se achican. Si migras un
 * archivo, sácalo de la lista; si la prueba falla con un archivo nuevo, usa
 * el componente compartido en vez de agregarlo a la lista.
 */

const ROOT = process.cwd();

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(join(ROOT, path)).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.(stories|test)\.tsx?$/.test(name) ? [path] : [];
  });
}

const FILES = [...sources("app"), ...sources("components")].map((path) => ({
  path: relative(ROOT, join(ROOT, path)),
  text: readFileSync(join(ROOT, path), "utf8"),
}));

/** `window.confirm`/`alert` pendientes de pasar a `ConfirmDialog`/`useConfirm`. */
const LEGACY_WINDOW_CONFIRM = [
  "app/[tenant]/(app)/catalog/_components/items-bank.tsx",
  "app/[tenant]/(app)/crm/[id]/_components/access-card.tsx",
  "app/[tenant]/(app)/memberships/_components/membership-hold-sheet.tsx",
  "app/[tenant]/(app)/projects/[projectId]/_components/budget-workspace.tsx",
  "app/[tenant]/(app)/projects/[projectId]/_components/project-lifecycle.tsx",
  "app/[tenant]/(app)/tickets/_components/ticket-desk.tsx",
  "app/admin/crm/[id]/_components/lead-detail.tsx",
  "app/admin/equipo/_components/team-view.tsx",
  "app/admin/facturacion/_components/charge-sheet.tsx",
];

/** Usos del Dialog/Sheet de shadcn (deprecados) pendientes de `ResponsiveSheet`. */
const LEGACY_SHADCN_OVERLAY = [
  "app/admin/_components/suspend-dialog.tsx",
  "app/admin/_components/tenant-drawer.tsx",
  "components/organisms/command.tsx", // CommandDialog de la paleta del panel CEO
];

/** Superposiciones a pantalla completa propias que no son diálogos de formulario. */
const FULLSCREEN_ALLOWED = [
  "components/molecules/qr-scanner.tsx", // cámara a pantalla completa
  "components/organisms/command-palette.tsx", // paleta (cmdk sobre Radix Dialog)
  "components/organisms/onboarding/creation-cinematic.tsx", // cinemática del alta
  "components/organisms/dialog.tsx", // deprecado
  "components/organisms/sheet.tsx", // deprecado
];

const WINDOW_CONFIRM = /window\.(confirm|alert)\(/;
const SHADCN_OVERLAY = /from "@\/components\/organisms\/(dialog|sheet)"/;
const FULLSCREEN_OVERLAY = /fixed inset-0/;
// z-index numérico de Tailwind por encima de los adornos locales (z-0…z-20).
const RAW_Z_INDEX = /\bz-(?:\[\d{2,}\]|[3-9]\d)\b/;

function offenders(pattern: RegExp) {
  return FILES.filter((file) => pattern.test(file.text)).map((file) => file.path).sort();
}

describe("reglas del sistema de diseño", () => {
  test("sin window.confirm/alert fuera de la lista de deuda", () => {
    expect(offenders(WINDOW_CONFIRM)).toEqual([...LEGACY_WINDOW_CONFIRM].sort());
  });

  test("sin Dialog/Sheet de shadcn fuera de la lista de deuda", () => {
    expect(offenders(SHADCN_OVERLAY)).toEqual([...LEGACY_SHADCN_OVERLAY].sort());
  });

  test("sin modales hechos a mano (fixed inset-0)", () => {
    expect(offenders(FULLSCREEN_OVERLAY)).toEqual([...FULLSCREEN_ALLOWED].sort());
  });

  test("capas con tokens --z-*, no con números", () => {
    expect(offenders(RAW_Z_INDEX)).toEqual([]);
  });
});
