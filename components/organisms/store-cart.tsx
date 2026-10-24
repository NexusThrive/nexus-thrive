"use client";

import { useState, useSyncExternalStore } from "react";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { readOrigin } from "@/components/organisms/site-extras";
import { placeOrderAction } from "@/app/s/[slug]/actions";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { MAX_QTY, type CustomerData } from "@/lib/store/cart";
import type { PlaceResult } from "@/lib/store/store-db";

/**
 * Carrito de la tienda del mini-sitio. Vive en el navegador (por sitio) y solo manda al servidor ids y
 * cantidades: los precios y las existencias los vuelve a leer el servidor. Del pedido sale el enlace de pago.
 */
type Item = { productId: string; name: string; price: number; quantity: number };
const listeners = new Set<() => void>();
const keyOf = (slug: string) => `nx-cart-${slug}`;
let cache: { key: string; raw: string | null; items: Item[] } | null = null;
const EMPTY: Item[] = [];

function read(slug: string): Item[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(keyOf(slug));
  } catch {
    /* sin almacenamiento */
  }
  if (cache && cache.key === slug && cache.raw === raw) return cache.items;
  let items = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as Item[]) : EMPTY;
    items = Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.productId === "string" && Number.isInteger(i.quantity) && i.quantity > 0).slice(0, 40) : EMPTY;
  } catch {
    items = EMPTY;
  }
  cache = { key: slug, raw, items };
  return items;
}
function write(slug: string, items: Item[]) {
  try {
    localStorage.setItem(keyOf(slug), JSON.stringify(items));
  } catch {
    /* no se recuerda */
  }
  cache = null;
  listeners.forEach((l) => l());
}
const useCart = (slug: string) => useSyncExternalStore((fn) => (listeners.add(fn), () => void listeners.delete(fn)), () => read(slug), () => EMPTY);
const peso = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function AddToCart({ slug, product, accent, onAccent }: { slug: string; product: { id: string; name: string; price: number }; accent: string; onAccent: string }) {
  const items = useCart(slug);
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const cur = read(slug);
        const found = cur.find((i) => i.productId === product.id);
        write(slug, found ? cur.map((i) => (i.productId === product.id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + 1) } : i)) : [...cur, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1400);
      }}
      style={{ background: accent, color: onAccent }}
      className="mt-2 inline-flex h-10 items-center justify-center rounded-md px-4 text-[13px] font-semibold"
      aria-label={`Agregar ${product.name} al carrito`}
    >
      {added ? "Agregado ✓" : items.some((i) => i.productId === product.id) ? "Agregar otro" : "Agregar al carrito"}
    </button>
  );
}

const FIELD = "h-11 w-full rounded-md border border-[#C9C6BE] bg-white px-3 text-[15px] text-black";

export function CartDock({ slug, accent, onAccent }: { slug: string; accent: string; onAccent: string }) {
  const items = useCart(slug);
  const [open, setOpen] = useState(false);
  const [c, setC] = useState<CustomerData>({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PlaceResult | null>(null);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const errors = result && !result.ok ? (result.fields ?? {}) : {};
  const done = result?.ok ? result : null;
  const set = (k: keyof CustomerData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC((p) => ({ ...p, [k]: e.target.value }));
  const qty = (id: string, d: number) => write(slug, items.map((i) => (i.productId === id ? { ...i, quantity: Math.max(0, Math.min(MAX_QTY, i.quantity + d)) } : i)).filter((i) => i.quantity > 0));

  const send = async () => {
    setBusy(true);
    const r = await placeOrderAction(slug, c, items.map((i) => ({ productId: i.productId, quantity: i.quantity })), readOrigin(slug));
    setBusy(false);
    setResult(r);
    if (r.ok) write(slug, []);
  };

  return (
    <>
      {count > 0 || done ? (
        <button type="button" onClick={() => setOpen(true)} style={{ background: accent, color: onAccent }} className="fixed bottom-4 left-4 inline-flex h-12 items-center gap-2 rounded-full px-5 text-[14px] font-semibold shadow-lg">
          <ShoppingBag aria-hidden="true" className="size-5" /> Ver carrito{count ? ` (${count})` : ""}
        </button>
      ) : null}
      <ResponsiveSheet open={open} onOpenChange={setOpen} size="md" title={done ? `Pedido ${done.code} recibido` : "Tu carrito"} description={done ? "Falta el pago para confirmarlo." : undefined}>
        {done ? (
          <div className="grid gap-3 text-[14px]">
            <p>Total <b className="font-mono">{peso(done.total)}</b>. Paga con el enlace seguro; en cuanto se confirme el pago, <b>{done.business}</b> prepara tu pedido.</p>
            <a href={`/pay/${done.reference}`} style={{ background: accent, color: onAccent }} className="inline-flex h-12 items-center justify-center rounded-md font-semibold">Pagar ahora</a>
            {done.whatsapp ? <a href={`https://wa.me/${done.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(done.whatsappText)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#C9C6BE] font-medium"><MessageCircle aria-hidden="true" className="size-4" /> Enviar mi pedido por WhatsApp</a> : null}
          </div>
        ) : items.length === 0 ? (
          <p className="text-[14px]">Tu carrito está vacío.</p>
        ) : (
          <div className="grid gap-4">
            <ul className="grid gap-2" aria-label="Productos del carrito">
              {items.map((i) => (
                <li key={i.productId} className="flex items-center gap-2 text-[14px]">
                  <span className="min-w-0 flex-1 truncate">{i.name}</span>
                  <button type="button" aria-label={`Menos ${i.name}`} onClick={() => qty(i.productId, -1)} className="size-8 rounded-md border border-[#C9C6BE]">−</button>
                  <b className="w-6 text-center font-mono">{i.quantity}</b>
                  <button type="button" aria-label={`Más ${i.name}`} onClick={() => qty(i.productId, 1)} className="size-8 rounded-md border border-[#C9C6BE]">+</button>
                  <span className="w-24 text-right font-mono">{peso(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="flex justify-between border-t border-[#E4E1DA] pt-2 font-semibold"><span>Total estimado</span><span className="font-mono">{peso(total)}</span></p>
            <p className="text-xs text-[#5E5D63]">El total final (con impuestos) lo confirma el servidor al hacer el pedido.</p>
            <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="grid gap-3" noValidate>
              {([["name", "Nombre completo", "name"], ["phone", "Celular", "tel"], ["email", "Correo (opcional)", "email"], ["address", "Dirección de entrega", "street-address"], ["city", "Ciudad", "address-level2"]] as const).map(([k, label, ac]) => (
                <label key={k} className="grid gap-1 text-[13px] font-medium">
                  {label}
                  <input value={c[k]} onChange={set(k)} autoComplete={ac} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `err-${k}` : undefined} className={FIELD} />
                  {errors[k] ? <span id={`err-${k}`} role="alert" className="text-xs font-normal text-[#9B2C2C]">{errors[k]}</span> : null}
                </label>
              ))}
              <label className="grid gap-1 text-[13px] font-medium">Notas (opcional)<textarea value={c.notes} onChange={set("notes")} rows={2} className={`${FIELD} h-auto py-2`} /></label>
              {result && !result.ok && !result.fields ? <p role="alert" className="text-[13px] text-[#9B2C2C]">{result.message}</p> : null}
              <button type="submit" disabled={busy} style={{ background: accent, color: onAccent }} className="h-12 rounded-md text-[15px] font-semibold disabled:opacity-60">{busy ? "Enviando…" : "Hacer el pedido"}</button>
            </form>
          </div>
        )}
      </ResponsiveSheet>
    </>
  );
}
