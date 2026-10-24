import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Cobros en línea: enlaces, confirmación, reembolsos y conciliación. */
test.describe("Cobros en línea", () => {
  test("lista con estado y el enlace se comparte con QR, enlace y botón de pago", async ({ page }) => {
    await openStory(page, "páginas-dinero-cobros-en-línea--default");
    await expect(page.getByText("Matrícula anual")).toBeVisible();
    await expect(page.getByText("Pagado")).toBeVisible();
    await expect(page.getByText("Vencido")).toBeVisible();
    await page.getByRole("button", { name: "Compartir" }).click();
    const dialog = page.getByRole("dialog", { name: "Compartir cobro" });
    await expect(dialog.getByLabel("Enlace de cobro", { exact: true })).toHaveValue(/https:\/\/app\.nexus\.co\/pay\/ref1/);
    await expect(dialog.getByRole("img", { name: "QR del enlace de cobro" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Copiar botón de pago/ })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("crear cobro valida el valor", async ({ page }) => {
    await openStory(page, "páginas-dinero-cobros-en-línea--default");
    await page.getByRole("button", { name: "Nuevo cobro" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cobro" });
    await dialog.getByLabel(/Valor/).fill("500");
    await dialog.getByLabel(/Qué se cobra/).fill("Algo");
    await dialog.getByRole("button", { name: "Crear enlace" }).click();
    await expect(dialog.getByText(/valor mínimo/).first()).toBeVisible();
    await dialog.getByLabel(/Valor/).fill("150000");
    await dialog.getByRole("button", { name: "Crear enlace" }).click();
    await expect(page.getByText("Enlace de cobro creado")).toBeVisible();
  });

  test("confirmar a mano pide evidencia y reembolsar no pasa de lo cobrado", async ({ page }) => {
    await openStory(page, "páginas-dinero-cobros-en-línea--default");
    await page.getByRole("button", { name: "Confirmar pago" }).click();
    const c = page.getByRole("dialog", { name: "Confirmar pago a mano" });
    await c.getByLabel(/Referencia/).fill("ab");
    await c.getByRole("button", { name: "Confirmar pago" }).click();
    await expect(c.getByText(/evidencia de la transferencia/).last()).toBeVisible();
    await c.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: "Reembolsar" }).click();
    const r = page.getByRole("dialog", { name: "Reembolsar" });
    await r.getByLabel(/Valor a reembolsar/).fill("200000");
    await r.getByLabel(/Motivo/).fill("Error");
    await r.getByRole("button", { name: "Registrar reembolso" }).click();
    await expect(r.getByText("Solo se puede reembolsar 150.000.").first()).toBeVisible();
  });

  test("conciliación: muestra las diferencias del día", async ({ page }) => {
    await openStory(page, "páginas-dinero-cobros-en-línea--default");
    await page.getByRole("button", { name: /Conciliación/ }).click();
    await page.getByLabel(/Reporte del proveedor/).fill("evt_dif, 44000\nevt_extra, 9000");
    await page.getByRole("button", { name: "Conciliar" }).click();
    const table = page.getByRole("table", { name: /Diferencias de la conciliación/ });
    await expect(table.getByRole("row", { name: /evt_dif.*no coincide/ })).toBeVisible();
    await expect(table.getByRole("row", { name: /evt_extra.*NEXUS no lo tiene/ })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("con varias pasarelas conectadas se elige con cuál cobrar", async ({ page }) => {
    await openStory(page, "páginas-dinero-cobros-en-línea--dos-pasarelas");
    await page.getByRole("button", { name: "Nuevo cobro" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cobro" });
    await expect(dialog.getByLabel(/Pasarela/)).toHaveValue("wompi");
    await expect(dialog.getByRole("option", { name: "Pasarela de prueba" })).toBeAttached();
  });
});
