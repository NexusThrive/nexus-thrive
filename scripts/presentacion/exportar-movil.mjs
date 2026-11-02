/**
 * Monta la grabación móvil (cuadros JPEG de `grabar-movil.mjs`) en un video vertical de 1080×1920 y 60 s: el teléfono
 * centrado y grande, con esquinas redondeadas y marco, sobre un fondo negro con un brillo dorado. Recorta la espera
 * inicial, ajusta la velocidad para que dure justo un minuto y codifica en H.264.
 * Uso: node scripts/presentacion/exportar-movil.mjs <carpeta-de-grabación> <archivo-mp4-de-salida>
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const [dir, output] = process.argv.slice(2);
const { t0epoch, loadAt, end, frames } = JSON.parse(readFileSync(`${dir}/frames.json`, "utf8"));

// Medidas del montaje (1080×1920): pantalla de 828×1792 (la proporción del teléfono) dentro de un marco de 14 px.
const W = 1080, H = 1920, SW = 828, SH = 1792, BEZEL = 14, RADIUS = 64;
const sx = (W - SW) / 2, sy = (H - SH) / 2;

// Fondo con marco y máscara de la pantalla, dibujados una vez con el navegador.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<body style="margin:0;width:${W}px;height:${H}px;background:radial-gradient(70% 45% at 50% 100%,rgba(212,175,55,.22),transparent 70%),radial-gradient(60% 40% at 50% 0%,rgba(255,255,255,.06),transparent 70%),#050505;position:relative;overflow:hidden">
  <div style="position:absolute;left:${sx - BEZEL}px;top:${sy - BEZEL}px;width:${SW + 2 * BEZEL}px;height:${SH + 2 * BEZEL}px;border-radius:${RADIUS + BEZEL}px;background:#0e0e0e;border:1px solid rgba(212,175,55,.45);box-sizing:border-box;box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 0 6px rgba(255,255,255,.03)"></div></body>`);
await page.screenshot({ path: `${dir}/fondo.png` });
await page.setContent(`<body style="margin:0;background:#000"><div style="width:${SW}px;height:${SH}px;border-radius:${RADIUS}px;background:#fff"></div></body>`);
await page.setViewportSize({ width: SW, height: SH });
await page.screenshot({ path: `${dir}/mascara.png` });
await browser.close();

// Cuadros entre el recorte inicial y el final, con su duración ya dividida por la velocidad.
const start = t0epoch + loadAt + 1.9; // la página en blanco antes de que se dibuje la N de carga se recorta
const finish = t0epoch + end;
const speed = Math.max(1, (finish - start) / 60);
const kept = [];
frames.forEach(([ts, file], i) => {
  const next = i + 1 < frames.length ? frames[i + 1][0] : finish;
  if (next <= start || ts >= finish) return;
  kept.push({ file, duration: (Math.min(next, finish) - Math.max(ts, start)) / speed });
});
console.log(`${kept.length} cuadros · duración en bruto ${(finish - start).toFixed(1)} s · velocidad ×${speed.toFixed(3)}`);
const list = kept.map((k) => `file '${k.file}'\nduration ${Math.max(0.001, k.duration).toFixed(4)}`).join("\n") + `\nfile '${kept.at(-1).file}'\n`;
writeFileSync(`${dir}/cuadros.txt`, list);

execFileSync(
  "ffmpeg",
  [
    "-v", "error", "-y",
    "-loop", "1", "-i", `${dir}/fondo.png`,
    "-f", "concat", "-safe", "0", "-i", `${dir}/cuadros.txt`,
    "-loop", "1", "-i", `${dir}/mascara.png`,
    "-filter_complex",
    `[1:v]fps=30,scale=${SW}:${SH}:flags=lanczos,format=rgba[scr];[2:v]format=gray[mask];[scr][mask]alphamerge[round];[0:v][round]overlay=${sx}:${sy}:shortest=1,format=yuv420p`,
    "-t", "60", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-movflags", "+faststart", "-an", output,
  ],
  { stdio: "inherit" },
);
