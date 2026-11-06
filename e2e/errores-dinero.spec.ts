import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

/** Los rechazos de dinero (tope, cobro repetido…) se ven arriba del formulario y también como notificación. */
test.describe("Errores de dinero en la interfaz", () => {
  test("cobro rápido: el error aparece arriba, antes del teclado, y llega una notificación", async ({ page }) => {
    await openStory(page, "organismos-finanzas-paymentsheet--con-error");
    const dialog = page.getByRole("dialog", { name: "Registrar pago" });
    await dialog.getByRole("button", { name: "5", exact: true }).click();
    await dialog.getByRole("button", { name: "0", exact: true }).click();
    await dialog.getByRole("button", { name: "0", exact: true }).click();
    await dialog.getByRole("button", { name: "0", exact: true }).click();
    await dialog.getByRole("button", { name: /^Cobrar/ }).click();

    const alert = dialog.getByRole("alert").filter({ hasText: "supera el máximo permitido" });
    await expect(alert).toBeVisible();
    // Arriba: el aviso queda por encima del selector de cliente, no al final del formulario.
    const alertBox = await alert.boundingBox();
    const clientBox = await dialog.getByText("Cliente", { exact: true }).first().boundingBox();
    expect(alertBox && clientBox && alertBox.y < clientBox.y).toBeTruthy();
    // Notificación aparte del aviso del formulario.
    await expect(page.getByText("No se registró el cobro")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
