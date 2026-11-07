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

  test("pedidos del negocio: cumplimiento y pago por separado, aviso de revisión y cancelar con confirmación", async ({ page }) => {
    await openStory(page, "páginas-ventas-pedidos--default");
    const card = (code: string) => page.getByRole("listitem").filter({ hasText: code }).first();
    await expect(card("T-0005").getByText("Esperando pago")).toBeVisible();
    await expect(card("T-0005").getByText("Recibido")).toBeVisible();
    await expect(card("T-0003").getByText("De cotización")).toBeVisible();
    await expect(page.getByText(/Sin existencias suficientes de «Camiseta»/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar el pedido T-0001" })).toHaveCount(0); // entregado: final
    await expect(page.getByRole("button", { name: "Cancelar el pedido T-0006" })).toHaveCount(0); // cancelado: final
    await card("T-0005").getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByText("Pedido confirmado")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar el pedido T-0005" }).click();
    const d = page.getByRole("dialog", { name: "¿Cancelar el pedido T-0005?" });
    await expect(d).toBeVisible();
    await d.getByRole("button", { name: "Cancelar pedido" }).click();
    await expect(page.getByText("Pedido cancelado")).toBeVisible();
    await page.getByRole("button", { name: /^Listo \(/ }).click();
    await expect(page.getByText("T-0004")).toHaveCount(0);
    await expect(card("T-0002")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("mover un pedido de paso en dos toques a 360 px, sin desplazamiento horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openStory(page, "páginas-ventas-pedidos--default");
    const card = page.getByRole("listitem").filter({ hasText: "T-0002" }).first();
    await card.getByRole("button", { name: "Marcar entregado" }).click();
    const d = page.getByRole("dialog", { name: "Confirmar entrega de T-0002" });
    await d.getByRole("button", { name: "Marcar entregado" }).click(); // segundo toque: confirma
    await expect(page.getByText("Pedido entregado")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Un paso que no es el habitual se elige en el selector de la misma tarjeta (otro pedido listo para enviar).
    const received = page.getByRole("listitem").filter({ hasText: "T-0004" }).first();
    await expect(received.getByLabel("Mover T-0004 a otro paso")).toBeVisible();
  });

  test("sin pedidos explica qué pasará", async ({ page }) => {
    await openStory(page, "páginas-ventas-pedidos--sin-pedidos");
    await expect(page.getByText("Aún no hay pedidos")).toBeVisible();
  });
});

test.describe("Pedidos sin dinero", () => {
  test("quien produce mueve pedidos pero no ve totales, cobros ni cancelar", async ({ page }) => {
    await openStory(page, "páginas-ventas-pedidos--sin-dinero");
    await expect(page.getByText("Esperando pago")).toHaveCount(0);
    await expect(page.getByText(/\$\s?278/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Confirmar pago" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Cancelar el pedido/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Confirmar", exact: true }).first()).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("Entregas", () => {
  test("enviar con transportadora pide la guía y luego confirma", async ({ page }) => {
    await openStory(page, "páginas-ventas-pedidos--default");
    await page.getByRole("listitem").filter({ hasText: "T-0002" }).first().getByRole("button", { name: "Enviar", exact: true }).click();
    const d = page.getByRole("dialog", { name: "Enviar T-0002" });
    await d.getByLabel(/Transportadora/).fill("Servientrega");
    await d.getByRole("button", { name: "Marcar enviado" }).click();
    await expect(d.getByText("Escribe el número de guía.")).toBeVisible();
    await d.getByLabel(/Número de guía/).fill("SV123");
    await expectNoAxeViolations(page);
    await d.getByRole("button", { name: "Marcar enviado" }).click();
    await expect(page.getByText("Pedido enviado")).toBeVisible();
  });
});

test.describe("Producción", () => {
  test("avanzar una orden con un toque y ver el vacío", async ({ page }) => {
    await openStory(page, "páginas-ventas-producción--default");
    await page.getByRole("button", { name: "Empezar Camiseta estampada del pedido T-0001" }).click();
    await expect(page.getByText("Orden actualizada")).toBeVisible();
    await expectNoAxeViolations(page);
    await openStory(page, "páginas-ventas-producción--vacio");
    await expect(page.getByText("Nada en producción")).toBeVisible();
  });
});
