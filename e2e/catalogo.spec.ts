import path from "node:path";
import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Catálogo: producto en página con previsualización, categorías y atributos. */
const LONG = "Camiseta personalizada con un nombre larguísimo que no cabe en una sola línea de ninguna pantalla";
// Una foto grande (4000×3000 px): su tamaño original nunca debe ensanchar la previsualización.
const BIG_PHOTO = path.join(__dirname, "fixtures", "foto-grande.png");

test.describe("Producto en página", () => {
  for (const [name, width, height] of [["escritorio", 1280, 800], ["tablet", 1024, 768], ["celular", 390, 844]] as const) {
    test(`con foto grande, nombre largo y «a medida» no se desborda (${name})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openStory(page, "páginas-inventario-catálogo--formulario-editar");
      await page.setInputFiles('input[type="file"]', BIG_PHOTO);
      await page.getByRole("checkbox", { name: "A medida (personalizable)" }).click();
      await page.getByRole("textbox", { name: /^Nombre/ }).first().fill(LONG);
      const preview = page.getByRole("complementary", { name: "Previsualización del producto" });
      await expect(preview).toBeVisible();
      const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: innerWidth, right: document.querySelector('aside[aria-label="Previsualización del producto"]')!.getBoundingClientRect().right }));
      expect(m.scroll, "la página no debe tener desplazamiento horizontal").toBeLessThanOrEqual(m.inner);
      expect(m.right, "la previsualización debe quedar dentro de la pantalla").toBeLessThanOrEqual(m.inner);
      await expect(preview.getByText("A medida")).toBeVisible();
    });
  }

  test("la previsualización sigue lo que se escribe y las pestañas se operan con el teclado", async ({ page }) => {
    await openStory(page, "páginas-inventario-catálogo--formulario-nuevo");
    const preview = page.getByRole("complementary", { name: "Previsualización del producto" });
    await page.getByRole("textbox", { name: /^Nombre/ }).first().fill("Taza");
    await expect(preview.getByText("Taza").first()).toBeVisible();
    await page.getByRole("tab", { name: "Atributos y variantes" }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Agregar atributo");
    await page.waitForTimeout(600); // que terminen las transiciones antes de medir el contraste
    await expectNoAxeViolations(page);
  });
});

test.describe("Estados vacíos y de filtro", () => {
  test("catálogo vacío invita a crear o a importar desde Excel", async ({ page }) => {
    await openStory(page, "páginas-inventario-catálogo--vacio");
    await expect(page.getByRole("heading", { name: /Aún no hay productos/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Importar desde Excel" })).toBeVisible();
  });

  test("categorías y atributos vacíos traen ejemplo y primera acción", async ({ page }) => {
    await openStory(page, "páginas-inventario-categorías--vacio");
    await expect(page.getByRole("button", { name: /Crear la primera/ })).toBeVisible();
    await openStory(page, "páginas-inventario-atributos--vacio");
    await expect(page.getByRole("button", { name: /Crear el primero/ })).toBeVisible();
  });

  test("una búsqueda sin resultados ofrece quitar el filtro", async ({ page }) => {
    await openStory(page, "páginas-inventario-catálogo--sin-coincidencias");
    await expect(page.getByRole("button", { name: /Quitar filtros/ })).toBeVisible();
  });
});
