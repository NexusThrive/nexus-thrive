import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Mini-sitio: editor con vista previa y sitio público. */
test.describe("Mi sitio web", () => {
  test("el sitio público trae título, catálogo, contacto, mapa y WhatsApp flotante", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-mi-sitio-web--sitio-publico");
    await expect(page.getByRole("heading", { level: 1, name: "Simplapp Gym" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Plan mensual" })).toHaveAttribute("href", "/s/simplapp/p/p1");
    await expect(page.getByRole("link", { name: /Cómo llegar/ })).toHaveAttribute("href", /openstreetmap/);
    await expect(page.getByRole("link", { name: "Escríbenos por WhatsApp" })).toHaveAttribute("href", /wa\.me\/573001234567/);
    await expectNoAxeViolations(page);
  });

  test("plantilla oscura con acento morado sigue siendo legible", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-mi-sitio-web--sitio-publico-oscuro");
    await expectNoAxeViolations(page);
  });

  test("el editor muestra la lista de SEO y actualiza la vista previa al escribir", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-mi-sitio-web--editor");
    await expect(page.getByText("El título tiene entre 10 y 60 caracteres.")).toBeVisible();
    await page.getByLabel(/Título principal/).fill("Gimnasio Atlas");
    await expect(page.getByRole("region", { name: "Vista previa del sitio" }).getByRole("heading", { level: 1 })).toHaveText("Gimnasio Atlas");
    await page.getByRole("checkbox", { name: /Proteína whey/ }).check();
    await expect(page.getByRole("region", { name: "Vista previa del sitio" }).getByText("Proteína whey 2 lb")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("guardar con una dirección ocupada explica el problema y conserva lo escrito", async ({ page }) => {
    await openStory(page, "páginas-visibilidad-mi-sitio-web--editor");
    await page.getByLabel(/Dirección del sitio/).fill("ocupado");
    await page.getByRole("button", { name: "Guardar sitio" }).click();
    await expect(page.getByText("Esa dirección ya la usa otro negocio.").first()).toBeVisible();
    await expect(page.getByLabel(/Dirección del sitio/)).toHaveValue("ocupado");
    await page.getByLabel(/Dirección del sitio/).fill("mi-gimnasio");
    await page.getByRole("button", { name: "Guardar sitio" }).click();
    await expect(page.getByText("Sitio guardado y publicado")).toBeVisible();
  });
});
