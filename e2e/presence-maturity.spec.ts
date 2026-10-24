import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Madurez NEXUS (fase B): dimensiones y señales con acción. */
test.describe("Madurez NEXUS", () => {
  test("señales débiles traen su acción sugerida", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-madurez-nexus--con-senales");
    await expect(page.getByRole("heading", { name: /Madurez NEXUS/ })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Gastos" })).toHaveAttribute("aria-valuenow", "0");
    await expect(page.getByText("Tus gastos no se registran: no sabrás tu utilidad real.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Registrar gastos" })).toHaveAttribute("href", "/demo/finance");
    await expectNoAxeViolations(page);
  });
  test("un negocio consolidado no tiene señales", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-madurez-nexus--consolidado");
    await expect(page.getByText("Consolidado")).toBeVisible();
    await expect(page.getByText("Usas NEXUS en todas sus áreas")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
