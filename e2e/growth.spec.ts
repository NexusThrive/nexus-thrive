import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Campañas con UTM, reporte por origen y reseñas. */
test.describe("Campañas y reseñas", () => {
  test("enlaces: lista, crea y apaga", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-campañas-y-reseñas--enlaces");
    await expect(page.getByText("https://app.nexus.co/l/k7m2p9x")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Apagar el enlace de Instagram · lanzamiento de octubre" }).click();
    await expect(page.getByText("Enlace apagado")).toBeVisible();
    await page.getByRole("button", { name: "Nuevo enlace" }).click();
    const d = page.getByRole("dialog", { name: "Nuevo enlace de campaña" });
    await d.getByLabel(/Nombre de la campaña/).fill("Correo de bienvenida");
    await d.getByRole("button", { name: "Crear enlace" }).click();
    await expect(page.getByText("Enlace de campaña creado")).toBeVisible();
  });

  test("reporte: inversión contra resultados", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-campañas-y-reseñas--enlaces");
    await page.getByRole("button", { name: /De dónde vienen/ }).click();
    const row = page.getByRole("row", { name: /instagram \/ social \/ octubre/ });
    await expect(row).toContainText("5×");
    await expect(page.getByRole("row", { name: /Directo/ })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("reseñas: alerta de 1–2 estrellas y se atiende", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-campañas-y-reseñas--enlaces");
    await page.getByRole("button", { name: /Reseñas/ }).click();
    await expect(page.getByText("Hay 1 reseña de 1–2 estrellas sin atender.")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Marcar como atendida la reseña de Pedro" }).click();
    await expect(page.getByText("Reseña marcada como atendida")).toBeVisible();
  });

  test("sin datos: guía qué hacer", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-campañas-y-reseñas--vacio");
    await expect(page.getByText("Tu sitio aún no está publicado")).toBeVisible();
    await expect(page.getByText("Aún no tienes enlaces de campaña")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
