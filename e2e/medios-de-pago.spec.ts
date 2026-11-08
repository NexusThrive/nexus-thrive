import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

test.describe("Medios de pago", () => {
  test("lista los medios con su estado y se puede editar sin errores de accesibilidad", async ({ page }) => {
    await openStory(page, "páginas-dinero-medios-de-pago--con-medios");
    await expect(page.getByText("Nequi")).toBeVisible();
    await expect(page.getByText("Apagado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Subir Efectivo" })).toBeDisabled();
    await page.getByRole("button", { name: "Editar Nequi" }).click();
    await expect(page.getByRole("dialog", { name: "Editar medio de pago" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("un nombre repetido se explica y se conserva lo escrito", async ({ page }) => {
    await openStory(page, "páginas-dinero-medios-de-pago--nuevo-medio-repetido");
    await expect(page.getByRole("alert").getByText(/Ya tienes un medio llamado/)).toBeVisible();
  });
});
