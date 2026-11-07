import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** HU-wompi-negocio-01: cada negocio conecta su propio Wompi desde Integraciones. */
test.describe("Wompi por negocio", () => {
  test("conectar valida la llave y los secretos, y avisa el resultado", async ({ page }) => {
    await openStory(page, "páginas-sistema-integraciones-wompi--sin-conectar");
    await page.getByRole("button", { name: "Conectar Wompi" }).click();
    const dialog = page.getByRole("dialog", { name: "Conectar Wompi" });
    await dialog.getByLabel(/Llave pública/).fill("llave-cualquiera");
    await dialog.getByLabel(/Secreto de integridad/).fill("int");
    await dialog.getByLabel(/Secreto de eventos/).fill("evt");
    await dialog.getByRole("button", { name: "Conectar" }).click();
    await expect(dialog.getByText(/empieza por pub_prod_ o pub_test_/).first()).toBeVisible();
    await dialog.getByLabel(/Llave pública/).fill("pub_test_abc123");
    await dialog.getByRole("button", { name: "Conectar" }).click();
    await expect(dialog.getByText(/empieza por test_integrity_/).first()).toBeVisible();
    await dialog.getByLabel(/Secreto de integridad/).fill("test_integrity_abc");
    await dialog.getByRole("button", { name: "Conectar" }).click();
    await expect(page.getByText(/Wompi conectado en pruebas/)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("conectado muestra la URL de eventos y pide confirmar antes de desconectar", async ({ page }) => {
    await openStory(page, "páginas-sistema-integraciones-wompi--conectado");
    await expect(page.getByText("/api/webhooks/providers/wompi/c1")).toBeVisible();
    await expect(page.getByRole("button", { name: "Conectar Wompi" })).toHaveCount(0);
    await page.getByRole("button", { name: "Desconectar" }).click();
    const confirm = page.getByRole("dialog", { name: "¿Desconectar Wompi?" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Desconectar" }).click();
    await expect(page.getByText("Pasarela desconectada")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("configurar la comisión valida la tarifa y avisa el resultado", async ({ page }) => {
    await openStory(page, "páginas-sistema-integraciones-wompi--conectado");
    await page.getByRole("button", { name: "Configurar comisión" }).click();
    const d = page.getByRole("dialog", { name: "Comisión de Wompi" });
    await d.getByLabel(/Porcentaje sobre el valor/).fill("45");
    await d.getByRole("button", { name: "Guardar tarifa" }).click();
    await expect(d.getByText(/no pueden pasar de 30/).first()).toBeVisible();
    await d.getByLabel(/Porcentaje sobre el valor/).fill("2.65");
    await d.getByRole("button", { name: "Guardar tarifa" }).click();
    await expect(page.getByText(/Tarifa guardada/)).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
