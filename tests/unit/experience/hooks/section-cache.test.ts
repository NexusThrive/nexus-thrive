import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSections, readSection, sectionCount, setSectionScope, writeSection } from "@/lib/experience/hooks/section-cache";

describe("caché de secciones en memoria", () => {
  beforeEach(() => {
    clearSections();
    setSectionScope("ana:negocio-1");
  });
  afterEach(() => vi.useRealTimers());

  it("devuelve lo último que se guardó", () => {
    writeSection("crm", { cards: 3 });
    expect(readSection<{ cards: number }>("crm")?.data).toEqual({ cards: 3 });
  });

  it("sin alcance no guarda ni lee nada", () => {
    clearSections();
    writeSection("crm", { cards: 3 });
    expect(readSection("crm")).toBeNull();
    expect(sectionCount()).toBe(0);
  });

  it("al cambiar la persona o el negocio se vacía todo", () => {
    writeSection("home", "datos de ana");
    setSectionScope("luis:negocio-1");
    expect(readSection("home")).toBeNull();
    setSectionScope("luis:negocio-2");
    writeSection("home", "datos de luis");
    setSectionScope("luis:negocio-1");
    expect(readSection("home")).toBeNull();
  });

  it("repetir el mismo alcance no borra nada", () => {
    writeSection("home", 1);
    setSectionScope("ana:negocio-1");
    expect(readSection("home")?.data).toBe(1);
  });

  it("caduca a los 10 minutos", () => {
    vi.useFakeTimers();
    writeSection("home", 1);
    vi.advanceTimersByTime(9 * 60_000);
    expect(readSection("home")).not.toBeNull();
    vi.advanceTimersByTime(2 * 60_000);
    expect(readSection("home")).toBeNull();
  });

  it("guarda pocas entradas y descarta la menos usada", () => {
    for (let i = 0; i < 24; i++) writeSection(`s${i}`, i);
    readSection("s0"); // s0 pasa a ser la más reciente
    writeSection("s24", 24);
    expect(sectionCount()).toBe(24);
    expect(readSection("s0")).not.toBeNull();
    expect(readSection("s1")).toBeNull();
  });

  it("cerrar sesión (clearSections) borra todo", () => {
    writeSection("home", 1);
    clearSections();
    expect(sectionCount()).toBe(0);
  });
});
