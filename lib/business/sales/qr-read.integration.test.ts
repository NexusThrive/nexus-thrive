import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";

/**
 * El QR que imprimimos en el carné tiene que poder leerse con el decodificador
 * de respaldo (jsQR), que es el que usan los navegadores sin `BarcodeDetector`
 * (Safari en iPhone, Firefox). Si este test falla, el lector por cámara no
 * serviría en el iPhone del gimnasio.
 */

/** Convierte el código en una imagen RGBA (como la que entrega un canvas). */
function toImageData(text: string, scale = 4): { data: Uint8ClampedArray; width: number; height: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const width = size * scale;
  const height = size * scale;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!qr.modules.get(y, x)) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const px = x * scale + dx;
          const py = y * scale + dy;
          const i = (py * width + px) * 4;
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }
      }
    }
  }
  return { data, width, height };
}

describe("lectura de QR con jsQR (respaldo sin BarcodeDetector)", () => {
  it("decodifica el código de socio que genera el carné", () => {
    const code = "9T63NRQF";
    const image = toImageData(code);
    const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
    expect(result?.data).toBe(code);
  });

  it("decodifica cualquier código de acceso generado", () => {
    for (const code of ["A1B2C3D4", "ZZZZ9999", "7HKM3PQR"]) {
      const image = toImageData(code);
      const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
      expect(result?.data).toBe(code);
    }
  });

  it("no inventa un código cuando la imagen está vacía", () => {
    const empty = new Uint8ClampedArray(100 * 100 * 4).fill(255);
    expect(jsQR(empty, 100, 100, { inversionAttempts: "dontInvert" })).toBeFalsy();
  });
});
