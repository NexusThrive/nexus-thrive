import { test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/**
 * axe (WCAG 2.2 AA) sobre los componentes compartidos, en claro y oscuro.
 * Lo automático no basta: el teclado, el foco y los lectores se prueban en
 * overlays.spec.ts y context-help.spec.ts, y a mano según
 * docs/design/accessibility.md.
 */
const STORIES = [
  "átomos-button--primary",
  "átomos-input--default",
  "moléculas-field--with-hint",
  "moléculas-field--with-error",
  "moléculas-field--with-help",
  "moléculas-field--optional",
  "moléculas-alert--danger",
  "moléculas-emptystate--default",
  "moléculas-loadingstate--block",
  "moléculas-contexthelp--default",
];

for (const theme of ["claro", "oscuro"] as const) {
  test.describe(`axe · tema ${theme}`, () => {
    for (const id of STORIES) {
      test(id, async ({ page }) => {
        await openStory(page, id);
        if (theme === "oscuro") await page.evaluate(() => document.documentElement.classList.add("dark"));
        await expectNoAxeViolations(page);
      });
    }

    test("FormDialog abierto con errores", async ({ page }) => {
      await openStory(page, "organismos-formsheet--dialog");
      if (theme === "oscuro") await page.evaluate(() => document.documentElement.classList.add("dark"));
      await page.getByRole("button", { name: "Nuevo cliente" }).click();
      await page.getByRole("button", { name: "Guardar cliente" }).click();
      await page.getByRole("alert").waitFor();
      await expectNoAxeViolations(page);
    });

    test("ConfirmDialog abierto", async ({ page }) => {
      await openStory(page, "organismos-confirmdialog--type-to-confirm");
      if (theme === "oscuro") await page.evaluate(() => document.documentElement.classList.add("dark"));
      await page.getByRole("button", { name: "Anular venta" }).click();
      await page.getByRole("dialog").waitFor();
      await expectNoAxeViolations(page);
    });

    test("ContextHelp abierta", async ({ page }) => {
      await openStory(page, "moléculas-contexthelp--with-guide");
      if (theme === "oscuro") await page.evaluate(() => document.documentElement.classList.add("dark"));
      await page.getByRole("button", { name: /Ayuda sobre/ }).click();
      await page.getByRole("dialog").waitFor();
      await expectNoAxeViolations(page);
    });
  });
}
