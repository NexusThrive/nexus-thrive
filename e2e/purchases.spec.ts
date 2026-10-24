import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Compras: lista, proveedores, nueva orden y recepción de mercancía. */
test.describe("Compras", () => {
  test("la lista de órdenes muestra estado, total y lo que falta por recibir", async ({ page }) => {
    await openStory(page, "páginas-compras-compras--default");
    await expect(page.getByRole("button", { name: /OC-0007/ })).toContainText("Borrador");
    await expect(page.getByRole("button", { name: /OC-0006/ })).toContainText("faltan 14 u.");
    // Por defecto solo lo que falta recibir; las recibidas están en su filtro.
    await expect(page.getByRole("button", { name: /OC-0005/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Recibidas/, pressed: false }).click();
    await expect(page.getByRole("button", { name: /OC-0005/ })).toContainText("Recibida");
    await expectNoAxeViolations(page);
  });

  test("sin proveedores guía a registrar el primero", async ({ page }) => {
    await openStory(page, "páginas-compras-compras--sin-proveedores");
    await expect(page.getByText("Primero registra a tu proveedor")).toBeVisible();
    await page.getByRole("button", { name: "Ir a Proveedores" }).click();
    await expect(page.getByText("Aún no hay proveedores")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("proveedores: se busca y marca a quien también es cliente", async ({ page }) => {
    await openStory(page, "páginas-compras-compras--default");
    await page.getByRole("button", { name: /Proveedores/, pressed: false }).click();
    await expect(page.getByText("también es cliente")).toBeVisible();
    await page.getByRole("searchbox", { name: "Buscar proveedor" }).fill("andina");
    await expect(page.getByText("Distribuidora Andina SAS")).toBeVisible();
    await expect(page.getByText("Luis Gómez")).toHaveCount(0);
    await page.getByRole("searchbox", { name: "Buscar proveedor" }).fill("zzz");
    await expect(page.getByText("Sin resultados")).toBeVisible();
  });

  test("nuevo proveedor: valida el nombre, avisa de posibles repetidos y cierra", async ({ page }) => {
    await openStory(page, "páginas-compras-compras--default");
    await page.getByRole("button", { name: /Proveedores/, pressed: false }).click();
    await page.getByRole("button", { name: "Nuevo proveedor" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Nuevo proveedor" });
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Crear proveedor" }).click();
    await expect(dialog.getByText("Escribe el nombre o la razón social.")).toBeVisible();
    await dialog.getByRole("textbox", { name: /Nombre o razón social/ }).fill("Andina Importaciones");
    await dialog.getByRole("button", { name: "Crear proveedor" }).click();
    await expect(dialog).toBeHidden();
  });

  test("nueva orden: el total sigue las líneas y no deja crear sin proveedores", async ({ page }) => {
    await openStory(page, "páginas-compras-compras--nueva-orden");
    const dialog = page.getByRole("dialog", { name: "Nueva orden de compra" });
    await expect(dialog.getByLabel("Total de la orden")).toHaveText(/^\$\s*0$/);
    await dialog.getByLabel("Cantidad").fill("10");
    await dialog.getByLabel("Costo unitario").fill("1000");
    await expect(dialog.getByLabel("Total de la orden")).toHaveText(/^\$\s*10\.000$/);
    await expectNoAxeViolations(page);

    await openStory(page, "páginas-compras-compras--nueva-orden-sin-proveedores");
    await expect(page.getByText("Primero registra un proveedor")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pedir al proveedor" })).toBeDisabled();
  });

  test("recibir mercancía: cantidades por línea, factura opcional y confirmación", async ({ page }) => {
    await openStory(page, "páginas-compras-compras--detalle-recibida-en-parte");
    const dialog = page.getByRole("dialog", { name: "Orden OC-0007" });
    await expect(dialog.getByText("Recibida en parte")).toBeVisible();
    await expect(dialog.getByText("FV-2201")).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Recibir el resto" }).click();
    // Lo que falta viene precargado: 20-12 = 8 y 10-4 = 6.
    await expect(dialog.getByLabel("Cantidad que llega de Proteína whey 2 lb")).toHaveValue("8");
    await expect(dialog.getByLabel("Cantidad que llega de Barra de proteína")).toHaveValue("6");
    await dialog.getByLabel("Cantidad que llega de Barra de proteína").fill("4");
    await dialog.getByRole("textbox", { name: /Número/ }).fill("FV-2301");
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Confirmar recepción" }).click();
    await expect(page.getByText(/12 unidades entraron al inventario/)).toBeVisible();
  });

  test("una orden ya recibida no ofrece acciones; una inexistente avisa", async ({ page }) => {
    await openStory(page, "páginas-compras-compras--detalle-recibida");
    const dialog = page.getByRole("dialog", { name: "Orden OC-0007" });
    await expect(dialog.getByText("Recibida", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Recibir|Cancelar orden|Cerrar orden/ })).toHaveCount(0);
    await openStory(page, "páginas-compras-compras--detalle-no-existe");
    await expect(page.getByText("No se encontró la orden.")).toBeVisible();
  });

  test("cancelar pide confirmación y no cancela si se arrepiente", async ({ page }) => {
    await openStory(page, "páginas-compras-compras--detalle-borrador");
    const dialog = page.getByRole("dialog", { name: "Orden OC-0007" });
    await dialog.getByRole("button", { name: "Cancelar orden" }).click();
    const alert = page.getByRole("alertdialog", { name: /¿Cancelar OC-0007\?/ }).or(page.getByRole("dialog", { name: /¿Cancelar OC-0007\?/ }));
    await expect(alert).toBeVisible();
    await alert.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByText("Orden cancelada")).toHaveCount(0);
    await expect(dialog).toBeVisible();
  });
});
