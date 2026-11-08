import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

const open = (page: import("@playwright/test").Page, id: string) => page.goto(`/iframe.html?id=mol%C3%A9culas-slidetoconfirm--${id}&viewMode=story`);

/** Deslizar para confirmar: solo el final confirma, soltar antes vuelve al inicio, y con teclado basta Enter en el asa. */
test.describe("SlideToConfirm", () => {
  test("soltar antes del final no confirma; llegar al final sí", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, "El arrastre con mouse se prueba en PC");
    await open(page, "default");
    const grip = page.getByRole("button", { name: /^Cobrar \$ 45\.000\. Desliza/ });
    const box = (await grip.boundingBox())!;
    const track = (await grip.locator("..").boundingBox())!;
    const y = box.y + box.height / 2;

    await page.mouse.move(box.x + 10, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 30, y, { steps: 3 });
    await page.mouse.move(track.x + track.width / 2, y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    await expect(page.getByTestId("confirmados")).toHaveText("Confirmados: 0");

    await page.mouse.move(box.x + 10, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 30, y, { steps: 3 });
    await page.mouse.move(track.x + track.width + 40, y, { steps: 10 });
    await page.mouse.up();
    await expect(page.getByTestId("confirmados")).toHaveText("Confirmados: 1");
  });

  test("con teclado se confirma con Enter; si falla, el asa vuelve a estar lista", async ({ page }) => {
    await open(page, "falla");
    const grip = page.getByRole("button", { name: /^Cobrar \$ 45\.000\. Desliza/ });
    await grip.press("Enter");
    await expect(page.getByRole("button", { name: "Procesando" })).toBeVisible();
    await expect(grip).toBeVisible({ timeout: 3000 });
    await expectNoAxeViolations(page);
  });
});
