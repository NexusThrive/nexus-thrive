"use client";

/**
 * Recibo como imagen PNG (canvas) y envío por WhatsApp con su texto.
 * - Celular: hoja de compartir del sistema → WhatsApp recibe imagen + texto.
 * - Computador: copia la imagen al portapapeles y abre el chat con el texto
 *   (se pega con Ctrl+V). El texto lleva además el enlace al recibo.
 *
 * La imagen se dibuja como una etiqueta: ojete, franja dorada, total grande,
 * detalle y, al pie, el QR firmado del recibo.
 */

export type ReceiptImageData = {
  business: string;
  subtitle?: string;
  total: string;
  concept: string;
  rows: { label: string; value: string }[];
  footer?: string;
  /** QR del recibo como data URL base64 (`receiptQrDataUrl`). */
  qr?: string;
};

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Separador punteado. Devuelve la misma `y` para encadenar. */
function dashed(ctx: CanvasRenderingContext2D, y: number, W: number): number {
  ctx.beginPath();
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = "#C9C7C1";
  ctx.lineWidth = 1.5;
  ctx.moveTo(72, y);
  ctx.lineTo(W - 72, y);
  ctx.stroke();
  ctx.setLineDash([]);
  return y;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export async function drawReceiptPng(d: ReceiptImageData): Promise<Blob> {
  const W = 720;
  const scale = 2;
  const pad = 48;
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d")!;
  measure.font = "500 26px Inter, system-ui, sans-serif";
  const conceptLines = wrap(measure, d.concept, W - pad * 2);
  const H = 470 + conceptLines.length * 34 + d.rows.length * 46 + (d.qr ? 300 : 0);
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Fondo y etiqueta
  ctx.fillStyle = "#F7F6F3";
  ctx.fillRect(0, 0, W, H);
  roundedPath(ctx, 24, 24, W - 48, H - 48, 22);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.save();
  roundedPath(ctx, 24, 24, W - 48, H - 48, 22);
  ctx.clip();
  ctx.fillStyle = "#D4AF37";
  ctx.fillRect(24, 24, W - 48, 8);
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#E4E2DC";
  roundedPath(ctx, 24, 24, W - 48, H - 48, 22);
  ctx.stroke();

  // Ojete de colgado
  ctx.beginPath();
  ctx.arc(W / 2, 58, 8, 0, Math.PI * 2);
  ctx.strokeStyle = "#C9C7C1";
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Encabezado
  ctx.textAlign = "center";
  ctx.fillStyle = "#0B0B0C";
  ctx.font = "700 34px Montserrat, Inter, system-ui, sans-serif";
  ctx.fillText(d.business, W / 2, 110);
  if (d.subtitle) {
    ctx.fillStyle = "#6B6A70";
    ctx.font = "500 24px Inter, system-ui, sans-serif";
    ctx.fillText(d.subtitle, W / 2, 142);
  }

  // Etiqueta "Comprobante de pago"
  ctx.font = "600 16px 'JetBrains Mono', ui-monospace, monospace";
  const tag = "COMPROBANTE DE PAGO";
  const tw = ctx.measureText(tag).width + 34;
  roundedPath(ctx, W / 2 - tw / 2, 160, tw, 30, 15);
  ctx.strokeStyle = "rgba(11,11,12,0.16)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#6B6B73";
  ctx.fillText(tag, W / 2, 180);

  // Total y concepto
  ctx.fillStyle = "#B8922A";
  ctx.font = "600 18px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("TOTAL PAGADO", W / 2, 250);
  ctx.fillStyle = "#0B0B0C";
  ctx.font = "700 46px Montserrat, Inter, system-ui, sans-serif";
  ctx.fillText(d.total, W / 2, 300);
  ctx.fillStyle = "#3E3D42";
  ctx.font = "500 26px Inter, system-ui, sans-serif";
  conceptLines.forEach((l, i) => ctx.fillText(l, W / 2, 340 + i * 34));

  let y = 336 + conceptLines.length * 34;
  dashed(ctx, y, W);
  y += 46;
  ctx.font = "400 22px Inter, system-ui, sans-serif";
  for (const r of d.rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#6B6A70";
    ctx.fillText(r.label, pad, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#0B0B0C";
    ctx.fillText(r.value, W - pad, y);
    y += 46;
  }
  dashed(ctx, y - 18, W);

  if (d.qr) {
    const qsz = 200;
    const box = qsz + 28;
    const bx = (W - box) / 2;
    const by = y + 22;
    roundedPath(ctx, bx, by, box, box, 16);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "rgba(11,11,12,0.14)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    try {
      const img = await loadImage(d.qr);
      ctx.drawImage(img, (W - qsz) / 2, by + 14, qsz, qsz);
    } catch {
      // Sin QR disponible: el recibo sigue siendo válido.
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#6B6B73";
    ctx.font = "600 15px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText("ESCANEA PARA VERIFICAR", W / 2, by + box + 26);
    y = by + box + 26;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#B8922A";
  ctx.font = "600 18px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText(d.footer ?? "NEXUS THRIVE", W / 2, d.qr ? y + 40 : H - 44);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen."))), "image/png"));
}

export type ShareResult = "shared" | "copied" | "text-only" | "cancelled";

/** Envía el recibo: imagen + texto por la hoja de compartir, o copia la imagen y abre WhatsApp. */
export async function shareReceiptOnWhatsapp(opts: { image: Blob; fileName: string; text: string; phone?: string | null }): Promise<ShareResult> {
  const file = new File([opts.image], opts.fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ files: [file], text: opts.text });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  let copied = false;
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": opts.image })]);
      copied = true;
    }
  } catch {
    copied = false;
  }
  const digits = (opts.phone ?? "").replace(/\D/g, "");
  const to = digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits;
  window.open(`https://wa.me/${to}?text=${encodeURIComponent(opts.text)}`, "_blank", "noopener");
  return copied ? "copied" : "text-only";
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
