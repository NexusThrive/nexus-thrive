import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

/** Las historias se abren con la hoja ya visible: no se espera a que la raíz esté visible (Radix la oculta). */
const open = (page: import("@playwright/test").Page, id: string) => page.goto(`/iframe.html?id=${id}&viewMode=story`);

/** Mini-modales de creación: se registra sin salir de la pantalla y siempre hay salida al panel completo. */
test.describe("Mini-modales de creación", () => {
  test("el cobro no tiene panel completo (no hay uno más grande), se confirma deslizando y pasa axe", async ({ page }) => {
    await open(page, "organismos-finanzas-paymentsheet--cobro");
    const dialog = page.getByRole("dialog", { name: "Registrar pago" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Abrir en el panel completo/ })).toHaveCount(0);
    await dialog.getByRole("button", { name: "5", exact: true }).click();
    await dialog.getByRole("button", { name: "000", exact: true }).click();
    // Alternativa sin arrastrar: Enter en el asa del deslizador.
    await dialog.getByRole("button", { name: /^Cobrar \$ 5\.000\. Desliza/ }).press("Enter");
    // El modal se cierra y el comprobante sale abajo a la derecha.
    await expect(page.getByText("Comprobante generado")).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("el gasto ofrece «Abrir en el panel completo» y pasa axe", async ({ page }) => {
    await open(page, "organismos-finanzas-expensesheet--mini-modal");
    const dialog = page.getByRole("dialog", { name: "Registrar gasto" });
    await expect(dialog.getByRole("link", { name: /Abrir en el panel completo/ })).toHaveAttribute("href", "/gym-norte/finance?nuevo=gasto");
    await expectNoAxeViolations(page);
  });

  test("sin mini-modal (la hoja normal) no aparece el enlace", async ({ page }) => {
    await open(page, "organismos-finanzas-paymentsheet--cobro");
    await expect(page.getByRole("dialog", { name: "Registrar pago" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Abrir en el panel completo/ })).toHaveCount(0);
  });
});

test("QuickActionLink: el clic normal abre el mini-modal; Ctrl-clic y las acciones sin mini-modal no se interceptan", async ({ page }) => {
  await page.goto("/iframe.html?id=organismos-quickactionlink--default&viewMode=story");
  await page.locator("#storybook-root").waitFor();
  const opened = page.getByTestId("opened");
  await expect(opened).toContainText("ninguno");

  await page.getByRole("link", { name: "Registrar pago" }).click();
  await expect(opened).toHaveText("Mini-modales abiertos: payment");

  // Ctrl+clic: el comportamiento normal del enlace (no abre el mini-modal).
  await page.getByRole("link", { name: "Registrar pago" }).click({ modifiers: ["Control"] });
  await expect(opened).toHaveText("Mini-modales abiertos: payment"); // sigue siendo uno solo

  // Sin mini-modal: no se intercepta (sigue siendo un enlace a su sección); en Storybook el router es un doble y no cambia la URL.
  await page.getByRole("link", { name: "Nueva reserva" }).click();
  await expect(opened).toHaveText("Mini-modales abiertos: payment");
  await expect(page.getByRole("link", { name: "Nueva reserva" })).toHaveAttribute("href", "#panel-completo-reserva");
});

test("desde «Crear» de la navbar el cobro se abre sin salir de la pantalla", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 768, "El botón «Crear» de la navbar es de PC");
  await page.goto("/iframe.html?id=plantillas-tenantshell--desktop-sistema&viewMode=story");
  await page.locator("#storybook-root").waitFor();
  const before = page.url();
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await page.getByRole("menuitem", { name: /Registrar pago/ }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar pago" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Abrir en el panel completo/ })).toHaveCount(0);
  expect(page.url()).toBe(before); // no navegó
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("el gasto y el socio nuevo también se crean en un mini-modal desde «Crear»", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 768, "El botón «Crear» de la navbar es de PC");
  await page.goto("/iframe.html?id=plantillas-tenantshell--desktop-sistema&viewMode=story");
  await page.locator("#storybook-root").waitFor();

  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await page.getByRole("menuitem", { name: /Registrar gasto/ }).click();
  const gasto = page.getByRole("dialog", { name: "Registrar gasto" });
  await expect(gasto.getByRole("link", { name: /Abrir en el panel completo/ })).toHaveAttribute("href", "/constructora/finanzas?nuevo=gasto");
  await page.keyboard.press("Escape");
  await expect(gasto).toHaveCount(0);

  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await page.getByRole("menuitem", { name: /Nuevo cliente/ }).click();
  const cliente = page.getByRole("dialog", { name: /Nuevo cliente/ });
  await expect(cliente.getByRole("link", { name: /Abrir en el panel completo/ })).toHaveAttribute("href", "/constructora/contactos/nuevo");
});
