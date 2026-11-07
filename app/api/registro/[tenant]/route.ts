import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { registerCustomerAction } from "@/app/registro/[tenant]/actions";

/**
 * Alta pública de un cliente del gimnasio (sin sesión). Es una ruta y no una
 * acción de servidor para que el envío no vuelva a renderizar la página
 * pública: así no depende de la sesión de Clerk del navegador.
 */
export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Solicitud no válida." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const text = (key: string) => (typeof input[key] === "string" ? (input[key] as string) : "");
  const result = await registerCustomerAction(tenant, {
    name: text("name"),
    phone: text("phone"),
    email: text("email"),
    documentId: text("documentId"),
    birthDate: text("birthDate"),
    city: text("city"),
    consent: input.consent === true,
  });
  if (result.ok && !result.alreadyRegistered) {
    // El equipo ve el alta de inmediato en Clientes, la campana y el inicio.
    revalidatePath(`/${tenant}/contactos`);
    revalidatePath(`/${tenant}`);
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 422, headers: { "Cache-Control": "no-store" } });
}
