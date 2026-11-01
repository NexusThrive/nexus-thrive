/** URL de la foto de un insumo guardada en el sistema (ver app/api/apu-images). */
export function apuImageUrl(imageId: string | null | undefined): string | null {
  return imageId ? `/api/apu-images/${imageId}` : null;
}
