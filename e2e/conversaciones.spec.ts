import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";
import { medirDesborde } from "./responsive-helpers";

/** HU-whatsapp-negocio-01: cada negocio envía y recibe por su propio número dentro de Nexus. */
test.describe("Conversaciones de WhatsApp del negocio", () => {
  test("muestra el hilo con los estados y responde dentro de la ventana de 24 h", async ({ page }) => {
    await openStory(page, "páginas-canales-conversaciones--default");
    await expect(page.getByText("Hola, quiero 40 camisetas con logo")).toBeVisible();
    await expect(page.getByText(/Leído/)).toBeVisible();
    await expect(page.getByText(/Pendiente de enviar con un toque \(Fuera de la ventana de 24 h\)/)).toBeVisible();
    await expect(page.getByText(/Puedes responder con texto libre/)).toBeVisible();
    await page.getByLabel("Tu respuesta").fill("Listo, te la envío");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.getByText("Mensaje enviado")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("fuera de la ventana avisa y deja el enlace para enviar con un toque", async ({ page }) => {
    await openStory(page, "páginas-canales-conversaciones--fuera-de-la-ventana");
    await expect(page.getByText(/Pasaron más de 24 h desde su último mensaje/).first()).toBeVisible();
    await page.getByLabel("Tu respuesta").fill("mensaje tarde");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.getByRole("link", { name: "Enviar con un toque en WhatsApp" })).toHaveAttribute("href", /wa\.me\/573001112233/);
  });

  test("sin conexión se explica y lleva a conectarla; sin conversaciones se explica; sin desborde a 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openStory(page, "páginas-canales-conversaciones--sin-conexion");
    await expect(page.getByRole("link", { name: "Conectar WhatsApp" })).toBeVisible();
    expect((await medirDesborde(page)).desborda).toBe(false);
    await openStory(page, "páginas-canales-conversaciones--sin-conversaciones");
    await expect(page.getByText("Aún no hay conversaciones")).toBeVisible();
  });
});
