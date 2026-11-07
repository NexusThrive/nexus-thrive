import { expect, test } from "@playwright/test";
import { openStory } from "./helpers";

/** Barra superior: al pasar de Inicio a un módulo, logo, avisos, tema, negocio y cuenta viajan a su lugar (View Transition) y no se cruzan. */
test.describe("Cambio de barra", () => {
  test("las piezas compartidas se transforman y conservan su orden", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "View Transitions con nombre: Chromium");
    await openStory(page, "organismos-apptopbar--cambio-de-barra");
    const order = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("[data-app-topbar] button, [data-app-topbar] [aria-label]")]
          .map((el) => el.getAttribute("aria-label") ?? "")
          .filter((label) => /Notificaciones|tema|Cuenta|cuenta/i.test(label)),
      );
    const before = await order();
    // Se registran los grupos animados desde antes del clic: la transición dura ~320 ms y la máquina puede estar cargada.
    await page.evaluate(() => {
      const seen = new Set<string>();
      (window as unknown as { __vt: Set<string> }).__vt = seen;
      const tick = () => {
        for (const a of document.getAnimations()) seen.add(String((a.effect as KeyframeEffect).pseudoElement ?? ""));
        if (seen.size < 40) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByRole("button", { name: "Entrar a Clientes" }).click();
    // En móvil (< 768 px) el nombre del negocio se oculta para dejar espacio a las pestañas.
    const pieces = (page.viewportSize()?.width ?? 0) < 768 ? ["logo", "notifications", "theme", "account"] : ["logo", "notifications", "theme", "brand", "account"];
    await expect
      .poll(() => page.evaluate(() => [...(window as unknown as { __vt: Set<string> }).__vt].join(" ")))
      .toMatch(new RegExp(pieces.map((p) => `(?=.*nx-topbar-${p})`).join("")));
    await expect(page.getByRole("navigation", { name: /Secciones de/ })).toBeVisible();
    expect(await order()).toEqual(before);
  });

  test("con movimiento reducido el cambio es inmediato", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "View Transitions con nombre: Chromium");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openStory(page, "organismos-apptopbar--cambio-de-barra");
    await page.getByRole("button", { name: "Entrar a Clientes" }).click();
    const running = await page.evaluate(() => document.getAnimations().filter((a) => String((a.effect as KeyframeEffect).pseudoElement ?? "").includes("nx-topbar") && Number(a.effect?.getComputedTiming().duration) > 0).length);
    expect(running).toBe(0);
  });
});
