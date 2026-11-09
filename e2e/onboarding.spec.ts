import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

test.describe("Registro: tu negocio y tu operación", () => {
  test("el rubro es una lista con Comercio, Gimnasio y Restaurante; el NIT ocupa todo el ancho", async ({ page }) => {
    await openStory(page, "páginas-onboarding-tu-negocio--vacio");
    await page.getByRole("combobox", { name: /Rubro principal/ }).click();
    await expect(page.getByRole("option")).toHaveText(["Elige tu rubro", "Comercio", "Gimnasio", "Restaurante"]);
    await page.keyboard.press("Escape");
    const nit = await page.getByLabel(/NIT/).boundingBox();
    const nombre = await page.getByLabel(/Nombre comercial/).boundingBox();
    // En pantalla ancha el nombre ocupa media fila y el NIT la fila entera; en celular ambos van a todo el ancho.
    const ancho = (page.viewportSize()?.width ?? 0) >= 640;
    expect(nit!.width).toBeGreaterThanOrEqual(nombre!.width * (ancho ? 1.9 : 0.99));
    await expectNoAxeViolations(page);
  });
  test("elegir un rubro y marcar lo que vende se refleja", async ({ page }) => {
    await openStory(page, "páginas-onboarding-tu-negocio--elegir-rubro");
    await expect(page.getByRole("combobox", { name: /Rubro principal/ })).toContainText("Comercio");
    await openStory(page, "páginas-onboarding-tu-operación--en-funcionamiento");
    const mostrador = page.getByRole("button", { name: /Vendo en mostrador/ });
    await mostrador.click();
    await expect(mostrador).toHaveAttribute("aria-pressed", "true");
    await expectNoAxeViolations(page);
  });
});

test.describe("AURI en el Inicio", () => {
  test("la primera visita la presenta paso a paso y no se repite", async ({ page }) => {
    await openStory(page, "organismos-auriassistant--primera-visita-al-inicio");
    const tarjeta = page.getByRole("region", { name: /AURI te muestra tu panel/ });
    await expect(tarjeta).toBeVisible({ timeout: 10_000 });
    await expect(tarjeta.getByText("1 de 5")).toBeVisible();
    await tarjeta.getByRole("button", { name: "Siguiente" }).click();
    await expect(tarjeta.getByText("2 de 5")).toBeVisible();
    await expectNoAxeViolations(page);
    await tarjeta.getByRole("button", { name: "Omitir" }).click();
    await expect(tarjeta).toBeHidden();
  });
});

test("AURI: la historia muestra todas sus caras", async ({ page }) => {
  await openStory(page, "organismos-auri-·-expresiones--todas-las-caras");
  for (const cara of ["Neutral", "Alegría", "Guiño", "Sorpresa", "Pensando", "Curiosa", "Triste", "Hablando"]) await expect(page.getByText(cara, { exact: true })).toBeVisible();
  await expectNoAxeViolations(page);
});

test.describe("Configuración a todo el ancho", () => {
  test("ocupa el ancho de la pantalla y ordena las tarjetas en dos columnas", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStory(page, "páginas-configuración-pantalla-completa--perfil");
    const identidad = await page.getByRole("heading", { name: "Identidad" }).boundingBox();
    const contacto = await page.getByRole("heading", { name: "Contacto y ubicación" }).boundingBox();
    const fiscales = await page.getByRole("heading", { name: "Datos fiscales" }).boundingBox();
    // Izquierda: Identidad y Contacto, una bajo la otra; derecha: Datos fiscales a la altura de Identidad.
    expect(Math.abs(identidad!.x - contacto!.x)).toBeLessThan(8);
    expect(contacto!.y).toBeGreaterThan(identidad!.y + 60);
    expect(fiscales!.x).toBeGreaterThan(identidad!.x + 300);
    expect(Math.abs(fiscales!.y - identidad!.y)).toBeLessThan(8);
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(desborde).toBe(false);
    await expectNoAxeViolations(page);
  });
  test("en celular no hay desplazamiento horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openStory(page, "páginas-configuración-pantalla-completa--perfil");
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(desborde).toBe(false);
  });
});
