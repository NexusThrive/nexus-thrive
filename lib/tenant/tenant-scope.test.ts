import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Bloque A.4: todo repositorio de `lib/` que lee o escribe una tabla de un
 * negocio (las que tienen `tenantId` en el contrato) filtra por `tenantId` en
 * su `.where({ ... })`. Se lee el código: la prueba falla con el archivo, la
 * línea y la tabla si una consulta nueva lo olvida.
 *
 * Quedan fuera, con motivo:
 * - `lib/ops/` y `lib/admin/`: el panel de NEXUS opera entre negocios a
 *   propósito y cada acción exige un permiso del equipo (`requireStaff`).
 * - `SCOPED_ELSEWHERE`: consultas donde el negocio todavía no se conoce o ya
 *   se validó antes. Esta lista solo se achica.
 */

const ROOT = process.cwd();
const PLATFORM_DIRS = ["lib/ops/", "lib/admin/"];

/**
 * Procesos de plataforma que por diseño cruzan negocios: el despachador del
 * outbox lee eventos y entregas de todos y luego opera por id de filas ya leídas.
 */
const PLATFORM_FILES = ["lib/events/dispatcher.ts", "lib/providers/inbound.ts"];

const SCOPED_ELSEWHERE: { file: string; model: string; why: string }[] = [
  { file: "lib/files/stored-files.ts", model: "Attachment", why: "Se pide por id desde una URL; después se exige membresía del negocio del archivo." },
  { file: "lib/files/stored-files.ts", model: "ApuImage", why: "Igual que Attachment." },
  { file: "lib/business/finance-db.ts", model: "Payment", why: "Recibo público por token firmado y referencia del proveedor, única en toda la plataforma (solo sí/no)." },
  { file: "lib/business/team-db.ts", model: "TenantInvite", why: "Invitaciones a un correo en cualquier negocio, al entrar con ese correo verificado." },
  { file: "lib/tenant/membership.ts", model: "User", why: "Resuelve el negocio de una cuenta de la sesión (clerkUserId)." },
  { file: "lib/onboarding/prefill.ts", model: "User", why: "Membresías de la cuenta de la sesión para reanudar el alta." },
  { file: "lib/onboarding/onboarding-db.ts", model: "User", why: "En el piloto, una cuenta = un negocio: se busca por la cuenta." },
  { file: "lib/api/keys.ts", model: "ApiKey", why: "Autenticar: se busca por el hash de la llave (única en la plataforma); de ahí sale el negocio." },
  { file: "lib/payments/intents-db.ts", model: "PaymentIntent", why: "Enlace público de cobro: se busca por su código aleatorio (único en la plataforma) y solo devuelve negocio, valor, descripción y estado." },
  { file: "lib/store/store-db.ts", model: "SiteConfig", why: "Tienda pública: se resuelve el negocio por la dirección del sitio (única en la plataforma); todo lo demás va por su tenantId." },
  { file: "lib/store/store-db.ts", model: "StoreOrder", why: "Cron de carritos abandonados: recorre los pedidos sin pagar de todos los negocios y opera por id de filas ya leídas." },
  { file: "lib/site/site-db.ts", model: "SiteConfig", why: "Sitio público: se busca por su dirección (única en la plataforma) y la unicidad de la dirección al guardar; el negocio se resuelve de ahí." },
  { file: "lib/construction/shared.ts", model: "LookaheadTask", why: "Hijas de un plan leído con tenantId (la fila del plan no lo trae)." },
  { file: "lib/construction/shared.ts", model: "WeeklyCommitment", why: "Igual que LookaheadTask." },
  { file: "lib/construction/shared.ts", model: "BudgetChapter", why: "sumBudgetDirect recibe un presupuesto ya leído con tenantId." },
  { file: "lib/construction/shared.ts", model: "ProjectBudget", why: "recalcBudgetTotals recibe un presupuesto ya leído con tenantId." },
];

function tenantModels(): Set<string> {
  const contract = readFileSync(join(ROOT, "prisma/contract.prisma"), "utf8");
  const models = new Set<string>();
  for (const m of contract.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)) {
    if (/^\s+tenantId\s/m.test(m[2])) models.add(m[1]);
  }
  return models;
}

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(join(ROOT, path)).isDirectory()) return sources(path);
    return name.endsWith(".ts") && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("aislamiento por negocio en los repositorios", () => {
  const models = tenantModels();

  test("el contrato tiene tablas de negocio", () => {
    expect(models.size).toBeGreaterThan(40);
  });

  test("cada consulta a una tabla de negocio filtra por tenantId", () => {
    const offenders: string[] = [];
    for (const file of sources("lib")) {
      if (PLATFORM_DIRS.some((dir) => file.startsWith(dir)) || PLATFORM_FILES.includes(file)) continue;
      const text = readFileSync(join(ROOT, file), "utf8");
      for (const m of text.matchAll(/\.orm\.public\.(\w+)\s*\.where\(\s*\{([^{}]*)\}/g)) {
        const [, model, filter] = m;
        if (!models.has(model) || /\btenantId\b/.test(filter)) continue;
        if (SCOPED_ELSEWHERE.some((e) => e.file === file && e.model === model)) continue;
        const line = text.slice(0, m.index).split("\n").length;
        offenders.push(`${file}:${line} ${model}.where({ ${filter.trim()} })`);
      }
    }
    expect(offenders, "agrega tenantId al where (o explica la excepción en SCOPED_ELSEWHERE)").toEqual([]);
  });

  test("cada excepción sigue existiendo (la lista solo se achica)", () => {
    for (const e of SCOPED_ELSEWHERE) {
      const text = readFileSync(join(ROOT, e.file), "utf8");
      expect(text, `${e.file} ya no consulta ${e.model} sin tenantId: quítalo de la lista`).toMatch(
        new RegExp(`\\.orm\\.public\\.${e.model}\\s*\\.where\\(\\s*\\{(?![^{}]*\\btenantId\\b)[^{}]*\\}`),
      );
    }
  });
});
