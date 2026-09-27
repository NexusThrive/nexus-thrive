/**
 * NÚCLEO — guard de acceso a módulos (solo se opera con el módulo ACTIVO).
 *
 * NOTA (2026-09-16): el catálogo actual sigue teniendo "gym" como slug de
 * Module (representa la PLANTILLA mientras no exista la tabla Plantilla).
 * Cuando se rediseñe la DB (catálogo por módulo + plantilla), este guard
 * validará contra el módulo de verdad (clientes, pagos, ...).
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/core/prisma";
import { requiereSesion, getOrgActiva } from "@/lib/core/org";

export async function requiereModuloActivo(slug: string) {
  const { email } = await requiereSesion();
  const { org } = await getOrgActiva();

  const modulo = await prisma.module.findUnique({ where: { slug } });
  const habilitado = modulo
    ? await prisma.organizationModule.findUnique({
        where: { orgId_moduleId: { orgId: org.id, moduleId: modulo.id } },
      })
    : null;
  if (!habilitado || habilitado.estado !== "ACTIVO") redirect("/");

  return { email, orgId: org.id };
}