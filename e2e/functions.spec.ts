import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Funciones: catálogo único con búsqueda, categorías, estados y dependencias. */
test.describe("Funciones", () => {
  test("agrupa por categoría, muestra estados reales y no tiene violaciones de accesibilidad", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--default");
    await expect(page.getByRole("heading", { name: /Ventas y cobros/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Presencia en línea/ })).toBeVisible();
    await expect(page.getByText("Controlas inventario de 3 productos")).toBeVisible();
    await expect(page.getByText("Va bien con un negocio de gimnasio.")).toBeVisible();
    // Encendida pero sin configurar: no se presenta como operativa.
    await expect(page.getByText("Falta configurar")).toBeVisible();
    await expect(page.getByRole("link", { name: "Configurar" })).toHaveAttribute("href", "/demo/factura-electronica");
    // Lo que no existe se informa, sin interruptor.
    await expect(page.getByText("Próximamente")).toBeVisible();
    await expect(page.getByRole("switch", { name: /Pedidos/ })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("busca sin tildes y filtra por categoría y estado", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--default");
    await page.getByLabel("Buscar una función").fill("contabilidad");
    await expect(page.getByText("Plan de cuentas, asientos y estados financieros")).toBeVisible();
    await expect(page.getByText("Punto de venta")).toHaveCount(0);
    await page.getByLabel("Buscar una función").fill("zzzz");
    await expect(page.getByText("Ninguna función coincide")).toBeVisible();
    await page.getByLabel("Buscar una función").fill("");
    await page.getByRole("button", { name: "Presencia en línea" }).click();
    await expect(page.getByText("Ficha de Google")).toBeVisible();
    await expect(page.getByText("Clientes", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Todas las categorías" }).click();
    await page.getByRole("button", { name: /Activas/ }).click();
    await expect(page.getByRole("switch", { name: /^Apagar/ }).first()).toBeVisible();
    await expect(page.getByRole("switch", { name: /^Encender/ })).toHaveCount(0);
  });

  test("encender una función la deja en su categoría y lo avisa", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--default");
    await page.getByRole("switch", { name: "Encender Facturación" }).click();
    await expect(page.getByText("Función encendida: ya está en tu menú")).toBeVisible();
    await expect(page.getByRole("region", { name: /Ventas y cobros/ }).getByText("Facturación")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Apagar Facturación" })).toBeChecked();
  });

  test("si no se puede cambiar, vuelve al estado anterior y explica", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--default");
    await page.getByRole("switch", { name: "Encender WhatsApp" }).click();
    await expect(page.getByText("No se pudo encender (prueba de error).")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Encender WhatsApp" })).not.toBeChecked();
  });

  test("las dependencias se comunican en la fila", async ({ page }) => {
    await openStory(page, "páginas-funciones-funciones--default");
    await expect(page.getByText("Funciona con «Facturación»").first()).toBeVisible();
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
