import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Facturas y notas crédito/débito: pantalla completa (modal avanzado) + modales pequeños. */
test.describe("Documentos en pantalla completa", () => {
  test("la factura se ve completa, con su estilo, impuestos, retenciones y saldo", async ({ page }) => {
    await openStory(page, "páginas-finanzas-facturación-y-notas--factura-en-pantalla-completa");
    const viewer = page.getByRole("dialog", { name: /Cuenta de cobro CC-000012/ });
    await expect(viewer).toBeVisible();
    const box = await viewer.boundingBox();
    const vp = page.viewportSize()!;
    expect(box!.width).toBeGreaterThanOrEqual(vp.width - 1);
    expect(box!.height).toBeGreaterThanOrEqual(vp.height - 1);
    await expect(viewer.getByText("Gimnasio Atlas").first()).toBeVisible();
    await expect(viewer.getByText(/Retención · Retefuente servicios 4 %/)).toBeVisible();
    await expect(viewer.getByText("Saldo por cobrar")).toBeVisible();
    await expect(viewer.getByRole("region", { name: "Documentos relacionados" })).toContainText("NC-000003");
    await expectNoAxeViolations(page);
  });

  test("desde la factura se abre la nota crédito y se vuelve al documento afectado", async ({ page }) => {
    await openStory(page, "páginas-finanzas-facturación-y-notas--factura-en-pantalla-completa");
    await page.getByRole("button", { name: "NC-000003" }).click();
    const viewer = page.getByRole("dialog", { name: /Nota crédito NC-000003/ });
    await expect(viewer.getByText("Total a favor")).toBeVisible();
    await expect(viewer.getByText("Acuerdo comercial")).toBeVisible();
    await viewer.getByRole("button", { name: "CC-000012" }).click();
    await expect(page.getByRole("dialog", { name: /Cuenta de cobro CC-000012/ })).toBeVisible();
  });

  test("modal pequeño: la nota débito se emite encima del documento y valida el valor", async ({ page }) => {
    await openStory(page, "páginas-finanzas-facturación-y-notas--factura-en-pantalla-completa");
    await page.getByRole("button", { name: "Nota débito" }).click();
    const small = page.getByRole("dialog", { name: "Nota débito" });
    await small.getByLabel(/Concepto/).fill("Intereses de mora");
    await small.getByRole("button", { name: "Emitir nota débito" }).click();
    await expect(small.getByText("Escribe un valor mayor que cero.")).toBeVisible();
    await small.getByLabel(/Valor/).fill("50000");
    await small.getByLabel(/Motivo/).fill("Pago tardío");
    await small.getByRole("button", { name: "Emitir nota débito" }).click();
    await expect(page.getByText("Nota débito N.º 4 emitida")).toBeVisible();
  });

  test("la lista separa las notas y abre el visor al tocar un documento", async ({ page }) => {
    await openStory(page, "páginas-finanzas-facturación-y-notas--lista");
    await page.getByRole("button", { name: /^Notas/ }).click();
    await expect(page.getByRole("button", { name: /ND-000001/ })).toBeVisible();
    await page.getByRole("button", { name: /NC-000003/ }).click();
    await expect(page.getByRole("dialog", { name: /Nota crédito NC-000003/ })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
