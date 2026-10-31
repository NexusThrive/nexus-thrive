/**
 * Quién puede leer un archivo guardado: miembro activo del negocio, o quien el
 * llamador autorice como equipo NEXUS (`staffAccess`). Para cualquier otro, `null`
 * (no se revela que existe). Core no conoce al equipo de NEXUS: la compuerta llega
 * como parámetro y solo se evalúa si quien pide NO es miembro.
 */
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { db } from "@/prisma/db";
import { readApuImageFor, readAttachmentFor } from "@/lib/core/files/stored-files";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("lectura de archivos guardados (integración)", () => {
  let tenantId = "";
  let otherTenantId = "";
  let attachmentId = "";
  let imageId = "";
  const member = `user_member_${Date.now().toString(36)}`;
  const inactive = `user_inactive_${Date.now().toString(36)}`;
  const stranger = `user_stranger_${Date.now().toString(36)}`;
  const deny = vi.fn(async () => false);
  const allow = vi.fn(async () => true);

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const suffix = Date.now().toString(36);
    tenantId = (await db.orm.public.Tenant.create({ name: "Archivos A", slug: `test-files-a-${suffix}`, vertical: "general" })).id;
    otherTenantId = (await db.orm.public.Tenant.create({ name: "Archivos B", slug: `test-files-b-${suffix}`, vertical: "general" })).id;
    await db.orm.public.User.create({ clerkUserId: member, email: `${member}@ejemplo.com`, tenantId, role: "OWNER", active: true });
    await db.orm.public.User.create({ clerkUserId: inactive, email: `${inactive}@ejemplo.com`, tenantId, role: "STAFF", active: false });
    await db.orm.public.User.create({ clerkUserId: stranger, email: `${stranger}@ejemplo.com`, tenantId: otherTenantId, role: "OWNER", active: true });
    attachmentId = (
      await db.orm.public.Attachment.create({ tenantId, kind: "receipt", ownerId: "x", fileName: "recibo.pdf", mimeType: "application/pdf", byteSize: 3, sha256: "a".repeat(64), data: new Uint8Array([1, 2, 3]) })
    ).id;
    imageId = (await db.orm.public.ApuImage.create({ tenantId, sha256: "b".repeat(64), mimeType: "image/png", byteSize: 2, data: new Uint8Array([4, 5]) })).id;
  });

  afterAll(async () => {
    for (const id of [tenantId, otherTenantId]) if (id) await db.orm.public.Tenant.where({ id }).delete();
  });

  test("un miembro activo lee el archivo y la compuerta del equipo NEXUS ni se consulta", async () => {
    deny.mockClear();
    const file = await readAttachmentFor(member, attachmentId, deny);
    expect(file?.fileName).toBe("recibo.pdf");
    expect(Array.from(file!.data)).toEqual([1, 2, 3]);
    expect(deny).not.toHaveBeenCalled();
  });

  test("lo mismo con la foto de un insumo", async () => {
    deny.mockClear();
    const image = await readApuImageFor(member, imageId, deny);
    expect(image?.mimeType).toBe("image/png");
    expect(deny).not.toHaveBeenCalled();
  });

  test.each([
    ["miembro de otro negocio", () => stranger],
    ["miembro desactivado", () => inactive],
    ["cuenta desconocida", () => "user_inexistente"],
  ])("%s: null si la compuerta del equipo NEXUS dice que no", async (_n, who) => {
    deny.mockClear();
    expect(await readAttachmentFor(who(), attachmentId, deny)).toBeNull();
    expect(await readApuImageFor(who(), imageId, deny)).toBeNull();
    expect(deny).toHaveBeenCalledTimes(2);
  });

  test("el equipo NEXUS autorizado por la compuerta puede leer aunque no sea miembro", async () => {
    allow.mockClear();
    expect((await readAttachmentFor(stranger, attachmentId, allow))?.fileName).toBe("recibo.pdf");
    expect((await readApuImageFor(stranger, imageId, allow))?.mimeType).toBe("image/png");
    expect(allow).toHaveBeenCalledTimes(2);
  });

  test("identificadores que no son UUID o no existen devuelven null sin consultar la compuerta", async () => {
    allow.mockClear();
    expect(await readAttachmentFor(member, "no-es-uuid", allow)).toBeNull();
    expect(await readApuImageFor(member, "../../etc/passwd", allow)).toBeNull();
    expect(await readAttachmentFor(member, "00000000-0000-0000-0000-000000000000", allow)).toBeNull();
    expect(allow).not.toHaveBeenCalled();
  });
});
