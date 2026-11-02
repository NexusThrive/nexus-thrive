/**
 * Crea el negocio de demostración recorriendo el onboarding real con la sesión de `sesion-demo.mjs`.
 * Uso: node scripts/presentacion/crear-negocio.mjs <carpeta-de-salida> <enlace> [nombre]
 * Con una cuenta que ya tiene negocios, el onboarding sigue disponible en /onboarding?nuevo=1.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3001";
const out = process.argv[2];
const SLUG = process.argv[3];
const NAME = process.argv[4] ?? "Aurora Fitness Club";
if (!SLUG) throw new Error("Falta el enlace del negocio (por ejemplo aurora-pc).");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: "es-CO", storageState: `${out}/estado.json` });
const page = await ctx.newPage();
const shot = (n) => page.screenshot({ path: `${out}/crear-${n}.png` });
try {
  await page.goto(`${BASE}/onboarding?nuevo=1`, { waitUntil: "networkidle", timeout: 120000 });
  for (const name of [/Continuar/, /Continuar/, /Comenzar/]) await page.getByRole("button", { name }).first().click().then(() => page.waitForTimeout(1200));
  await page.getByRole("button", { name: /Empresa \/ Negocio/ }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByPlaceholder("Nombre de tu negocio").fill(NAME);
  await page.getByPlaceholder("mi-negocio").fill(SLUG);
  await page.getByRole("button", { name: "Gimnasio", exact: true }).click();
  await page.getByRole("button", { name: /2 a 5 personas/ }).click();
  await page.getByPlaceholder("Número de NIT").fill("900123456-7");
  await page.getByPlaceholder("Calle y número").fill("REMOTE");
  await page.waitForTimeout(1500); // disponibilidad del enlace
  await shot("negocio");
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.waitForTimeout(1500);
  await shot("acceso");
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.waitForTimeout(1500);
  await shot("confirmar");
  await page.getByRole("button", { name: /Crear|Confirmar|Entrar|Empezar/ }).last().click();
  // Cinemática de creación: «Tu negocio está listo» → Continuar.
  await page.getByRole("button", { name: /^(Continuar|Entrar a mi negocio)/ }).last().click({ timeout: 90000 });
  await page.waitForURL((u) => !u.pathname.startsWith("/onboarding"), { timeout: 90000 });
  await page.waitForTimeout(3000);
  console.log("Negocio creado →", page.url());
  await ctx.storageState({ path: `${out}/estado.json` });
  if (!page.url().includes(SLUG)) throw new Error(`Se esperaba el negocio ${SLUG}`);
} catch (error) {
  await shot("error");
  console.error(String(error).slice(0, 400));
  process.exitCode = 1;
} finally {
  await browser.close();
}
