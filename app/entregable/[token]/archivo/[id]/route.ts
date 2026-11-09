import { readReviewFile } from "@/lib/business/customers/deliverables-db";
import { allowAttempt, recordAttempt } from "@/lib/foundation/rate-limit";

/** Descarga de un archivo de un entregable con el enlace de revisión vigente. Sin enlace válido: 404 (igual que si no existiera). */
export async function GET(request: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  const bucket = `deliverable-file:${ip}`;
  if (!allowAttempt(bucket, 120)) return new Response("Demasiadas solicitudes.", { status: 429 });
  recordAttempt(bucket, 120);
  const file = await readReviewFile(token, id);
  if (!file) return new Response("No encontrado.", { status: 404 });
  return new Response(file.data as BodyInit, { headers: { "content-type": file.mimeType, "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
