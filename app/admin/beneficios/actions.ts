"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/ops/access";
import { logOps } from "@/lib/ops/audit";
import { createBenefitCode, setBenefitActive, updateBenefitCode } from "@/lib/benefits/benefits-db";
import { normalizeBenefitKind } from "@/lib/benefits/benefits";

/** Accesos a NEXUS (códigos promo y códigos de acceso pagado). `catalog.edit`. */

const PERMISSION = "catalog.edit";
const BACK = "/admin/beneficios";

export async function createBenefitAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff(PERMISSION);
  if (!ctx) redirect(`${BACK}?error=${encodeURIComponent("No tienes permiso para esta acción.")}`);

  const label = String(formData.get("label") ?? "");
  const codeRaw = String(formData.get("code") ?? "").trim();
  const plan = String(formData.get("plan") ?? "ELITE");
  const kind = normalizeBenefitKind(formData.get("kind"));
  const durationDays = Number(formData.get("durationDays") ?? 30);
  const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "");

  const result = await createBenefitCode(
    {
      label,
      code: codeRaw || undefined,
      plan,
      kind,
      durationDays: Number.isFinite(durationDays) ? durationDays : 30,
      maxUses: maxUsesRaw ? Number(maxUsesRaw) : null,
      expiresAt: expiresRaw ? new Date(expiresRaw).toISOString() : null,
      notes,
    },
    ctx.staffId,
  );

  if (!result.ok) redirect(`${BACK}?error=${encodeURIComponent(result.message)}`);

  await logOps(ctx, "BENEFIT_CREATE", {
    metadata: { code: result.code, label, plan, kind, durationDays },
  });
  revalidatePath(BACK);
  redirect(
    `${BACK}?ok=${encodeURIComponent(
      kind === "PAID"
        ? `Acceso pagado ${result.code} creado. Envíale el código al cliente.`
        : `Código ${result.code} creado.`,
    )}`,
  );
}

export async function toggleBenefitAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff(PERMISSION);
  if (!ctx) redirect(`${BACK}?error=${encodeURIComponent("No tienes permiso para esta acción.")}`);

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) redirect(`${BACK}?error=${encodeURIComponent("Código no válido.")}`);

  await setBenefitActive(id, active);
  await logOps(ctx, "BENEFIT_UPDATE", { metadata: { id, active } });
  revalidatePath(BACK);
  redirect(`${BACK}?ok=${encodeURIComponent(active ? "Beneficio activado." : "Beneficio pausado.")}`);
}

export async function updateBenefitAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff(PERMISSION);
  if (!ctx) redirect(`${BACK}?error=${encodeURIComponent("No tienes permiso para esta acción.")}`);

  const id = String(formData.get("id") ?? "");
  if (!id) redirect(`${BACK}?error=${encodeURIComponent("Beneficio no válido.")}`);

  const durationDays = Number(formData.get("durationDays") ?? 30);
  const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();

  const result = await updateBenefitCode(id, {
    label: String(formData.get("label") ?? ""),
    plan: String(formData.get("plan") ?? "ELITE"),
    kind: normalizeBenefitKind(formData.get("kind")),
    durationDays: Number.isFinite(durationDays) ? durationDays : 30,
    maxUses: maxUsesRaw ? Number(maxUsesRaw) : null,
    expiresAt: expiresRaw ? new Date(expiresRaw).toISOString() : null,
    notes: String(formData.get("notes") ?? ""),
  });

  if (!result.ok) redirect(`${BACK}?error=${encodeURIComponent(result.message)}`);

  await logOps(ctx, "BENEFIT_UPDATE", { metadata: { id, kind: "edit" } });
  revalidatePath(BACK);
  redirect(`${BACK}?ok=${encodeURIComponent("Beneficio actualizado.")}`);
}
