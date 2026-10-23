// Capturas de historias de Storybook para los PR y la ayuda.
// Uso: node e2e/capturas.mjs <baseURL> <carpeta> <id>[@movil][#accion] …
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [base, out, ...shots] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const spec of shots) {
  const [idPart, action] = spec.split("#");
  const [id, mode] = idPart.split("@");
  const context = await browser.newContext(
    mode === "movil" ? { ...devices["Pixel 7"] } : { viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1 },
  );
  const page = await context.newPage();
  await page.goto(`${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`);
  await page.locator("#storybook-root").waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (action) {
    for (const step of action.split("+")) {
      if (step.startsWith("click:")) await page.getByRole("button", { name: step.slice(6) }).first().click();
      if (step.startsWith("fill:")) await page.getByRole("textbox").first().fill(step.slice(5));
    }
  }
  await page.waitForTimeout(800);
  const name = `${id}${mode ? "-" + mode : ""}${action ? "-abierto" : ""}.png`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]/g, "_");
  await page.screenshot({ path: `${out}/${name}` });
  console.log(name);
  await context.close();
}
await browser.close();
