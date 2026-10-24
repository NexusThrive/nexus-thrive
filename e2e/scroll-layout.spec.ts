import { expect, test } from "@playwright/test";
import { openStory } from "./helpers";

/**
 * Barra de scroll y modales. Playwright oculta las barras por defecto (como un
 * móvil); aquí se muestran para medir lo que ve quien tiene barra clásica.
 */
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });
test.skip(({ isMobile }) => isMobile, "Los móviles usan barras superpuestas (no ocupan ancho)");


test.describe("Sin salto de layout al abrir un modal", () => {

  test("el contenido no se mueve al abrir y cerrar (la barra de scroll no cambia el ancho)", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    // Página más alta que la ventana: hay barra de scroll vertical.
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "3000px";
      spacer.id = "nx-spacer";
      document.body.appendChild(spacer);
      // Como la navbar de la app: fija y pegada al borde derecho.
      const fixed = document.createElement("div");
      fixed.id = "nx-fixed";
      fixed.style.cssText = "position:fixed;top:0;right:0;width:40px;height:40px;background:red";
      document.body.appendChild(fixed);
    });
    // Con el modal abierto el botón queda aria-hidden: se localiza por CSS, no por rol.
    const button = page.locator("#storybook-root button", { hasText: /^Nuevo cliente$/ });
    const gutter = await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
    expect(gutter, "para medir, la barra de scroll debe ocupar ancho").toBeGreaterThan(0);
    const fixedBox = () => page.locator("#nx-fixed").boundingBox().then((b) => b!);
    const before = (await button.boundingBox())!;
    const fixedBefore = await fixedBox();
    await button.click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(450);
    const during = (await button.boundingBox())!;
    expect(Math.abs(during.x - before.x), "el botón se desplazó al abrir").toBeLessThan(0.5);
    expect(Math.abs((await fixedBox()).x - fixedBefore.x), "un elemento fijo al borde derecho se desplazó al abrir").toBeLessThan(0.5);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const after = (await button.boundingBox())!;
    expect(Math.abs(after.x - before.x), "el botón se desplazó al cerrar").toBeLessThan(0.5);
    expect(Math.abs((await fixedBox()).x - fixedBefore.x), "un elemento fijo se desplazó al cerrar").toBeLessThan(0.5);
  });
});

test.describe("Navbar y contenido con el modal del shell", () => {
  test("abrir un modal no mueve la navbar fija ni el contenido", async ({ page }) => {
    await openStory(page, "plantillas-tenantshell--with-modal");
    const gutter = await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
    expect(gutter, "para medir, la barra de scroll debe ocupar ancho").toBeGreaterThan(0);
    const box = (selector: string) => page.locator(selector).first().boundingBox().then((b) => b!);
    const topbarRight = () => box("[data-app-topbar] button >> nth=-1");
    const content = () => box("#contenido h1");
    const [t0, c0] = [await topbarRight(), await content()];
    await page.locator("#contenido button", { hasText: /^Nuevo cliente$/ }).click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(450);
    const [t1, c1] = [await topbarRight(), await content()];
    expect(Math.abs(t1.x - t0.x), "la navbar se movió").toBeLessThan(0.5);
    expect(Math.abs(c1.x - c0.x), "el contenido se movió").toBeLessThan(0.5);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const [t2, c2] = [await topbarRight(), await content()];
    expect(Math.abs(t2.x - t0.x), "la navbar se movió al cerrar").toBeLessThan(0.5);
    expect(Math.abs(c2.x - c0.x), "el contenido se movió al cerrar").toBeLessThan(0.5);
  });
});

test.describe("Barra de scroll propia", () => {
  test("es fina, con trazo redondeado y sin pista visible", async ({ page }) => {
    await openStory(page, "plantillas-tenantshell--with-modal");
    const styles = await page.evaluate(() => {
      const thumb = getComputedStyle(document.documentElement, "::-webkit-scrollbar-thumb");
      const bar = getComputedStyle(document.documentElement, "::-webkit-scrollbar");
      const track = getComputedStyle(document.documentElement, "::-webkit-scrollbar-track");
      return { width: bar.width, radius: thumb.borderRadius, track: track.backgroundColor, thumb: thumb.backgroundColor };
    });
    expect(styles.width).toBe("10px");
    expect(styles.radius).not.toBe("0px");
    expect(styles.track).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(styles.thumb).not.toMatch(/rgba\(0, 0, 0, 0\)/);
  });
});
