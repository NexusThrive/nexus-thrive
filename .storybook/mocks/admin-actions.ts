import type { AdminFormState, SlugCheckState } from "@/app/admin/actions";
import { validateSlug } from "@/lib/core/tenancy/catalogs";

/** Administrative form previews never provision tenants or contact providers. */
export async function checkSlugAvailabilityAction(slug: string): Promise<SlugCheckState> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (!validateSlug(slug).ok) return { status: "invalid" };
  return { status: slug === "ocupado" ? "taken" : "available" };
}

export async function createTenantAction(_previous: AdminFormState, form: FormData): Promise<AdminFormState> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const name = String(form.get("name") ?? "").trim();
  const availability = await checkSlugAvailabilityAction(String(form.get("slug") ?? ""));
  if (availability.status !== "available") return { status: "error", errors: { slug: "Elige otro slug para esta demostración." } };
  if (name === "Error") return { status: "error", message: "No se pudo crear el negocio de ejemplo. Inténtalo de nuevo." };
  return { status: "ok", message: `Simulación: negocio «${name}» creado en preparación. No se ha enviado ninguna invitación.` };
}
