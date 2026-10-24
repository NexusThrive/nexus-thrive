import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/**
 * Navbar, búsqueda, selector de negocio y barra lateral (Storybook).
 * La búsqueda es un mock; el filtrado por negocio y módulo se prueba en el servidor.
 */
test.describe("Paleta de comandos", () => {
  test("busca clientes, navega con flechas y muestra el error", async ({ page }) => {
    await openStory(page, "organismos-commandpalette--open");
    const input = page.getByRole("combobox");
    await input.fill("mar");
    await expect(page.getByRole("option", { name: /María Fernanda/ })).toBeVisible();
    await expect(page.getByRole("option", { name: /Mariano/ })).toBeVisible();

    await input.fill("error");
    await expect(page.getByText("No se pudo buscar ahora")).toBeVisible();
    // Las secciones siguen disponibles aunque falle la búsqueda.
    await input.fill("");
    await expect(page.getByRole("option").first()).toBeVisible();
  });
});

test.describe("Funciones apagadas en el buscador", () => {
  test("una función que el negocio aún no usa se encuentra y lleva a Funciones", async ({ page }) => {
    await openStory(page, "organismos-commandpalette--open");
    await page.getByRole("combobox").fill("reservas");
    const option = page.getByRole("option", { name: /Reservas.*Activar en Funciones/ });
    await expect(option).toBeVisible();
    // Lo que sí está encendido no se ofrece como «activar».
    await page.getByRole("combobox").fill("finanzas");
    await expect(page.getByRole("option", { name: /Finanzas.*Activar en Funciones/ })).toHaveCount(0);
  });
});

test.describe("Buscador de la navbar (PC)", () => {
  test.skip(({ isMobile }) => isMobile, "En móvil la búsqueda es la hoja modal");

  test("el panel cuelga del campo: sin modal, sin scroll visible, Escape cierra", async ({ page }) => {
    await openStory(page, "organismos-navbarsearch--default");
    const input = page.getByRole("combobox");
    await input.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await input.fill("mar");
    await expect(page.getByRole("option", { name: /María Fernanda/ })).toBeVisible();
    const scrollbar = await page.getByRole("listbox").evaluate((el) => getComputedStyle(el).scrollbarWidth);
    expect(scrollbar).toBe("none");

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
  });

  test("al enfocar se ensancha y el panel cuelga del campo, del mismo ancho", async ({ page }) => {
    await openStory(page, "organismos-navbarsearch--default");
    const input = page.getByRole("combobox");
    const before = (await input.boundingBox())!;
    await input.click();
    const panel = page.getByRole("listbox");
    await panel.waitFor();
    await page.waitForTimeout(500); // termina el ensanche (320 ms)
    const after = (await input.boundingBox())!;
    expect(after.width, "se ensancha al enfocar").toBeGreaterThan(before.width + 80);
    const box = (await page.locator(".nx-drop-down").boundingBox())!;
    expect(Math.abs(box.x - after.x), "el panel empieza donde empieza el campo").toBeLessThan(2);
    expect(Math.abs(box.width - after.width), "el panel tiene el ancho del campo").toBeLessThan(2);
    expect(box.y, "cuelga justo debajo").toBeGreaterThanOrEqual(after.y + after.height);
    // Al salir vuelve a su ancho.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    expect(Math.abs((await input.boundingBox())!.width - before.width)).toBeLessThan(2);
  });

  test("Ctrl K enfoca el campo", async ({ page }) => {
    await openStory(page, "organismos-navbarsearch--default");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("combobox")).toBeFocused();
    await expect(page.getByRole("listbox")).toBeVisible();
  });

  test("axe con el panel abierto", async ({ page }) => {
    await openStory(page, "organismos-navbarsearch--default");
    await page.getByRole("combobox").click();
    await page.getByRole("listbox").waitFor();
    await expectNoAxeViolations(page);
  });
});

test.describe("Selector de negocio (PC)", () => {
  test.skip(({ isMobile }) => isMobile, "En móvil el negocio va junto al logo");

  test("se despliega, muestra el negocio y «Crear otro negocio», y Escape devuelve el foco", async ({ page }) => {
    await openStory(page, "organismos-businessswitcher--several-businesses");
    const trigger = page.getByRole("button", { name: "Gimnasio Norte" });
    await trigger.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByText("Spa Centro")).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Crear otro negocio/ })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /Crear otro negocio/ })).toHaveAttribute("href", "/onboarding?nuevo=1");
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});

test.describe("Barra lateral en riel", () => {
  test.skip(({ isMobile }) => isMobile, "Oculta en móvil");

  test("se despliega por encima al pasar el mouse y no mueve el contenido", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await openStory(page, "organismos-appsidebar--tablet");
    const side = page.getByRole("complementary", { name: "Navegación principal" });
    const before = (await side.boundingBox())!.width;
    expect(before).toBeLessThan(100);

    await side.hover();
    await expect.poll(async () => (await side.boundingBox())!.width, { timeout: 3000 }).toBeGreaterThan(230);
    await expect(side.getByText("Presupuestos").or(side.locator("[class*=label]").first())).toBeVisible();

    await page.mouse.move(700, 400);
    await expect.poll(async () => (await side.boundingBox())!.width, { timeout: 3000 }).toBeLessThan(100);
  });

  test("con teclado también se despliega", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await openStory(page, "organismos-appsidebar--tablet");
    const side = page.getByRole("complementary", { name: "Navegación principal" });
    await page.keyboard.press("Tab");
    await expect.poll(async () => (await side.boundingBox())!.width, { timeout: 3000 }).toBeGreaterThan(230);
  });
});
