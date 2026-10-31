import type { db } from "@/prisma/db";

/**
 * Transacción de la base de datos: lo que recibe el callback de `db.transaction`.
 *
 * Tipo de Foundation. Lo comparten el servicio de dinero (Business), el outbox de
 * eventos (Core) y quien escriba varias filas de forma atómica. Antes vivía en
 * `lib/business/money-service.ts` como `MoneyTx` y obligaba a Core a importar de Business.
 */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Lo mínimo que necesita quien escribe dentro de una transacción ya abierta: sus tablas (`orm`). Es lo que reciben
 * las funciones que pueden correr dentro de `db.transaction` o con la conexión normal, y los puertos entre dominios.
 */
export type DbWriter = Pick<DbTransaction, "orm">;
