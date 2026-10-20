"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";

/**
 * Lector de QR por cámara que funciona en cualquier navegador con cámara.
 *
 * - Con `BarcodeDetector` (Chrome, Edge, Android): decodifica nativo, rápido.
 * - Sin él (Safari en iPhone/macOS, Firefox): decodifica con jsQR sobre un
 *   canvas, leyendo fotograma a fotograma. La cámara de iOS se abre desde la
 *   web con `getUserMedia` (desde iOS 11 se puede, en HTTPS).
 *
 * Por eso el QR es el camino universal: solo necesita la cámara, sin
 * lectores externos ni NFC.
 */

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** jsQR solo se carga en el navegador y cuando hace falta. */
async function loadJsQr() {
  const mod = await import("jsqr");
  return mod.default;
}

export function QrScanner({
  open,
  onClose,
  onDetect,
}: {
  open: boolean;
  onClose: () => void;
  onDetect: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let alive = true;
    let done = false;

    const finish = (value: string) => {
      if (done) return;
      done = true;
      onDetect(value);
    };

    async function start() {
      setStarting(true);
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setError("No pudimos abrir la cámara. Permite el acceso o escribe el código a mano.");
        setStarting(false);
        return;
      }
      if (!alive) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      setStarting(false);

      const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector })
        .BarcodeDetector;

      if (Ctor) {
        // Camino nativo: Chrome/Edge.
        const detector = new Ctor({ formats: ["qr_code"] });
        timer = window.setInterval(async () => {
          if (done || !video || video.readyState < 2) return;
          const codes = await detector.detect(video).catch(() => []);
          if (codes[0]?.rawValue) finish(codes[0].rawValue);
        }, 300);
        return;
      }

      // Camino jsQR: Safari (iPhone/macOS) y Firefox.
      const jsQR = await loadJsQr();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { willReadFrequently: true });
      if (!canvas || !ctx) {
        setError("Este navegador no puede leer la cámara.");
        return;
      }
      timer = window.setInterval(() => {
        if (done || !video || video.readyState < 2) return;
        if (video.videoWidth === 0) return;
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (code?.data) finish(code.data);
      }, 250);
    }

    void start();

    return () => {
      alive = false;
      done = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onDetect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/80 p-4" role="dialog" aria-label="Escanear código QR">
      <div className="grid w-full max-w-md gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-[15px] font-semibold">Apunta al código QR</p>
          <button type="button" onClick={onClose} className="rounded-sm px-2 py-1 text-[13px] text-muted-foreground hover:text-foreground">
            Cerrar
          </button>
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} muted playsInline className="size-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {starting ? (
            <span className="absolute inset-0 grid place-items-center text-white/80">
              <Loader2 aria-hidden="true" className="size-6 animate-spin" />
            </span>
          ) : null}
          <span aria-hidden="true" className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-[#D4AF37]" />
        </div>
        {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
        <p className="text-[12px] text-muted-foreground">
          También puedes escribir el código a mano en la casilla de arriba.
        </p>
      </div>
    </div>
  );
}

/** Botón que abre el lector (solo si el navegador tiene cámara). */
export function CameraScanButton({
  onDetect,
  label = "Leer con la cámara",
  className,
}: {
  onDetect: (value: string) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasCamera(Boolean(navigator.mediaDevices?.getUserMedia));
  }, []);

  if (!hasCamera) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ size: "sm", variant: "outline" }), className)}
      >
        <Camera aria-hidden="true" className="size-3.5" /> {label}
      </button>
      <QrScanner
        open={open}
        onClose={() => setOpen(false)}
        onDetect={(value) => {
          setOpen(false);
          onDetect(value);
        }}
      />
    </>
  );
}
