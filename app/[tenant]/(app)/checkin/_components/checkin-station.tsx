"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Nfc, Search, UserRound, XCircle } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { useToast } from "@/components/molecules/toast";
import { CameraScanButton } from "@/components/molecules/qr-scanner";
import { countdown } from "@/lib/business/gym";
import type { AttendanceRow, CheckInResult, MemberCard, Method } from "@/lib/business/gym-db";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { manualCheckInAction, scanAction, searchMembersAction, type ScanResult } from "../actions";

const METHOD_LABEL: Record<string, string> = { QR: "QR", NFC: "Tarjeta", MANUAL: "Manual" };
/** Los códigos de acceso usan 8 caracteres sin 0/O/1/I; lo demás llega de un lector NFC. */
const looksLikeAccessCode = (v: string) => /^[A-HJ-NP-Z2-9]{8}$/.test(v.trim().toUpperCase());

type NdefReader = { scan: (o?: { signal?: AbortSignal }) => Promise<void>; onreading: ((e: { serialNumber: string }) => void) | null; onreadingerror: (() => void) | null };

function Photo({ id, className }: { id: string | null; className?: string }) {
  if (!id) return <span className={cn(className, "grid place-items-center bg-surface-muted text-muted-foreground")}><UserRound aria-hidden="true" className="size-1/2" /></span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/files/${id}`} alt="" className={cn(className, "object-cover")} />;
}

/** Puesto de recepción: lector (teclado, cámara o NFC), búsqueda manual, resultado grande y entradas de hoy. */
export default function CheckinStation({ slug, canScan, entries, customerTerm }: { slug: string; canScan: boolean; entries: AttendanceRow[]; customerTerm: string }) {
  const [code, setCode] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<MemberCard[]>([]);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [nfcOn, setNfcOn] = useState(false);
  const [support, setSupport] = useState({ camera: false, nfc: false });
  const [now, setNow] = useState(0);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Detección de capacidades del navegador (solo en el cliente).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupport({ camera: Boolean(navigator.mediaDevices?.getUserMedia), nfc: "NDEFReader" in window });
  }, []);

  // El contador del resultado avanza cada segundo; el resultado se limpia a los 12 s.
  useEffect(() => {
    if (!result) return;
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, 1000);
    const clear = window.setTimeout(() => {
      setResult(null);
      inputRef.current?.focus();
    }, 12_000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(clear);
    };
  }, [result]);

  const handle = (r: ScanResult) => {
    if (r.ok) {
      setResult(r.result);
      router.refresh();
    } else toast({ title: "No se registró", description: r.message, variant: "error" });
  };

  const submitScan = (raw: string, method: Method) => {
    if (!raw.trim() || busy.current) return;
    busy.current = true;
    start(async () => {
      try {
        handle(await scanAction(slug, raw, method));
        setCode("");
      } finally {
        busy.current = false;
      }
    });
  };

  // NFC del teléfono (solo existe en Chrome con Android): lee el número de
  // serie de la tarjeta. En el resto de navegadores el botón no aparece.
  useEffect(() => {
    if (!nfcOn) return;
    const ctrl = new AbortController();
    const Ctor = (window as unknown as { NDEFReader: new () => NdefReader }).NDEFReader;
    const reader = new Ctor();
    reader.onreading = (e) => submitScan(e.serialNumber, "NFC");
    reader.onreadingerror = () => toast({ title: "No se pudo leer la tarjeta", variant: "error" });
    reader.scan({ signal: ctrl.signal }).catch(() => {
      toast({ title: "NFC no disponible", description: "Activa el NFC del teléfono y permite el acceso.", variant: "error" });
      setNfcOn(false);
    });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nfcOn]);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) return;
    let alive = true;
    const t = window.setTimeout(() => void searchMembersAction(slug, text).then((r) => alive && setFound(r)), 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [q, slug]);

  if (!canScan) return <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Tu rol no permite registrar entradas. Pide a recepción o al dueño que lo haga.</p>;

  const cd = result?.endsAt && now ? countdown(result.endsAt, now) : null;

  return (
    // `suppressHydrationWarning`: los gestores de contraseñas (Proton Pass,
    // 1Password, Bitwarden…) añaden atributos al DOM antes de que React
    // hidrate, y eso dispara un aviso de "hydration mismatch" que no es
    // nuestro. Solo silencia el desajuste de atributos de este contenedor.
    <div className="grid grid-cols-1 content-start gap-6" suppressHydrationWarning>
      <section className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitScan(code, looksLikeAccessCode(code) ? "QR" : "NFC");
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Escanea el QR, acerca la tarjeta o escribe el código"
            aria-label="Código del QR, tarjeta o documento"
            autoComplete="off"
            className={cn(inputClasses, "h-12 min-w-0 flex-1 text-base")}
          />
          <button type="submit" disabled={pending || !code.trim()} className={buttonVariants({ size: "lg" })}>
            Validar
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <CameraScanButton onDetect={(value) => submitScan(value, "QR")} />
          {support.nfc ? (
            <button type="button" onClick={() => setNfcOn((v) => !v)} className={buttonVariants({ size: "sm", variant: nfcOn ? "default" : "outline" })}>
              <Nfc aria-hidden="true" className="size-3.5" /> {nfcOn ? "NFC activo: acerca la tarjeta" : "Leer tarjeta con este teléfono"}
            </button>
          ) : null}
          <p className="self-center text-xs text-muted-foreground">
            El QR se lee con la cámara en cualquier teléfono. Los lectores USB de QR y de tarjetas
            funcionan como teclado: deja el cursor en la casilla.
          </p>
        </div>
        {!support.nfc ? (
          <p className="rounded-md border border-dashed border-border bg-surface-muted px-3 py-2 text-[12px] text-muted-foreground">
            Leer la tarjeta NFC con el teléfono solo funciona en <b>Chrome con Android</b>. Aquí usa
            el <b>QR</b> (cámara) o escribe el número de serie de la tarjeta a mano.
          </p>
        ) : null}
      </section>

      {result ? (
        <section
          aria-live="assertive"
          className={cn("grid grid-cols-1 gap-4 rounded-xl border-2 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center", result.allowed ? "border-emerald-500 bg-emerald-500/10" : "border-rose-500 bg-rose-500/10")}
        >
          <Photo id={result.member.photoId} className="size-28 rounded-xl" />
          <div className="grid gap-1.5">
            <p className={cn("flex items-center gap-2 font-display text-2xl font-bold", result.allowed ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
              {result.allowed ? <CheckCircle2 aria-hidden="true" className="size-7" /> : <XCircle aria-hidden="true" className="size-7" />}
              {result.allowed ? "Puede entrar" : "No puede entrar"}
            </p>
            <p className="text-lg font-semibold">{result.member.name}</p>
            <p className="text-sm text-muted-foreground">{result.reason}</p>
            {cd && !cd.expired ? (
              <p className={cn("font-mono text-xl tabular-nums", cd.urgent ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                Le quedan {cd.text}
              </p>
            ) : null}
            <a href={`/${slug}/crm/${result.member.id}`} className="text-sm font-medium text-accent-text underline-offset-4 hover:underline">
              Ver ficha del {customerTerm.toLowerCase()}
            </a>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Buscar a mano</h2>
        <label className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, teléfono o documento" aria-label="Buscar socio" className={cn(inputClasses, "pl-9")} />
        </label>
        {q.trim().length >= 2 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {found.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                <Photo id={m.photoId} className="size-9 rounded-full" />
                <span className="min-w-0 flex-1 text-sm">
                  <b className="block truncate font-medium">{m.name}</b>
                  <small className="text-xs text-muted-foreground">{m.documentId ?? m.phone ?? "Sin documento"}</small>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      handle(await manualCheckInAction(slug, m.id));
                      setQ("");
                      setFound([]);
                    })
                  }
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  Registrar entrada
                </button>
              </li>
            ))}
            {found.length === 0 ? <li className="px-3 py-3 text-sm text-muted-foreground">Sin resultados.</li> : null}
          </ul>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-2">
        <h2 className="text-sm font-semibold">Entradas de hoy</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
              <Photo id={e.photoId} className="size-9 rounded-full" />
              <span className="min-w-0 flex-1 text-sm">
                <a href={`/${slug}/crm/${e.customerId}`} className="block truncate font-medium hover:underline">
                  {e.name}
                </a>
                <small className="block truncate text-xs text-muted-foreground">
                  {formatDateTime(e.at)} · {METHOD_LABEL[e.method] ?? e.method}
                  {!e.allowed && e.reason ? ` · ${e.reason}` : ""}
                </small>
              </span>
              <Badge tone={e.allowed ? "success" : "danger"}>{e.allowed ? "Entró" : "Negada"}</Badge>
            </li>
          ))}
          {entries.length === 0 ? <li className="px-3 py-4 text-sm text-muted-foreground">Todavía no hay entradas hoy.</li> : null}
        </ul>
      </section>
    </div>
  );
}
