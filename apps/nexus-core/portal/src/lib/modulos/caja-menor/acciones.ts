/**
 * MÓDULO CAJA MENOR — acciones server (rama core/base).
 * Solo operaciones reales: registrar movimiento (ingreso/egreso), anular,
 * gestionar categorías. La sesión sale del NÚCLEO (org activa) y acá se
 * verifica que la org tenga el módulo ACTIVO antes de operar.
 *
 * Regla de negocio: un EGRESO no puede dejar el saldo en negativo.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { TipoMovimientoCaja } from "@prisma/client";
import { prisma } from "@/lib/core/prisma";
import { requiereModuloActivo } from "@/lib/core/requiere-modulo";
import { saldoCaja } from "@/lib/modulos/caja-menor/datos";

/**
 * DELGADO: el gate real (sesión + org activa + módulo ACTIVO) vive en
 * `lib/core/requiere-modulo.ts`, el mismo que usan las demás acciones.
 * Este nombre se mantiene porque lo usan las páginas del módulo.
 */
async function requireModuloCajaMenor() {
  return requiereModuloActivo("caja-menor");
}

function str(input: FormData, key: string): string {
  return String(input.get(key) || "").trim();
}

function din(input: FormData, key: string): number {
  const v = Number(String(input.get(key) || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(v) ? v : 0;
}

// ---------------------------------------------------------------
// MOVIMIENTOS
// ---------------------------------------------------------------

/**
 * Registra un movimiento de caja (INGRESO o EGRESO).
 * - EGRESO con saldo insuficiente → rechazado (?error=saldo).
 * - La fecha es opcional: por defecto hoy.
 * - Un movimiento NUNCA se borra: se anula con motivo.
 */
export async function crearMovimientoCaja(input: FormData) {
  const { orgId } = await requireModuloCajaMenor();

  const tipoRaw = (str(input, "tipo") || "INGRESO").toUpperCase();
  const tipo: TipoMovimientoCaja = tipoRaw === "EGRESO" ? "EGRESO" : "INGRESO";
  const monto = din(input, "monto");
  if (monto <= 0) redirect("/modulos/caja-menor/movimientos?error=monto");

  const categoriaId = str(input, "categoriaId") || null;
  if (categoriaId) {
    const cat = await prisma.cajaCategoria.findFirst({
      where: { id: categoriaId, orgId, activo: true },
    });
    if (!cat) redirect("/modulos/caja-menor/movimientos?error=categoria");
  }

  if (tipo === "EGRESO") {
    const saldo = await saldoCaja(orgId);
    if (monto > saldo) redirect("/modulos/caja-menor/movimientos?error=saldo");
  }

  // Mediodía local: evita que una fecha "hoy" salte un día por zona horaria.
  const fechaRaw = str(input, "fecha");
  const fecha = fechaRaw ? new Date(`${fechaRaw}T12:00:00`) : new Date();

  await prisma.movimientoCaja.create({
    data: {
      orgId,
      tipo,
      monto,
      categoriaId,
      fecha,
      descripcion: str(input, "descripcion") || null,
    },
  });

  revalidatePath("/modulos/caja-menor");
  revalidatePath("/modulos/caja-menor/movimientos");
}

/** Anula un movimiento con motivo (nada se borra). */
export async function anularMovimientoCaja(input: FormData) {
  const { orgId } = await requireModuloCajaMenor();
  const id = str(input, "id");
  const motivo = str(input, "motivo");
  if (!id || !motivo) return;

  await prisma.movimientoCaja.updateMany({
    where: { id, orgId },
    data: { anulado: true, motivoAnulacion: motivo },
  });

  revalidatePath("/modulos/caja-menor");
  revalidatePath("/modulos/caja-menor/movimientos");
}

// ---------------------------------------------------------------
// CATEGORÍAS
// ---------------------------------------------------------------

/** Crea una categoría de caja: cada negocio usa las suyas. */
export async function crearCategoriaCaja(input: FormData) {
  const { orgId } = await requireModuloCajaMenor();
  const nombre = str(input, "nombre");
  const existe = await prisma.cajaCategoria.findUnique({
    where: { orgId_nombre: { orgId, nombre } },
  });
  if (!nombre || existe) redirect("/modulos/caja-menor/categorias?error=nombre");

  await prisma.cajaCategoria.create({ data: { orgId, nombre } });
  revalidatePath("/modulos/caja-menor/categorias");
  revalidatePath("/modulos/caja-menor/movimientos");
}

/** Desactiva una categoría (no borra: los movimientos la conservan). */
export async function desactivarCategoriaCaja(input: FormData) {
  const { orgId } = await requireModuloCajaMenor();
  const id = str(input, "id");
  if (!id) return;
  await prisma.cajaCategoria.updateMany({ where: { id, orgId }, data: { activo: false } });
  revalidatePath("/modulos/caja-menor/categorias");
  revalidatePath("/modulos/caja-menor/movimientos");
}

/** Reactiva una categoría desactivada. */
export async function reactivarCategoriaCaja(input: FormData) {
  const { orgId } = await requireModuloCajaMenor();
  const id = str(input, "id");
  if (!id) return;
  await prisma.cajaCategoria.updateMany({ where: { id, orgId }, data: { activo: true } });
  revalidatePath("/modulos/caja-menor/categorias");
  revalidatePath("/modulos/caja-menor/movimientos");
}