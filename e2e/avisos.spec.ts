import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";
import { medirDesborde } from "./responsive-helpers";

/** HU-whatsapp-negocio-02: avisos automáticos que cumplen las reglas de Meta. */
test.describe("Plantillas y avisos de WhatsApp", () => {
  test("explica las reglas, muestra el estado en Meta y valida el estado aprobado", async ({ page }) => {
    await openStory(page, "páginas-canales-plantillas-y-avisos--default");
    await expect(page.getByText(/Fuera de las 24 h desde el último mensaje del cliente/)).toBeVisible();
    await expect(page.getByText("Aprobada por Meta")).toBeVisible();
    await expect(page.getByText("En revisión en Meta")).toBeVisible();
    await expect(page.getByText("Apagada")).toBeVisible();
    await page.getByRole("button", { name: "Estado en Meta" }).nth(1).click();
    const d = page.getByRole("dialog", { name: "Estado en Meta" });
    await d.getByLabel("Estado").click();
    await page.getByRole("option", { name: "Aprobada por Meta" }).click();
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByText(/Escribe el nombre exacto de la plantilla en Meta/).first()).toBeVisible();
    await d.getByLabel(/Nombre de la plantilla en Meta/).fill("pedido_creado_v1");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Estado en Meta guardado")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("los avisos muestran lo enviado, lo listo con un toque y lo bloqueado por baja", async ({ page }) => {
    await openStory(page, "páginas-canales-plantillas-y-avisos--default");
    await page.getByRole("button", { name: /^Avisos/ }).click();
    await expect(page.getByText("Enviado", { exact: true })).toBeVisible();
    await expect(page.getByText("Listo para enviar con un toque").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Enviar con un toque en WhatsApp" })).toHaveAttribute("href", /wa\.me\/573105550000/);
    await expect(page.getByText("Bloqueado por baja")).toBeVisible();
    await expect(page.getByText(/El contacto pidió no recibir más avisos/)).toBeVisible();
    await page.getByRole("button", { name: "Procesar avisos ahora" }).click();
    await expect(page.getByText(/listos para enviar con un toque/).last()).toBeVisible();
  });

  test("sin conexión se explica y a 320 px no hay desplazamiento horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openStory(page, "páginas-canales-plantillas-y-avisos--sin-conexion");
    await expect(page.getByRole("link", { name: "Conectar WhatsApp" })).toBeVisible();
    expect((await medirDesborde(page)).desborda).toBe(false);
  });
});
