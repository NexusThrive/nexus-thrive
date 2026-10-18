"use client";

/**
 * Recibo como imagen PNG (canvas) y envío por WhatsApp con su texto.
 * - Celular: hoja de compartir del sistema → WhatsApp recibe imagen + texto.
 * - Computador: copia la imagen al portapapeles y abre el chat con el texto
 *   (se pega con Ctrl+V). El texto lleva además el enlace al recibo.
 */

export type ReceiptImageData = {
  business: string;
  subtitle?: string;
  total: string;
  concept: string;
  rows: { label: string; value: string }[];
  footer?: string;
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

export async function drawReceiptPng(d: ReceiptImageData): Promise<Blob> {
  const W = 720;
  const scale = 2;
  const pad = 48;
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d")!;
  measure.font = "500 26px Inter, system-ui, sans-serif";
  const conceptLines = wrap(measure, d.concept, W - pad * 2);
  const H = 380 + conceptLines.length * 34 + d.rows.length * 46 + 90;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  // Papel
  ctx.fillStyle = "#F7F6F3";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(24, 24, W - 48, H - 48);
  // Encabezado
  ctx.fillStyle = "#0B0B0C";
  ctx.textAlign = "center";
  ctx.font = "700 32px Montserrat, Inter, system-ui, sans-serif";
  ctx.fillText(d.business, W / 2, 96);
  if (d.subtitle) {
    ctx.fillStyle = "#6B6A70";
    ctx.font = "400 22px Inter, system-ui, sans-serif";
    ctx.fillText(d.subtitle, W / 2, 130);
  }
  const dash = (y: number) => {
    ctx.strokeStyle = "#D9D6CE";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  dash(160);
  ctx.fillStyle = "#8A8990";
  ctx.font = "600 18px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("TOTAL PAGADO", W / 2, 212);
  ctx.fillStyle = "#0B0B0C";
  ctx.font = "800 64px Montserrat, Inter, system-ui, sans-serif";
  ctx.fillText(d.total, W / 2, 284);
  ctx.fillStyle = "#3E3D42";
  ctx.font = "500 26px Inter, system-ui, sans-serif";
  conceptLines.forEach((l, i) => ctx.fillText(l, W / 2, 330 + i * 34));
  let y = 340 + conceptLines.length * 34;
  dash(y);
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
  dash(y - 18);
  ctx.textAlign = "center";
  ctx.fillStyle = "#B8922A";
  ctx.font = "600 18px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText(d.footer ?? "NEXUS THRIVE", W / 2, y + 30);
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
