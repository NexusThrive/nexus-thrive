import { describe, expect, it } from "vitest";
import { opsActiveKey, opsNavFor } from "./nav";

describe("navegación del Operations Center", () => {
  it("filtra por permisos y oculta lo no construido", () => {
    const soporte = opsNavFor(["accounts.view"]).flatMap((g) => g.items.map((i) => i.key));
    expect(soporte).toContain("negocios");
    expect(soporte).not.toContain("equipo");
    expect(soporte).not.toContain("crm"); // aún no construido
  });
  it("activa por el prefijo más largo", () => {
    const groups = opsNavFor(["accounts.view", "team.invite", "audit.view"]);
    expect(opsActiveKey(groups, "/admin")).toBe("inicio");
    expect(opsActiveKey(groups, "/admin/negocios/abc")).toBe("negocios");
    expect(opsActiveKey(groups, "/admin/equipo/roles")).toBe("equipo");
  });
});
