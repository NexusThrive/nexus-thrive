import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Configuración · perfil: lectura primero, edición bajo demanda. */
test.describe("Perfil del negocio", () => {
  test("se lee como información, sin campos abiertos", async ({ page }) => {
    await openStory(page, "páginas-configuración-perfil-lectura-y-edición--default");
    await expect(page.getByText("Simplapp Gym")).toBeVisible();
    await expect(page.getByText("/simplapp")).toBeVisible();
    await expect(page.getByLabel(/Nombre comercial/)).toHaveCount(0);
    await expect(page.getByLabel(/NIT/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Modificar/ })).toHaveCount(3);
    await expectNoAxeViolations(page);
  });

  test("sin datos dice «Sin completar» y solo lectura no ofrece modificar", async ({ page }) => {
    await openStory(page, "páginas-configuración-perfil-lectura-y-edición--sin-datos");
    await expect(page.getByText("Sin completar").first()).toBeVisible();
    await openStory(page, "páginas-configuración-perfil-lectura-y-edición--solo-lectura");
    await expect(page.getByRole("button", { name: /Modificar/ })).toHaveCount(0);
    await expect(page.getByText(/Solo el dueño del negocio puede modificar/)).toBeVisible();
  });

  test("modificar la identidad: valida, conserva lo escrito y avisa del cambio de enlace", async ({ page }) => {
    await openStory(page, "páginas-configuración-perfil-lectura-y-edición--default");
    await page.getByRole("button", { name: "Modificar identidad" }).click();
    const dialog = page.getByRole("dialog", { name: "Modificar identidad" });
    await dialog.getByLabel(/Nombre comercial/).fill("");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(dialog.getByText("El nombre es requerido.")).toBeVisible();
    await dialog.getByLabel(/Nombre comercial/).fill("Simplapp Fitness");
    await dialog.getByLabel(/Dirección del panel/).fill("ocupado");
    await expect(dialog.getByText(/Cambiar la dirección cambia el enlace/)).toBeVisible();
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(dialog.getByText("Ese slug ya está en uso por otro negocio.")).toBeVisible();
    await expect(dialog.getByLabel(/Nombre comercial/)).toHaveValue("Simplapp Fitness");
    await expectNoAxeViolations(page);
  });

  test("guardar actualiza la vista con lo confirmado y cancelar no cambia nada", async ({ page }) => {
    await openStory(page, "páginas-configuración-perfil-lectura-y-edición--default");
    await page.getByRole("button", { name: "Modificar datos fiscales" }).click();
    let dialog = page.getByRole("dialog", { name: "Modificar datos fiscales" });
    await dialog.getByLabel(/NIT/).fill("111");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("900123456-7")).toBeVisible();
    await page.getByRole("button", { name: "Modificar datos fiscales" }).click();
    dialog = page.getByRole("dialog", { name: "Modificar datos fiscales" });
    await dialog.getByLabel(/NIT/).fill("800555444-1");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("800555444-1")).toBeVisible();
    await expect(page.getByText("900123456-7")).toHaveCount(0);
  });

  test("un fallo del servidor no cierra el diálogo", async ({ page }) => {
    await openStory(page, "páginas-configuración-perfil-lectura-y-edición--default");
    await page.getByRole("button", { name: "Modificar contacto y ubicación" }).click();
    const dialog = page.getByRole("dialog", { name: "Modificar contacto y ubicación" });
    await dialog.getByLabel(/Ciudad/).fill("falla");
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(dialog.getByText("Error al actualizar el perfil. Inténtalo de nuevo.")).toBeVisible();
    await expect(dialog.getByLabel(/Ciudad/)).toHaveValue("falla");
  });
});
