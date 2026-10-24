import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Funciones: todo incluido; encender y apagar mueve la tarjeta entre secciones. */
test.describe("Funciones", () => {
  test("muestra lo que usas, lo sugerido con su motivo y el resto; sin violaciones de accesibilidad", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--default");
    await expect(page.getByRole("heading", { name: "En uso" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Te sugerimos" })).toBeVisible();
    await expect(page.getByText("Controlas inventario de 3 productos")).toBeVisible();
    await expect(page.getByText("Va bien con un negocio de gimnasio.")).toBeVisible();
    await expect(page.getByText("Funciona junto con")).toHaveCount(0); // inventario ya está encendido
    await expectNoAxeViolations(page);
  });

  test("encender una función la pasa a «En uso» y lo avisa", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--default");
    await page.getByRole("switch", { name: "Encender Facturación" }).click();
    await expect(page.getByText("Función encendida: ya está en tu menú")).toBeVisible();
    const enUso = page.getByRole("region", { name: "En uso" });
    await expect(enUso.getByText("Facturación")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Apagar Facturación" })).toBeChecked();
  });

  test("si no se puede cambiar, vuelve al estado anterior y explica", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--default");
    await page.getByRole("switch", { name: "Encender WhatsApp" }).click();
    await expect(page.getByText("No se pudo encender (prueba de error).")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Encender WhatsApp" })).not.toBeChecked();
  });

  test("las especialidades no se esconden: están en la lista con su marca", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--default");
    await expect(page.getByText("Obras y presupuestos")).toBeVisible();
    await expect(page.getByText("Especialidad").first()).toBeVisible();
  });

  test("quien no es dueño ve las funciones pero no puede cambiarlas", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--solo-lectura");
    await expect(page.getByText("Solo el dueño del negocio enciende o apaga funciones.")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Encender Facturación" })).toBeDisabled();
    await expectNoAxeViolations(page);
  });
});
