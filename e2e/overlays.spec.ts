import { expect, test } from "@playwright/test";
import { openStory } from "./helpers";

const isMobile = (name: string) => name === "movil";

test.describe("FormDialog", () => {
  test("abre, enfoca, cierra con Escape y devuelve el foco", async ({ page }, info) => {
    await openStory(page, "organismos-formsheet--dialog");
    const trigger = page.getByRole("button", { name: "Nuevo cliente" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await expect(dialog).toBeVisible();
    if (isMobile(info.project.name)) {
      // En móvil no se abre el teclado sin pedirlo: el foco va al panel.
      await expect(dialog).toBeFocused();
    } else {
      await expect(dialog.getByLabel(/Nombre completo/)).toBeFocused();
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("el foco queda atrapado dentro del diálogo", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const inside = await dialog.evaluate((el) => el.contains(document.activeElement));
      expect(inside).toBe(true);
    }
  });

  test("datos inválidos: muestra el error, marca el campo y lo enfoca", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await dialog.getByLabel(/Correo electrónico/).fill("ana@ejemplo.com");
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Revisa los campos marcados");
    const name = dialog.getByLabel(/Nombre completo/);
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toBeFocused();
    await expect(dialog.getByText("Escribe el nombre del cliente.")).toBeVisible();
    // Lo escrito no se pierde.
    await expect(dialog.getByLabel(/Correo electrónico/)).toHaveValue("ana@ejemplo.com");
  });

  test("envío fallido: sigue abierto con el mensaje y conserva lo escrito", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await dialog.getByLabel(/Nombre completo/).fill("caida");
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(dialog.getByRole("alert")).toContainText("No se pudo guardar");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/Nombre completo/)).toHaveValue("caida");
  });

  test("envío válido: cierra, confirma y devuelve el foco", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    const trigger = page.getByRole("button", { name: "Nuevo cliente" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await dialog.getByLabel(/Nombre completo/).fill("Ana Gómez");
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("result")).toHaveText("Cliente guardado");
    await expect(trigger).toBeFocused();
  });

  test("forma según el ancho: modal centrado en PC, hoja inferior en móvil", async ({ page }, info) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(700); // termina la animación de entrada
    const box = (await dialog.boundingBox())!;
    const viewport = page.viewportSize()!;
    if (isMobile(info.project.name)) {
      expect(Math.round(box.x)).toBe(0);
      expect(Math.round(box.width)).toBe(viewport.width);
      expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(viewport.height - 2);
    } else {
      expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
      expect(Math.round(box.width)).toBe(520);
    }
  });
});

test.describe("FormDrawer", () => {
  test("panel lateral derecho en PC, casi pantalla completa en móvil", async ({ page }, info) => {
    await openStory(page, "organismos-formsheet--drawer");
    const trigger = page.getByRole("button", { name: "Editar cliente" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Carlos Peña" });
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(700);
    const box = (await drawer.boundingBox())!;
    const viewport = page.viewportSize()!;
    if (isMobile(info.project.name)) {
      expect(Math.round(box.width)).toBe(viewport.width);
    } else {
      expect(Math.round(box.x + box.width)).toBe(viewport.width);
      expect(Math.round(box.height)).toBe(viewport.height);
      expect(Math.round(box.width)).toBe(440);
    }
    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test.describe("ConfirmDialog", () => {
  test("foco inicial en Cancelar y Escape cancela", async ({ page }, info) => {
    test.skip(isMobile(info.project.name), "En móvil el foco va al panel (sin teclado).");
    await openStory(page, "organismos-confirmdialog--with-hook");
    await page.getByRole("button", { name: "Eliminar partida" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Eliminar esta partida?" });
    await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("result")).toHaveText("Cancelado");
  });

  test("useConfirm resuelve true al confirmar", async ({ page }) => {
    await openStory(page, "organismos-confirmdialog--with-hook");
    await page.getByRole("button", { name: "Eliminar partida" }).click();
    await page.getByRole("button", { name: "Eliminar partida" }).last().click();
    await expect(page.getByTestId("result")).toHaveText("Confirmado");
  });

  test("si la acción falla, muestra el error y no se cierra", async ({ page }) => {
    await openStory(page, "organismos-confirmdialog--failing");
    await page.getByRole("button", { name: "Anular venta" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Anular la venta?" });
    await dialog.getByRole("button", { name: "Anular venta" }).click();
    await expect(dialog.getByRole("alert")).toContainText("ya estaba anulada");
    await expect(dialog).toBeVisible();
  });

  test("borrado de raíz: exige escribir la palabra", async ({ page }) => {
    await openStory(page, "organismos-confirmdialog--type-to-confirm");
    await page.getByRole("button", { name: "Anular venta" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Anular la venta?" });
    const confirm = dialog.getByRole("button", { name: "Anular venta" });
    await expect(confirm).toBeDisabled();
    await dialog.getByRole("textbox").fill("anular");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("result")).toHaveText("Venta anulada");
  });
});

test.describe("Movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("los paneles aparecen sin animación", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    const duration = await dialog.evaluate((el) => getComputedStyle(el).animationDuration);
    expect(parseFloat(duration)).toBeLessThanOrEqual(0.001);
  });
});
