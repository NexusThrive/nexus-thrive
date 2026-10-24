import { receiveProviderWebhook } from "@/lib/providers/inbound";

/**
 * Webhooks entrantes de proveedores (pasarelas, facturación electrónica…).
 * La conexión se identifica por la URL y la firma se valida con SUS credenciales.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string; connectionId: string }> }) {
  const { provider, connectionId } = await params;
  const result = await receiveProviderWebhook({ provider, connectionId, rawBody: await request.text(), headers: request.headers });
  return Response.json(result.body, { status: result.status });
}
