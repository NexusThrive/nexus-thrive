/**
 * NÚCLEO — guard de acceso a módulos (solo se opera con el módulo ACTIVO).
 *
 * Resuelve el slug contra el catálogo REAL desde que existe la tabla
 * Plantilla (2026-09-22): un slug puede ser un MÓDULO (Module) o un
 * alias de PLANTILLA (Plantilla) — en cuyo caso se exige al menos un
 * módulo miembro ACTIVO en la org.
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/core/prisma";
import { requiereSesion, getOrgActiva } from "@/lib/core/org";

export async function requiereModuloActivo(slug: string) {
  const { email } = await requiereSesion();
  const { org } = await getOrgActiva();

  // 1) Slug de módulo real (Module) — el caso normal.
  const modulo = await prisma.module.findUnique({ where: { slug } });
  if (modulo) {
    const om = await prisma.organizationModule.findUnique({
      where: { orgId_moduleId: { orgId: org.id, moduleId: modulo.id } },
    });
    if (om?.estado === "ACTIVO") return { email, orgId: org.id };
  }

  // 2) Slug de plantilla (ej: "gym") — habilita si ALGÚN módulo miembro está ACTIVO.
  const plantilla = await prisma.plantilla.findUnique({
    where: { slug },
    include: { modulos: { include: { module: true } } },
  });
  if (plantilla && plantilla.modulos.length > 0) {
    const activos = await prisma.organizationModule.findMany({
      where: {
        orgId: org.id,
        estado: "ACTIVO",
        moduleId: { in: plantilla.modulos.map((pm) => pm.moduleId) },
      },
      take: 1,
    });
    if (activos.length > 0) return { email, orgId: org.id };
  }

  redirect("/");
}
