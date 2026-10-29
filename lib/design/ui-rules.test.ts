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
const LEGACY_WINDOW_CONFIRM: string[] = [];

/**
 * Quién puede usar Radix Dialog directo. Todo lo demás compone
 * `ResponsiveSheet`, `FormDialog`/`FormDrawer` o `ConfirmDialog`.
 */
const RADIX_DIALOG_ALLOWED = [
  "components/organisms/responsive-sheet.tsx", // la base de diálogos y paneles
  "components/organisms/command.tsx", // paleta del panel CEO (cmdk)
  "components/organisms/command-palette.tsx", // paleta del negocio (cmdk)
  "components/labs/pretty-modal/pretty-modal.tsx", // laboratorio de referencia (no se envía)
];

/** Superposiciones a pantalla completa propias que no son diálogos de formulario. */
const FULLSCREEN_ALLOWED = [
  "components/molecules/qr-scanner.tsx", // cámara a pantalla completa
  "components/organisms/command-palette.tsx", // paleta (cmdk sobre Radix Dialog)
  "components/organisms/command.tsx", // paleta del panel CEO (cmdk sobre Radix Dialog)
];

/** Único lugar con `<select>` nativo: el que el `Select` propio mantiene oculto para formularios. */
const NATIVE_SELECT_ALLOWED = ["components/atoms/select.tsx"];
const NATIVE_SELECT = /<select[\s>]/;

const WINDOW_CONFIRM = /window\.(confirm|alert)\(/;
const RADIX_DIALOG = /from "@radix-ui\/react-dialog"/;
const FULLSCREEN_OVERLAY = /fixed inset-0/;
// z-index numérico de Tailwind por encima de los adornos locales (z-0…z-20).
const RAW_Z_INDEX = /\bz-(?:\[\d{2,}\]|[3-9]\d)\b/;

function offenders(pattern: RegExp) {
  return FILES.filter((file) => pattern.test(file.text)).map((file) => file.path).sort();
}

describe("reglas del sistema de diseño", () => {
  test("sin <select> nativo: se usa el Select propio (components/atoms/select)", () => {
    // Los comentarios que mencionan `<select>` no cuentan: se ignoran las líneas de comentario.
    const code = FILES.filter((f) => f.text.split("\n").some((l) => NATIVE_SELECT.test(l) && !/^\s*(\*|\/\/|\/\*)/.test(l)))
      .map((f) => f.path)
      .sort();
    expect(code).toEqual([...NATIVE_SELECT_ALLOWED].sort());
  });

  test("sin window.confirm/alert fuera de la lista de deuda", () => {
    expect(offenders(WINDOW_CONFIRM)).toEqual([...LEGACY_WINDOW_CONFIRM].sort());
  });

  test("diálogos sobre la base compartida, no sobre Radix directo", () => {
    expect(offenders(RADIX_DIALOG)).toEqual([...RADIX_DIALOG_ALLOWED].sort());
  });

  test("sin modales hechos a mano (fixed inset-0)", () => {
    expect(offenders(FULLSCREEN_OVERLAY)).toEqual([...FULLSCREEN_ALLOWED].sort());
  });

  test("capas con tokens --z-*, no con números", () => {
    expect(offenders(RAW_Z_INDEX)).toEqual([]);
  });
});
