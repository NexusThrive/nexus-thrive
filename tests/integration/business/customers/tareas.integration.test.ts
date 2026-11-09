import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { createTask, listTasks, overdueCountFor, projectOptions, setTaskDone, teamOptions, updateTask } from "@/lib/business/customers/tasks-db";

/** HU-actividades-01: tareas con fecha y responsable, sin cruzar negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("tareas (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let me = "";
  let ana = "";
  let outsider = "";
  let customerId = "";
  const TODAY = "2026-11-07";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Tareas A", slug: `ta-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `ta-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Tareas B", slug: `tb-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `tb-${suffix}@ejemplo.com` })).id);
    const mk = async (tenantId: string, name: string) => (await db.orm.public.User.create({ tenantId, name, email: `${name.toLowerCase()}-${suffix}@ejemplo.com`, clerkUserId: `clerk_${name}_${suffix}` } as never)).id;
    me = await mk(a, "Yo");
    ana = await mk(a, "Ana");
    outsider = await mk(b, "Ajeno");
    customerId = (await db.orm.public.Customer.create({ tenantId: a, name: "Camila" })).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("crea con fecha y responsable, y valida título, contacto y responsable del mismo negocio", async () => {
    expect(await createTask(a, { title: "ab" }, me)).toMatchObject({ ok: false });
    expect(await createTask(a, { title: "Llamar a Camila", customerId: "00000000-0000-0000-0000-000000000000" }, me)).toMatchObject({ ok: false });
    expect(await createTask(a, { title: "Llamar a Camila", assigneeId: outsider }, me)).toMatchObject({ ok: false, message: "Esa persona no es del equipo de este negocio." });
    expect(await createTask(a, { title: "Llamar a Camila", dueDay: "2026-11-03", assigneeId: me, customerId }, me)).toMatchObject({ ok: true });
    expect(await createTask(a, { title: "Enviar cotización", dueDay: "2026-11-09", assigneeId: me }, me)).toMatchObject({ ok: true });
    expect(await createTask(a, { title: "Cobrar saldo", dueDay: "2026-11-01", assigneeId: ana }, me)).toMatchObject({ ok: true });
    expect(await createTask(a, { title: "Sin dueño ni fecha" }, me)).toMatchObject({ ok: true });
    expect((await teamOptions(a)).map((u) => u.name)).toEqual(["Ana", "Yo"]);
  });

  test("«asignadas a mí» y «vencidas» muestran lo correcto, con las atrasadas primero", async () => {
    const mine = await listTasks(a, "mine", me, TODAY);
    expect(mine.map((t) => t.title)).toEqual(["Llamar a Camila", "Enviar cotización"]);
    expect(mine[0]).toMatchObject({ overdue: true, customerName: "Camila", assigneeName: "Yo" });
    expect(mine[1]!.overdue).toBe(false);
    const overdue = await listTasks(a, "overdue", me, TODAY);
    expect(overdue.map((t) => t.title)).toEqual(["Cobrar saldo", "Llamar a Camila"]);
    expect((await listTasks(a, "all", me, TODAY)).map((t) => t.title).at(-1)).toBe("Sin dueño ni fecha");
    expect(await overdueCountFor(a, me, TODAY)).toBe(1);
    expect(await overdueCountFor(a, ana, TODAY)).toBe(1);
  });

  test("completar y reabrir; reprogramar solo las abiertas; nada cruza de negocio", async () => {
    const [first] = await listTasks(a, "mine", me, TODAY);
    expect(await setTaskDone(b, first!.id, true, outsider)).toMatchObject({ ok: false });
    expect(await setTaskDone(a, first!.id, true, me)).toEqual({ ok: true });
    expect(await setTaskDone(a, first!.id, true, me)).toMatchObject({ ok: false });
    expect(await overdueCountFor(a, me, TODAY)).toBe(0);
    expect((await listTasks(a, "mine", me, TODAY)).map((t) => t.title)).toEqual(["Enviar cotización"]);
    expect(await updateTask(a, first!.id, { dueDay: "2026-11-20" })).toMatchObject({ ok: false });
    expect(await setTaskDone(a, first!.id, false, me)).toEqual({ ok: true });
    expect(await updateTask(a, first!.id, { dueDay: "2026-11-20", assigneeId: ana })).toEqual({ ok: true });
    expect(await updateTask(a, first!.id, { dueDay: "mañana" })).toMatchObject({ ok: false });
    expect((await listTasks(a, "mine", ana, TODAY)).map((t) => t.title)).toContain("Llamar a Camila");
    expect(await listTasks(b, "all", outsider, TODAY)).toEqual([]);
  });

  test("una tarea se liga a un proyecto del mismo negocio y se lista con su nombre", async () => {
    const project = await db.orm.public.Project.create({ tenantId: a, customerId, code: `PROY-${suffix}`, name: "Campaña de marca" } as never);
    const foreign = await db.orm.public.Customer.create({ tenantId: b, name: "Ajena" });
    const foreignProject = await db.orm.public.Project.create({ tenantId: b, customerId: foreign.id, code: `PROY-B-${suffix}`, name: "Ajeno" } as never);
    expect(await createTask(a, { title: "Diseñar el logo", projectId: foreignProject.id }, me)).toMatchObject({ ok: false, message: "El proyecto no existe en este negocio." });
    expect(await createTask(a, { title: "Diseñar el logo", projectId: project.id, assigneeId: ana }, me)).toMatchObject({ ok: true });
    const row = (await listTasks(a, "all", me, TODAY)).find((t) => t.title === "Diseñar el logo");
    expect(row).toMatchObject({ projectId: project.id, projectName: "Campaña de marca", assigneeName: "Ana" });
    expect((await projectOptions(a)).map((p) => p.name)).toContain("Campaña de marca");
    expect(await projectOptions(b)).toEqual([{ id: foreignProject.id, name: "Ajeno" }]);
  });
});
