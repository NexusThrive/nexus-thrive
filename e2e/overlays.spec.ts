import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, openStory } from "./helpers";

const isMobile = (name: string) => name === "movil";

test.describe("FormDialog", () => {
  test("abre, enfoca, cierra con Escape y devuelve el foco", async ({ page }, info) => {
    await openStory(page, "organismos-formsheet--dialog");
    const trigger = page.getByRole("button", { name: "Nuevo cliente" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await expect(dialog).toBeVisible();
    if (isMobile(info.project.name)) {
      // En móvil no se abre el teclado sin pedirlo: el foco va al panel.
      await expect(dialog).toBeFocused();
    } else {
      await expect(dialog.getByLabel(/Nombre completo/)).toBeFocused();
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("el foco queda atrapado dentro del diálogo", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const inside = await dialog.evaluate((el) => el.contains(document.activeElement));
      expect(inside).toBe(true);
    }
  });

  test("datos inválidos: muestra el error, marca el campo y lo enfoca", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await dialog.getByLabel(/Correo electrónico/).fill("ana@ejemplo.com");
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Revisa los campos marcados");
    const name = dialog.getByLabel(/Nombre completo/);
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toBeFocused();
    await expect(dialog.getByText("Escribe el nombre del cliente.")).toBeVisible();
    // Lo escrito no se pierde.
    await expect(dialog.getByLabel(/Correo electrónico/)).toHaveValue("ana@ejemplo.com");
  });

  test("envío fallido: sigue abierto con el mensaje y conserva lo escrito", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await dialog.getByLabel(/Nombre completo/).fill("caida");
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(dialog.getByRole("alert")).toContainText("No se pudo guardar");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/Nombre completo/)).toHaveValue("caida");
  });

  test("envío válido: cierra, confirma y devuelve el foco", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    const trigger = page.getByRole("button", { name: "Nuevo cliente" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await dialog.getByLabel(/Nombre completo/).fill("Ana Gómez");
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("result")).toHaveText("Cliente guardado");
    await expect(trigger).toBeFocused();
  });

  test("forma según el ancho: modal centrado en PC, hoja inferior en móvil", async ({ page }, info) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(700); // termina la animación de entrada
    const box = (await dialog.boundingBox())!;
    const viewport = page.viewportSize()!;
    if (isMobile(info.project.name)) {
      expect(Math.round(box.x)).toBe(0);
      expect(Math.round(box.width)).toBe(viewport.width);
      expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(viewport.height - 2);
    } else {
      expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
      expect(Math.round(box.width)).toBe(520);
    }
  });
});

test.describe("FormDrawer", () => {
  test("panel lateral derecho en PC, casi pantalla completa en móvil", async ({ page }, info) => {
    await openStory(page, "organismos-formsheet--drawer");
    const trigger = page.getByRole("button", { name: "Editar cliente" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Carlos Peña" });
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(700);
    const box = (await drawer.boundingBox())!;
    const viewport = page.viewportSize()!;
    if (isMobile(info.project.name)) {
      expect(Math.round(box.width)).toBe(viewport.width);
    } else {
      expect(Math.round(box.x + box.width)).toBe(viewport.width);
      expect(Math.round(box.height)).toBe(viewport.height);
      expect(Math.round(box.width)).toBe(440);
    }
    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test.describe("ConfirmDialog", () => {
  test("foco inicial en Cancelar y Escape cancela", async ({ page }, info) => {
    test.skip(isMobile(info.project.name), "En móvil el foco va al panel (sin teclado).");
    await openStory(page, "organismos-confirmdialog--with-hook");
    await page.getByRole("button", { name: "Eliminar partida" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Eliminar esta partida?" });
    await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("result")).toHaveText("Cancelado");
  });

  test("useConfirm resuelve true al confirmar", async ({ page }) => {
    await openStory(page, "organismos-confirmdialog--with-hook");
    await page.getByRole("button", { name: "Eliminar partida" }).click();
    await page.getByRole("button", { name: "Eliminar partida" }).last().click();
    await expect(page.getByTestId("result")).toHaveText("Confirmado");
  });

  test("si la acción falla, muestra el error y no se cierra", async ({ page }) => {
    await openStory(page, "organismos-confirmdialog--failing");
    await page.getByRole("button", { name: "Anular venta" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Anular la venta?" });
    await dialog.getByRole("button", { name: "Anular venta" }).click();
    await expect(dialog.getByRole("alert")).toContainText("ya estaba anulada");
    await expect(dialog).toBeVisible();
  });

  test("borrado de raíz: exige escribir la palabra", async ({ page }) => {
    await openStory(page, "organismos-confirmdialog--type-to-confirm");
    await page.getByRole("button", { name: "Anular venta" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Anular la venta?" });
    const confirm = dialog.getByRole("button", { name: "Anular venta" });
    await expect(confirm).toBeDisabled();
    await dialog.getByRole("textbox").fill("anular");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("result")).toHaveText("Venta anulada");
  });
});

test.describe("Movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("los paneles aparecen sin animación", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    const duration = await dialog.evaluate((el) => getComputedStyle(el).animationDuration);
    expect(parseFloat(duration)).toBeLessThanOrEqual(0.001);
  });
});

test.describe("Movimiento reducido del sistema", () => {
  test.use({ reducedMotion: "reduce" });

  test("la ayuda flotante y los menús tampoco animan", async ({ page }) => {
    await openStory(page, "moléculas-contexthelp--default");
    await page.getByRole("button", { name: /Ayuda sobre/ }).click();
    const content = page.getByRole("dialog");
    await expect(content).toBeVisible();
    const duration = await content.evaluate((el) => getComputedStyle(el).animationDuration);
    expect(parseFloat(duration)).toBeLessThanOrEqual(0.001);
  });
});

test.describe("Confirmación sobre un panel", () => {
  test("Escape cierra solo la confirmación y el foco vuelve al panel", async ({ page }, info) => {
    test.skip(info.project.name === "movil", "Teclado: solo escritorio.");
    await openStory(page, "organismos-confirmdialog--inside-sheet");
    await page.getByRole("button", { name: "Ver venta" }).click();
    const sheet = page.getByRole("dialog", { name: "Venta #1042" });
    const anular = sheet.getByRole("button", { name: "Anular", exact: true });
    await anular.click();
    const confirmDialog = page.getByRole("dialog", { name: "¿Anular la venta?" });
    await expect(confirmDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(confirmDialog).toBeHidden();
    await expect(sheet).toBeVisible();
    await expect(anular).toBeFocused();
    await expect(page.getByTestId("result")).toHaveText("Sin cambios");
  });
});

test.describe("Modal conectado al botón", () => {
  test.skip(({ isMobile }) => isMobile, "En móvil es una hoja inferior");

  test("nace del botón y vuelve a él (viaje del ZIP a 0,4 s)", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 600 });
    await openStory(page, "organismos-formsheet--dialog");
    const boton = page.getByRole("button", { name: "Nuevo cliente" });
    const caja = (await boton.boundingBox())!;

    /** Graba anchura y centro del diálogo hasta `ms` después de empezar. */
    const record = (ms: number) =>
      page.evaluate((duration) => {
        const m: { t: number; w: number; ow: number; cx: number; cy: number }[] = [];
        (window as unknown as { __m: typeof m }).__m = m;
        const t0 = performance.now();
        const tick = () => {
          const d = document.querySelector('[role="dialog"]');
          if (d) {
            const r = d.getBoundingClientRect();
            m.push({
              t: Math.round(performance.now() - t0),
              w: Math.round(r.width),
              // Ancho de maquetación: la escala no lo cambia, el viaje del ZIP sí.
              ow: Math.round((d as HTMLElement).offsetWidth),
              cx: Math.round(r.left + r.width / 2),
              cy: Math.round(r.top + r.height / 2),
            });
          }
          if (performance.now() - t0 < duration) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, ms);
    const frames = () =>
      page.evaluate(() => (window as unknown as { __m: { t: number; w: number; ow: number; cx: number; cy: number }[] }).__m);

    await record(900);
    await boton.click();
    const dialogo = page.getByRole("dialog");
    await dialogo.waitFor();
    expect(await dialogo.evaluate((el) => el.hasAttribute("data-morph"))).toBe(true);
    await page.waitForTimeout(900);
    const apertura = await frames();
    expect(apertura[0].ow, "arranca con el ancho real del botón").toBeLessThan(260);
    expect(Math.abs(apertura[0].cy - (caja.y + caja.height / 2)), "arranca en el botón").toBeLessThan(24);
    expect(apertura.at(-1)!.ow, "termina con el ancho del modal").toBeGreaterThan(400);

    // El cierre vuelve al botón.
    await record(900);
    await page.keyboard.press("Escape");
    await expect(dialogo).toHaveCount(0);
    const cierre = await frames();
    expect(cierre.at(-1)!.ow, "termina con el ancho real del botón").toBeLessThan(260);
    expect(Math.abs(cierre.at(-1)!.cx - (caja.x + caja.width / 2)), "termina en el botón").toBeLessThan(24);
    await expect(boton).toBeFocused();
  });
});

test.describe("Select propio", () => {
  test("se abre con teclado, elige con Enter, escribe para saltar y devuelve el foco", async ({ page }) => {
    await openStory(page, "átomos-select--default");
    const trigger = page.getByRole("combobox", { name: "Medio de pago" });
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("option", { name: "Nequi" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(list).toHaveCount(0);
    await expect(trigger).toContainText("Efectivo");
    await expect(trigger).toBeFocused();
    // Escribir salta a la opción que empieza con esas letras.
    await page.keyboard.press("Enter");
    await page.keyboard.type("tr");
    await page.keyboard.press("Enter");
    await expect(trigger).toContainText("Transferencia");
  });

  test("con mouse elige, Escape cierra sin cambiar y el valor llega al formulario", async ({ page }) => {
    await openStory(page, "átomos-select--default");
    const trigger = page.getByRole("combobox", { name: "Medio de pago" });
    await trigger.click();
    await page.getByRole("option", { name: "Tarjeta" }).click();
    await expect(trigger).toContainText("Tarjeta");
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(trigger).toContainText("Tarjeta");
    // El <select> real oculto es el que viaja en el formulario.
    const native = await page.locator("select[aria-hidden=true]").inputValue();
    expect(native).toBe("Tarjeta");
  });

  test("axe con la lista abierta, en claro y oscuro", async ({ page }) => {
    await openStory(page, "átomos-select--default");
    await page.getByRole("combobox", { name: "Medio de pago" }).click();
    await page.getByRole("listbox").waitFor();
    await expectNoAxeViolations(page);
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expectNoAxeViolations(page);
  });

  test("dentro de un diálogo: elegir no lo cierra y Escape cierra solo la lista", async ({ page }) => {
    await openStory(page, "átomos-select--inside-dialog");
    const dialog = page.getByRole("dialog");
    const trigger = dialog.getByRole("combobox", { name: "Medio de pago" });
    await trigger.click();
    await page.getByRole("option", { name: "Efectivo" }).click();
    await expect(dialog).toBeVisible();
    await expect(trigger).toContainText("Efectivo");
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(dialog).toBeVisible();
  });
});

test.describe("Panel lateral: entra y sale deslizándose por su borde", () => {
  test.skip(({ isMobile }) => isMobile, "En móvil es una hoja inferior");

  test("sin morfeo desde el botón; se desliza al abrir y al cerrar", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 600 });
    await openStory(page, "organismos-formsheet--drawer");
    await page.evaluate(() => {
      const xs: number[] = ((window as unknown as { __x: number[] }).__x = []);
      const t0 = performance.now();
      const tick = () => {
        const d = document.querySelector('[role="dialog"]');
        xs.push(d ? Math.round(d.getBoundingClientRect().x) : -1);
        if (performance.now() - t0 < 2600) requestAnimationFrame(tick);
      };
      tick();
    });
    await page.getByRole("button", { name: "Editar cliente" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    expect(await dialog.evaluate((el) => el.hasAttribute("data-morph"))).toBe(false);
    await page.waitForTimeout(700);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page.waitForTimeout(300);
    const xs = (await page.evaluate(() => (window as unknown as { __x: number[] }).__x)).filter((x) => x >= 0);
    // El borde izquierdo del panel parte a la derecha de su sitio final (660) y vuelve a salir hacia la derecha.
    const final = Math.min(...xs);
    const firstFrame = xs[0];
    const lastFrame = xs[xs.length - 1];
    expect(firstFrame, "al abrir parte desde fuera, por la derecha").toBeGreaterThan(final + 100);
    expect(lastFrame, "al cerrar termina fuera, por la derecha").toBeGreaterThan(final + 100);
    // Nunca pasa por la zona del botón (a la izquierda): no es un morfeo.
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(600);
  });
});

test.describe("Salida animada aunque el padre desmonte el panel", () => {
  test.skip(({ isMobile }) => isMobile, "La hoja móvil se cubre en el CSS; aquí se mide PC");

  async function closeFrames(page: import("@playwright/test").Page, story: string, button: string) {
    await page.setViewportSize({ width: 1100, height: 600 });
    await openStory(page, story);
    await page.getByRole("button", { name: button }).click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      const f: { t: number; x: number; y: number; w: number; op: number; ghost: boolean; any: boolean }[] = ((window as unknown as { __g: unknown[] }).__g = []) as never;
      const t0 = performance.now();
      const tick = () => {
        const el = document.querySelector('[data-ghost][role="dialog"]') ?? document.querySelector('[role="dialog"]');
        const r = el?.getBoundingClientRect();
        f.push({ t: Math.round(performance.now() - t0), x: r ? Math.round(r.x + r.width / 2) : -1, y: r ? Math.round(r.y + r.height / 2) : -1, w: r ? Math.round(r.width) : -1, op: el ? +getComputedStyle(el).opacity : -1, ghost: !!el?.hasAttribute("data-ghost"), any: !!el });
        if (performance.now() - t0 < 1400) requestAnimationFrame(tick);
      };
      tick();
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1500);
    return page.evaluate(() => (window as unknown as { __g: { t: number; x: number; y: number; w: number; op: number; ghost: boolean; any: boolean }[] }).__g);
  }

  test("modal: se queda una copia que vuelve al botón y luego desaparece", async ({ page }) => {
    const frames = await closeFrames(page, "organismos-responsivesheet--mounted-only-while-open-dialog", "Abrir modal");
    const ghost = frames.filter((f) => f.ghost);
    expect(ghost.length, "debe haber copia animada tras desmontar").toBeGreaterThan(8);
    expect(ghost[0].x).toBeGreaterThan(400); // arranca en su sitio (centro)
    expect(ghost.at(-1)!.x, "termina cerca del botón (arriba a la izquierda)").toBeLessThan(250);
    expect(frames.at(-1)!.any, "la copia se borra sola").toBe(false);
  });

  test("panel lateral: la copia se desliza hacia la derecha y desaparece", async ({ page }) => {
    const frames = await closeFrames(page, "organismos-responsivesheet--mounted-only-while-open-drawer", "Abrir panel");
    const ghost = frames.filter((f) => f.ghost);
    expect(ghost.length).toBeGreaterThan(8);
    expect(ghost.at(-1)!.x, "sale por la derecha").toBeGreaterThan(ghost[0].x + 150);
    expect(frames.at(-1)!.any).toBe(false);
  });
});

test.describe("Cambios sin guardar", () => {
  const open = async (page: import("@playwright/test").Page, story = "organismos-formsheet--dialog", button = "Nuevo cliente") => {
    await openStory(page, story);
    await page.getByRole("button", { name: button }).click();
    await page.getByRole("dialog", { name: button === "Nuevo cliente" ? "Nuevo cliente" : /./ }).first().waitFor();
  };

  test("sin datos escritos se cierra sin preguntar", async ({ page }) => {
    await open(page);
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("con datos pregunta; «Seguir editando» conserva lo escrito y «Descartar» cierra", async ({ page }) => {
    await open(page);
    await page.getByLabel(/Nombre completo/).fill("María Torres");
    await page.keyboard.press("Escape");
    const ask = page.getByRole("dialog", { name: "¿Guardar los cambios?" });
    await expect(ask).toBeVisible();

    await ask.getByRole("button", { name: "Seguir editando" }).click();
    await expect(ask).toHaveCount(0);
    await expect(page.getByLabel(/Nombre completo/)).toHaveValue("María Torres");

    // También con el botón Cancelar y con la X.
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog", { name: "¿Guardar los cambios?" })).toBeVisible();
    await page.getByRole("button", { name: "Descartar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 3000 });
  });

  test("«Guardar» envía el formulario y cierra", async ({ page }) => {
    await open(page);
    await page.getByLabel(/Nombre completo/).fill("María Torres");
    await page.getByRole("button", { name: "Cerrar" }).click();
    await page.getByRole("dialog", { name: "¿Guardar los cambios?" }).getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 4000 });
  });

  test("si el formulario es inválido, «Guardar» deja el panel abierto con el error", async ({ page }) => {
    await open(page);
    // Solo el correo: falta el nombre obligatorio.
    await page.getByLabel(/Correo electrónico/).fill("a@b.co");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "¿Guardar los cambios?" }).getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("dialog", { name: "Nuevo cliente" })).toBeVisible();
  });

  test("axe con la pregunta abierta", async ({ page }) => {
    await open(page);
    await page.getByLabel(/Nombre completo/).fill("María Torres");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "¿Guardar los cambios?" }).waitFor();
    await expectNoAxeViolations(page);
  });
});

test.describe("Pregunta de cambios sin guardar: edición, fondo y animación", () => {
  test.skip(({ isMobile }) => isMobile, "Se mide la capa de PC");

  test("también en edición: cambiar un dato pregunta; dejarlo igual o revertirlo no", async ({ page }) => {
    await openStory(page, "organismos-formsheet--drawer");
    await page.getByRole("button", { name: "Editar cliente" }).click();
    await page.getByRole("dialog", { name: "Carlos Peña" }).waitFor();
    await page.waitForTimeout(500);
    // Sin tocar nada: cierra sin preguntar.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "Editar cliente" }).click();
    const name = page.getByLabel(/Nombre completo/);
    await name.fill("Carlos Peña Ruiz");
    await name.fill("Carlos Peña"); // vuelve a como estaba
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "Editar cliente" }).click();
    await page.getByLabel(/Nombre completo/).fill("Carlos Peña Ruiz");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "¿Guardar los cambios?" })).toBeVisible();
  });

  test("sin <form>: pregunta y «Guardar» pulsa el botón principal del pie", async ({ page }) => {
    await openStory(page, "organismos-responsivesheet--edit-without-form");
    await page.getByRole("button", { name: "Editar sin formulario" }).click();
    await page.getByLabel("Nombre").fill("Carlos Peña Ruiz");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "¿Guardar los cambios?" }).getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Guardado: Carlos Peña Ruiz" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 3000 });
  });

  test("la pregunta tiene fondo oscuro y difuminado propio, y se va rápido", async ({ page }) => {
    await openStory(page, "organismos-formsheet--dialog");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    await page.getByLabel(/Nombre completo/).fill("María");
    await page.keyboard.press("Escape");
    const ask = page.getByRole("dialog", { name: "¿Guardar los cambios?" });
    await ask.waitFor();
    await page.waitForTimeout(300);
    const scrims = await page.evaluate(() =>
      [...document.querySelectorAll("[data-state=open]")]
        .filter((el) => getComputedStyle(el).position === "fixed" && el.getAttribute("role") !== "dialog" && getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)")
        .map((el) => ({ bg: getComputedStyle(el).backgroundColor, blur: getComputedStyle(el).backdropFilter })),
    );
    expect(scrims.some((s) => s.blur.includes("blur"))).toBe(true);

    // «Descartar»: el aviso desaparece en un instante y el panel sale después con su animación.
    const t0 = Date.now();
    await ask.getByRole("button", { name: "Descartar" }).click();
    await expect(ask).toHaveCount(0, { timeout: 1000 });
    expect(Date.now() - t0, "el aviso se va rápido").toBeLessThan(700);
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 2500 });
  });
});
