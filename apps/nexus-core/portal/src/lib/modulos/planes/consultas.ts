/**
 * MÓDULO PLANES — consultas seguras (capa Services).
 *
 * POR QUÉ EXISTE: las páginas leían `prisma.plan.findMany(...)` directamente.
 * Que una consulta funcione en la base no es lo mismo que estar autorizada a
 * leerla: la página es la capa de presentación y no debería poder saltarse el
 * scope por org. Además centraliza el filtro `activo` y el orden, que estaban
 * repetidos en tres sitios.
 */

import { prisma } from "@/lib/core/prisma";

/** Planes comercializables de la org, del más barato al más caro. */
export async function getPlanesDeOrg(orgId: string) {
  return prisma.plan.findMany({
    where: { orgId, activo: true },
    orderBy: { precio: "asc" },
  });
}
