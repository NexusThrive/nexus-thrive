import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Presencia v2, fase A: pilares verificados y tendencia. */
test.describe("Presencia · pilares", () => {
  test("muestra los pilares, lo que no se mide y la tendencia", async ({ page }) => {
    await openStory(page, "páginas-presencia-pilares-fase-a--sube");
    await expect(page.getByText("Cobertura 70 %")).toBeVisible();
    await expect(page.getByText(/Sube \+18 pts en 30 días/)).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Sitio: 85 de 100" })).toBeVisible();
    await expect(page.getByText("Sin medir").first()).toBeVisible();
    await expect(page.getByText(/se mide cuando conectes tus reseñas/)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("baja, primer día y lista para la fase B", async ({ page }) => {
    await openStory(page, "páginas-presencia-pilares-fase-a--baja");
    await expect(page.getByText(/Baja -9 pts/)).toBeVisible();
    await openStory(page, "páginas-presencia-pilares-fase-a--primer-dia");
    await expect(page.getByText("Estable")).toBeVisible();
    await openStory(page, "páginas-presencia-pilares-fase-a--lista-para-fase-b");
    await expect(page.getByText(/Lista para la fase B/)).toBeVisible();
    await expect(page.getByText("Sin medir")).toHaveCount(0);
  });
});
