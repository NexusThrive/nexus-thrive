/**
 * Convierte la grabación en bruto (.webm de Playwright) en un MP4 de 60 s: recorta la espera inicial del servidor de
 * desarrollo, ajusta la velocidad para que dure justo un minuto y codifica en H.264 (se abre en Recordly y en cualquier editor).
 * Uso: node scripts/presentacion/exportar.mjs <carpeta-de-videos> <pc|movil> <archivo-mp4-de-salida>
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

const [dir, kind, output] = process.argv.slice(2);
const webm = readdirSync(dir).filter((f) => f.endsWith(".webm")).map((f) => `${dir}/${f}`).sort().at(-1);
const meta = JSON.parse(readFileSync(`${dir}/meta-${kind}.json`, "utf8"));
// La página en blanco antes de que se dibuje la N de carga se recorta (en móvil la N tarda un poco más en aparecer).
const start = Math.max(0, meta.loadAt + (kind === "movil" ? 1.9 : 0.9));
const length = meta.end - start;
const speed = Math.max(1, length / 60);
console.log(`${webm}\n  recorte inicial ${start.toFixed(2)} s · duración en bruto ${length.toFixed(1)} s · velocidad ×${speed.toFixed(3)}`);
execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", start.toFixed(2), "-i", webm, "-vf", `setpts=PTS/${speed.toFixed(4)},fps=30,format=yuv420p`, "-t", "60", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-movflags", "+faststart", "-an", output], { stdio: "inherit" });
