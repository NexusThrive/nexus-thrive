import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

/**
 * Emite tokens de subida de un solo uso para archivos de importación grandes
 * (> 4,5 MB, límite de cuerpo de Vercel). El token de escritura de Blob nunca
 * llega al navegador: solo usuarios con sesión obtienen un token limitado a
 * `imports/`, tipos Excel/CSV y 20 MB.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const { userId } = await auth();
        if (!userId) {
          throw new Error("Debes iniciar sesión para subir archivos.");
        }
        if (!pathname.startsWith("imports/")) {
          throw new Error("Ruta de subida no permitida.");
        }
        return {
          allowedContentTypes: [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "text/csv",
            "text/plain",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 20 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId }),
        };
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo autorizar la subida." },
      { status: 400 },
    );
  }
}
