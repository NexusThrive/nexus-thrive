import { expect, test } from "@playwright/test";
import { openStory } from "./helpers";

const TEXT = "Dinero que el cliente pagó de más";

test.describe("ContextHelp", () => {
  test("teclado: Tab, Enter abre y anuncia; Escape cierra", async ({ page }, info) => {
    test.skip(info.project.name === "movil", "Teclado: solo escritorio.");
    await openStory(page, "moléculas-contexthelp--default");
    const trigger = page.getByRole("button", { name: "Ayuda sobre el saldo a favor" });
    await page.keyboard.press("Tab");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("status")).toContainText(TEXT);
    await expect(page.getByRole("dialog")).toContainText(TEXT);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("ratón: se abre al pasar por encima", async ({ page }, info) => {
    test.skip(info.project.name === "movil", "Hover: solo escritorio.");
    await openStory(page, "moléculas-contexthelp--default");
    await page.getByRole("button", { name: "Ayuda sobre el saldo a favor" }).hover();
    await expect(page.getByRole("dialog")).toContainText(TEXT);
  });

  test("táctil: un toque abre y tocar fuera cierra", async ({ page }, info) => {
    test.skip(info.project.name !== "movil", "Táctil: solo móvil.");
    await openStory(page, "moléculas-contexthelp--default");
    await page.getByRole("button", { name: "Ayuda sobre el saldo a favor" }).tap();
    const content = page.getByRole("dialog");
    await expect(content).toContainText(TEXT);
    // Queda dentro de la ventana.
    const box = (await content.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    await page.touchscreen.tap(5, viewport.height - 5);
    await expect(content).toBeHidden();
  });

  test("con enlace a la guía, el enlace es alcanzable", async ({ page }) => {
    await openStory(page, "moléculas-contexthelp--with-guide");
    await page.getByRole("button", { name: "Ayuda sobre el saldo a favor" }).click();
    await expect(page.getByRole("link", { name: /Cómo funciona el saldo/ })).toBeVisible();
  });
});
