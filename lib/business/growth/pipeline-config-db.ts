import { db } from "@/prisma/db";
import { ensureStages } from "./pipeline-db";

/** Configuración del CRM por negocio: etapas, motivos de pérdida, etiquetas y equipos. Todo por `tenantId`. */

type Result = { ok: true } | { ok: false; message: string };
const cleanName = (n: string, max = 60) => n.trim().replace(/\s+/g, " ").slice(0, max);

export async function crmConfig(tenantId: string) {
  const stages = await ensureStages(tenantId);
  const [reasons, tags, teams, team, counts] = await Promise.all([
    db.orm.public.CrmLostReason.where({ tenantId }).orderBy((r) => r.position.asc()).select("id", "name").all(),
    db.orm.public.CrmTag.where({ tenantId }).orderBy((t) => t.name.asc()).select("id", "name").all(),
    db.orm.public.CrmTeam.where({ tenantId }).orderBy((t) => t.name.asc()).select("id", "name", "memberIds").all(),
    db.orm.public.User.where({ tenantId, active: true }).select("id", "name", "email").all(),
    db.orm.public.Opportunity.where({ tenantId, status: "OPEN" }).select("stageId").limit(5000).all(),
  ]);
  const inStage = new Map<string, number>();
  for (const o of counts) if (o.stageId) inStage.set(o.stageId, (inStage.get(o.stageId) ?? 0) + 1);
  return {
    stages: stages.map((s) => ({ ...s, open: inStage.get(s.id) ?? 0 })),
    reasons,
    tags,
    teams: teams.map((t) => ({ id: t.id, name: t.name, memberIds: [...(t.memberIds ?? [])] })),
    people: team.map((u) => ({ id: u.id, name: u.name?.trim() || u.email?.split("@")[0] || "Integrante" })),
  };
}

/** Crea una etapa antes de la ganada. */
export async function createStage(tenantId: string, name: string, probability: number): Promise<Result> {
  const n = cleanName(name, 40);
  if (n.length < 2) return { ok: false, message: "Escribe el nombre de la etapa." };
  if (!(probability >= 0 && probability <= 100)) return { ok: false, message: "La probabilidad va de 0 a 100." };
  const stages = await ensureStages(tenantId);
  if (stages.length >= 12) return { ok: false, message: "Máximo 12 etapas." };
  const won = stages.find((s) => s.isWon);
  await db.transaction(async (tx) => {
    const at = won ? won.position : stages.length;
    if (won) await tx.orm.public.CrmStage.where({ tenantId, id: won.id }).update({ position: at + 1 });
    await tx.orm.public.CrmStage.create({ tenantId, name: n, position: at, probability: Math.round(probability) });
  });
  return { ok: true };
}

/** Renombra una etapa o cambia su probabilidad por defecto (la ganada siempre es 100 %). */
export async function updateStage(tenantId: string, id: string, patch: { name?: string; probability?: number }): Promise<Result> {
  const s = await db.orm.public.CrmStage.where({ tenantId, id }).first();
  if (!s) return { ok: false, message: "Esa etapa no existe." };
  const name = patch.name !== undefined ? cleanName(patch.name, 40) : undefined;
  if (name !== undefined && name.length < 2) return { ok: false, message: "Escribe el nombre de la etapa." };
  if (patch.probability !== undefined && !(patch.probability >= 0 && patch.probability <= 100)) return { ok: false, message: "La probabilidad va de 0 a 100." };
  await db.orm.public.CrmStage.where({ tenantId, id }).update({ ...(name ? { name } : {}), ...(patch.probability !== undefined && !s.isWon ? { probability: Math.round(patch.probability) } : {}) });
  return { ok: true };
}

/** Sube o baja una etapa (la ganada se queda al final). */
export async function moveStageOrder(tenantId: string, id: string, delta: -1 | 1): Promise<Result> {
  const stages = (await ensureStages(tenantId)).filter((s) => !s.isWon);
  const i = stages.findIndex((s) => s.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= stages.length) return { ok: false, message: "No se puede mover más." };
  const a = stages[i]!;
  const b = stages[j]!;
  await db.transaction(async (tx) => {
    await tx.orm.public.CrmStage.where({ tenantId, id: a.id }).update({ position: b.position });
    await tx.orm.public.CrmStage.where({ tenantId, id: b.id }).update({ position: a.position });
  });
  return { ok: true };
}

/** Elimina una etapa sin oportunidades abiertas (la ganada y la última abierta no se eliminan). */
export async function deleteStage(tenantId: string, id: string): Promise<Result> {
  const stages = await ensureStages(tenantId);
  const s = stages.find((x) => x.id === id);
  if (!s) return { ok: false, message: "Esa etapa no existe." };
  if (s.isWon) return { ok: false, message: "La etapa ganada no se elimina." };
  if (stages.filter((x) => !x.isWon).length <= 1) return { ok: false, message: "Debe quedar al menos una etapa abierta." };
  if (await db.orm.public.Opportunity.where({ tenantId, stageId: id, status: "OPEN" }).select("id").first()) return { ok: false, message: "Tiene oportunidades abiertas: muévelas antes de eliminarla." };
  await db.orm.public.CrmStage.where({ tenantId, id }).deleteAll();
  return { ok: true };
}

export async function addLostReason(tenantId: string, name: string): Promise<Result> {
  const n = cleanName(name);
  if (n.length < 2) return { ok: false, message: "Escribe el motivo." };
  const count = (await db.orm.public.CrmLostReason.where({ tenantId }).select("id").all()).length;
  if (count >= 30) return { ok: false, message: "Máximo 30 motivos." };
  await db.orm.public.CrmLostReason.create({ tenantId, name: n, position: count });
  return { ok: true };
}

export async function renameLostReason(tenantId: string, id: string, name: string): Promise<Result> {
  const n = cleanName(name);
  if (n.length < 2) return { ok: false, message: "Escribe el motivo." };
  await db.orm.public.CrmLostReason.where({ tenantId, id }).update({ name: n });
  return { ok: true };
}

export async function deleteLostReason(tenantId: string, id: string): Promise<Result> {
  await db.orm.public.CrmLostReason.where({ tenantId, id }).deleteAll();
  return { ok: true };
}

export async function addTag(tenantId: string, name: string): Promise<Result> {
  const n = cleanName(name, 40);
  if (n.length < 2) return { ok: false, message: "Escribe la etiqueta." };
  if (await db.orm.public.CrmTag.where({ tenantId, name: n }).select("id").first()) return { ok: false, message: "Esa etiqueta ya existe." };
  await db.orm.public.CrmTag.create({ tenantId, name: n });
  return { ok: true };
}

/** Quita la etiqueta de la lista (las oportunidades que ya la tienen la conservan). */
export async function deleteTag(tenantId: string, id: string): Promise<Result> {
  await db.orm.public.CrmTag.where({ tenantId, id }).deleteAll();
  return { ok: true };
}

export async function saveTeam(tenantId: string, id: string | null, name: string, memberIds: string[]): Promise<Result> {
  const n = cleanName(name);
  if (n.length < 2) return { ok: false, message: "Escribe el nombre del equipo." };
  const valid = new Set((await db.orm.public.User.where({ tenantId, active: true }).select("id").all()).map((u) => u.id));
  const members = [...new Set(memberIds)].filter((m) => valid.has(m)).slice(0, 50);
  if (id) await db.orm.public.CrmTeam.where({ tenantId, id }).update({ name: n, memberIds: members });
  else await db.orm.public.CrmTeam.create({ tenantId, name: n, memberIds: members });
  return { ok: true };
}

export async function deleteTeam(tenantId: string, id: string): Promise<Result> {
  await db.transaction(async (tx) => {
    await tx.orm.public.Opportunity.where({ tenantId, teamId: id }).update({ teamId: null });
    await tx.orm.public.CrmTeam.where({ tenantId, id }).deleteAll();
  });
  return { ok: true };
}
