/**
 * Operación de escritura de clientes para API, MCP y automatizaciones: crear o actualizar un cliente (HU-operaciones-01).
 * Usa la misma función que la pantalla (`saveCustomer`): respeta el límite de clientes del acuerdo y sincroniza el tercero único.
 */
import { z } from "zod";
import { defineOperation, OperationError, type OperationDefinition } from "@/lib/core/operations/types";
import { db } from "@/prisma/db";
import { getCustomer, saveCustomer } from "./customers-db";

const text = (max: number) => z.string().trim().max(max);

export const customerWriteOperations: OperationDefinition[] = [
  defineOperation({
    id: "customers.upsert",
    rest: { method: "POST", path: "/customers" },
    title: "Crear o actualizar un cliente",
    description:
      "Crea un cliente o actualiza uno existente. Si no envías `id`, busca primero por correo, documento o teléfono para no duplicar; si no lo encuentra, lo crea. Solo cambia los campos que envíes.",
    module: "crm",
    permission: null,
    risk: "write",
    idempotent: true,
    emits: ["customer.upserted.v1"],
    input: z.object({
      id: z.string().uuid().optional(),
      name: text(120).min(2, "Escribe el nombre.").optional(),
      email: text(120).email("El correo no es válido.").optional(),
      phone: text(30).min(5, "El teléfono es muy corto.").optional(),
      documentId: text(40).min(3).optional(),
      city: text(80).optional(),
      tags: z.array(text(40).min(1)).max(20).optional(),
    }),
    output: z.object({ id: z.string(), created: z.boolean() }),
    handler: async (ctx, input) => {
      let existingId = input.id ?? null;
      if (!existingId) {
        const email = input.email?.toLowerCase();
        const byEmail = email ? await db.orm.public.Customer.where({ tenantId: ctx.tenantId, email }).select("id").first() : null;
        const byDocument = !byEmail && input.documentId ? await db.orm.public.Customer.where({ tenantId: ctx.tenantId, documentId: input.documentId }).select("id").first() : null;
        const byPhone = !byEmail && !byDocument && input.phone ? await db.orm.public.Customer.where({ tenantId: ctx.tenantId, phone: input.phone }).select("id").first() : null;
        existingId = (byEmail ?? byDocument ?? byPhone)?.id ?? null;
      }
      const current = existingId ? await getCustomer(ctx.tenantId, existingId) : null;
      if (existingId && !current) throw new OperationError("not_found", "No se encontró el cliente.", 404);
      if (!current && !input.name) throw new OperationError("invalid_input", "Para crear un cliente envía `name`.", 422, [{ path: "name", message: "Escribe el nombre." }]);

      const saved = await saveCustomer(ctx.tenantId, current?.id ?? null, {
        name: input.name ?? current!.name,
        email: input.email?.toLowerCase() ?? current?.email ?? null,
        phone: input.phone ?? current?.phone ?? null,
        documentId: input.documentId ?? current?.documentId ?? null,
        birthDate: current?.birthDate ?? null,
        city: input.city ?? current?.city ?? null,
        tags: input.tags ?? (current?.tags ? [...current.tags] : []),
        profile: (current?.profile ?? {}) as Record<string, string | number>,
      });
      if (!saved.ok) throw new OperationError("rule_violation", saved.message, 422);
      return { id: saved.id, created: !current };
    },
  }),
];
