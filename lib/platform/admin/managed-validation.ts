import { z } from "zod";
import { validateSlug } from "@/lib/core/tenancy/catalogs";

export const managedBusinessInput = z.object({
  name: z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(80, "Máximo 80 caracteres."),
  slug: z.string().trim().toLowerCase().refine((value) => validateSlug(value).ok, "Usa un slug válido de 3 a 48 caracteres, sin espacios ni rutas reservadas."),
  ownerEmail: z.string().trim().toLowerCase().pipe(z.email("Escribe un correo válido.").max(254)),
  provisioningKey: z.uuid("La solicitud no es válida. Cierra el formulario e inténtalo de nuevo."),
}).strict();

export type ManagedBusinessInput = z.infer<typeof managedBusinessInput>;
