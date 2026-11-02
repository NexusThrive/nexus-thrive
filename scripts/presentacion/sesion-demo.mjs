/**
 * Deja una sesión de navegador lista para grabar la presentación: crea (o reutiliza) un usuario de demostración en la
 * instancia de desarrollo de Clerk con la API de backend, pide un token de inicio de sesión de un solo uso y lo canjea en
 * la pantalla de acceso. No pasa por el formulario de registro (que trae un desafío anti-bots) y no imprime secretos.
 * Uso: node scripts/presentacion/sesion-demo.mjs <carpeta-de-salida>   (el servidor de desarrollo debe estar en BASE)
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3001";
const out = process.argv[2];
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const secret = env.CLERK_SECRET_KEY;
if (!secret?.startsWith("sk_test_")) throw new Error("Solo se usa con una clave de desarrollo de Clerk (sk_test_).");
const api = async (path, init = {}) => {
  const res = await fetch(`https://api.clerk.com/v1${path}`, { ...init, headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...init.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(body.errors ?? body).slice(0, 200)}`);
  return body;
};

const EMAIL = "demo.presentacion@nexusthrive.com.co";
let user = (await api(`/users?email_address=${encodeURIComponent(EMAIL)}`))[0];
if (!user) {
  user = await api("/users", { method: "POST", body: JSON.stringify({ email_address: [EMAIL], first_name: "Camila", last_name: "Rojas", username: "camila_demo", skip_password_requirement: true }) });
  console.log("usuario demo creado");
} else console.log("usuario demo existente");
const { token } = await api("/sign_in_tokens", { method: "POST", body: JSON.stringify({ user_id: user.id, expires_in_seconds: 900 }) });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-CO" });
const page = await ctx.newPage();
await page.goto(`${BASE}/sign-in?__clerk_ticket=${token}`, { waitUntil: "load", timeout: 120000 });
await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(4000);
console.log("URL tras entrar:", page.url());
await page.screenshot({ path: `${out}/tras-entrar.png` });
await ctx.storageState({ path: `${out}/estado.json` });
await browser.close();
