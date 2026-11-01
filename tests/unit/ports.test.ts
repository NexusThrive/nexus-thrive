import { describe, expect, test } from "vitest";
import { declaredPorts, definePort, PortNotProvidedError, providedPorts } from "@/lib/ports";

describe("definePort", () => {
  test("usar un puerto sin implementación falla cerrado, con un mensaje que dice qué hacer", () => {
    const port = definePort<{ ping(): string }>("prueba-sin-conectar");
    expect(port.isProvided()).toBe(false);
    expect(() => port.use()).toThrow(PortNotProvidedError);
    expect(() => port.use()).toThrow(/prueba-sin-conectar.*lib\/runtime\/ports\.ts/);
  });

  test("el error lleva el nombre del puerto y se puede reconocer", () => {
    const port = definePort<unknown>("prueba-error");
    try {
      port.use();
      throw new Error("debía fallar");
    } catch (error) {
      expect(error).toBeInstanceOf(PortNotProvidedError);
      expect((error as PortNotProvidedError).port).toBe("prueba-error");
      expect((error as Error).name).toBe("PortNotProvidedError");
    }
  });

  test("provide conecta, use devuelve esa implementación y provide de nuevo la reemplaza", () => {
    const port = definePort<{ valor(): number }>("prueba-reemplazo");
    port.provide({ valor: () => 1 });
    expect(port.isProvided()).toBe(true);
    expect(port.use().valor()).toBe(1);
    port.provide({ valor: () => 2 });
    expect(port.use().valor()).toBe(2);
  });

  test("dos referencias al mismo nombre comparten la implementación (el registro es global, no por módulo)", () => {
    const a = definePort<{ n: number }>("prueba-compartido");
    const b = definePort<{ n: number }>("prueba-compartido");
    a.provide({ n: 7 });
    expect(b.use().n).toBe(7);
  });

  test("cada puerto es independiente de los demás", () => {
    const a = definePort<string>("prueba-independiente-a");
    const b = definePort<string>("prueba-independiente-b");
    a.provide("a");
    expect(b.isProvided()).toBe(false);
  });

  test("declaredPorts y providedPorts reflejan lo declarado y lo conectado, ordenados", () => {
    definePort<string>("prueba-listado-z").provide("z");
    definePort<string>("prueba-listado-a");
    expect(declaredPorts()).toEqual(expect.arrayContaining(["prueba-listado-a", "prueba-listado-z"]));
    expect(providedPorts()).toContain("prueba-listado-z");
    expect(providedPorts()).not.toContain("prueba-listado-a");
    expect([...providedPorts()]).toEqual([...providedPorts()].sort());
  });
});
