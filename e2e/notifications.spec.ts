import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Notificaciones: pendientes y leídas, aviso a los ~5 s de la acción y regreso a la campana. */
test.describe("Centro de notificaciones", () => {
  test("una acción genera la notificación: sale el aviso unos 5 s después y regresa a la campana", async ({ page }) => {
    await openStory(page, "organismos-notificationcenter--llega-una-nueva");
    await page.evaluate(() => window.localStorage.setItem("sb:notifications-llega", new Date().toISOString()));
    await page.reload();
    await page.waitForTimeout(500);
    const aviso = page.getByRole("status").filter({ hasText: "Pago recibido · $ 120.000" });
    await expect(aviso).toHaveCount(0); // lo que ya estaba al cargar no avisa
    await page.getByRole("button", { name: /Registrar un pago/ }).click();
    // No sale de inmediato: unos 5 segundos después de la acción.
    await page.waitForTimeout(2500);
    await expect(aviso).toHaveCount(0);
    await expect(aviso).toBeVisible({ timeout: 6000 });
    await expectNoAxeViolations(page);
    // A los pocos segundos se encoge hacia la campana y desaparece.
    await expect(aviso).toHaveCount(0, { timeout: 9000 });
    await expect(page.getByRole("button", { name: /Notificaciones, \d+ nuevas/ })).toBeVisible();
  });

  test("las pestañas separan pendientes y leídas", async ({ page }) => {
    await openStory(page, "organismos-notificationcenter--con-nuevas");
    await page.evaluate(() => window.localStorage.removeItem("sb:notifications"));
    await page.reload();
    await page.getByRole("button", { name: /Notificaciones/ }).click();
    await expect(page.getByRole("tab", { name: /Pendientes/ })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "Marcar leídas" }).click();
    await page.getByRole("tab", { name: /Leídas/ }).click();
    await expect(page.getByRole("link", { name: /Pago recibido/ })).toBeVisible();
    await page.getByRole("tab", { name: /Pendientes/ }).click();
    await expect(page.getByText("Estás al día")).toBeVisible();
  });
});

test("Breadcrumbs: ruta con la página actual sin enlace", async ({ page }) => {
  await openStory(page, "moléculas-breadcrumbs--detalle");
  const nav = page.getByRole("navigation", { name: "Ruta de navegación" });
  await expect(nav.getByRole("link", { name: "Socios" })).toHaveAttribute("href", "/gym-norte/crm");
  await expect(nav.getByText("Detalle")).toHaveAttribute("aria-current", "page");
  await expectNoAxeViolations(page);
});
