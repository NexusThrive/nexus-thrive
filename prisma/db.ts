import "dotenv/config";
import { Pool } from "pg";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

/**
 * Conexiones abiertas por proceso. En Vercel cada instancia es un proceso
 * aparte y el session pooler de Supabase admite pocos clientes en total
 * (15 en el plan actual): con el tope por defecto de `pg` (10), dos
 * instancias lo agotan y todo lo demás recibe "max clients reached".
 * `DB_POOL_MAX` lo ajusta sin desplegar código.
 */
const max = Number(process.env.DB_POOL_MAX) || (process.env.VERCEL ? 3 : 10);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max,
  connectionTimeoutMillis: 20_000,
  // Suelta pronto las conexiones quietas: el cupo del pooler es compartido.
  idleTimeoutMillis: 10_000,
});
// Una conexión inactiva que el servidor corta no debe tumbar el proceso.
pool.on("error", (error) => console.error("[db] conexión inactiva cerrada por el servidor:", error.message));

const client = postgres<Contract>({ contractJson, pg: pool });
const closeClient = client.close.bind(client);

/** `close()` también cierra el pool: la runtime no cierra un pool que no creó. */
export const db = Object.assign(client, {
  close: async () => {
    await closeClient();
    await pool.end();
  },
});
