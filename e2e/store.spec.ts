import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Tienda en línea: carrito, pedido y pedidos del negocio. */
test.describe("Tienda en línea", () => {
  test("agregar al carrito, ajustar cantidades y hacer el pedido con datos validados", async ({ page }) => {
    await page.goto("/");
    await openStory(page, "páginas-visibilidad-mi-sitio-web--tienda-con-carrito");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "Agregar Plan mensual al carrito" }).click();
    await page.getByRole("button", { name: "Agregar Plan mensual al carrito" }).click();
    await page.getByRole("button", { name: /Ver carrito \(2\)/ }).click();
    const dialog = page.getByRole("dialog", { name: "Tu carrito" });
    await expect(dialog.getByText("$ 240.000").first()).toBeVisible();
    await dialog.getByRole("button", { name: "Más Plan mensual" }).click();
    await expect(dialog.getByText("$ 360.000").first()).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Hacer el pedido" }).click();
    await expect(dialog.getByText("Escribe tu nombre completo.")).toBeVisible();
    await dialog.getByLabel("Nombre completo").fill("María Pérez");
    await dialog.getByLabel("Celular").fill("300 123 4567");
    await dialog.getByRole("button", { name: "Hacer el pedido" }).click();
    const ok = page.getByRole("dialog", { name: "Pedido T-0007 recibido" });
    await expect(ok.getByRole("link", { name: "Pagar ahora" })).toHaveAttribute("href", "/pay/abcd2345efgh67");
    await expect(ok.getByRole("link", { name: /Enviar mi pedido por WhatsApp/ })).toHaveAttribute("href", /wa\.me\/573001234567/);
    await expectNoAxeViolations(page);
  });

  test("pedidos del negocio: estados, aviso de revisión y cancelar solo los no pagados", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-pedidos-de-la-tienda--default");
    await expect(page.getByRole("listitem").filter({ hasText: "T-0003" }).getByText("Esperando pago")).toBeVisible();
    await expect(page.getByText(/Sin existencias suficientes de «Camiseta»/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar el pedido T-0002" })).toHaveCount(0); // pagado
    await page.getByRole("button", { name: "Cancelar el pedido T-0003" }).click();
    await expect(page.getByText("Pedido cancelado")).toBeVisible();
    await page.getByRole("button", { name: "Pagado", exact: true }).click();
    await expect(page.getByText("T-0003")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("sin pedidos explica qué pasará", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-pedidos-de-la-tienda--sin-pedidos");
    await expect(page.getByText("Aún no hay pedidos")).toBeVisible();
  });
});
