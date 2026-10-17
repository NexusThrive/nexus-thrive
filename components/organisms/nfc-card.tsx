"use client";

import { useEffect, useRef, useState } from "react";
import { N_PATH, THRIVE_LETTERS } from "@nexus/brand/BrandLogo";
import { burstFrom, motionOff } from "@/lib/motion";
import { cn } from "@/lib/utils";
import styles from "./nfc-card.module.css";

export type NfcFinish = "negro" | "blanco";

function Lockup({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="387.6 239.9 744.4 779.5" className={className} style={style} aria-hidden="true" fill="currentColor">
      <path d={N_PATH} />
      {THRIVE_LETTERS.map((l, i) => (
        <path key={i} transform={`translate(${l.x} ${l.y})`} d={l.d} />
      ))}
    </svg>
  );
}

function ThriveWord({ className, ref }: { className?: string; ref?: React.Ref<SVGSVGElement> }) {
  return (
    <svg ref={ref} viewBox="386 940 748 79" className={className} aria-hidden="true" fill="currentColor">
      {THRIVE_LETTERS.map((l, i) => (
        <path key={i} transform={`translate(${l.x} ${l.y})`} d={l.d} />
      ))}
    </svg>
  );
}

/**
 * Tarjeta de contacto NFC (MAR·01): modo noche o acabado blanco, logo en
 * relieve (6 capas a 0,4 px), chip oro con ondas de señal y THRIVE en el
 * reverso. Se inclina siguiendo el cursor o el dedo (hasta 14° y 18°), flota
 * sola cuando no se toca, gira al tocarla y `tap()` simula acercar un
 * teléfono (ondas aceleradas, borde oro 1,2 s y celebración).
 */
export function NfcCard({
  name,
  role,
  code = "NT-0001",
  finish = "negro",
  readKey = 0,
  onRead,
  className,
}: {
  name: string;
  role: string;
  code?: string;
  finish?: NfcFinish;
  /** Cambia para simular una lectura. */
  readKey?: number;
  onRead?: () => void;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<SVGSVGElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const flip = useRef(0);
  const [status, setStatus] = useState("");
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  });

  // Inclinación, flotación y giro en un solo bucle (solo si se ve).
  useEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!stage || !card) return;
    let rx = 0, ry = 0, tx = 0, ty = 0, hover = false, drag = false, visible = true, raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const off = motionOff();
      if (!hover && !drag) {
        if (off) { tx = 0; ty = 0; } else { const k = (t - t0) / 1000; tx = Math.sin(k * 0.7) * 5; ty = Math.sin(k * 0.45) * 12; }
      }
      const gy = ty + flip.current * 180;
      const e = off ? 1 : 0.085;
      rx += (tx - rx) * e;
      ry += (gy - ry) * e;
      card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      const a = ((ry % 360) + 360) % 360;
      card.dataset.side = a > 90 && a < 270 ? "b" : "f";
      const nx = Math.sin((ry * Math.PI) / 180);
      card.style.setProperty("--sx", `${(50 + nx * 60).toFixed(1)}%`);
      card.style.setProperty("--sy", `${(40 - (rx / 14) * 40).toFixed(1)}%`);
      if (shadowRef.current) shadowRef.current.style.transform = `translateX(${(nx * -18).toFixed(1)}px) scaleX(${(1 - Math.abs(nx) * 0.25).toFixed(3)})`;
      if (wordRef.current) wordRef.current.style.transform = `translate(-50%,-50%) translateX(${(nx * -14).toFixed(1)}px)`;
    };
    raf = requestAnimationFrame(loop);
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(stage);
    const aim = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tx = -y * 28;
      ty = x * 36;
    };
    const enter = (e: PointerEvent) => { if (e.pointerType === "mouse") hover = true; };
    const leave = () => { hover = false; };
    const move = (e: PointerEvent) => { if (hover || drag) aim(e); };
    const down = (e: PointerEvent) => { if (e.pointerType !== "mouse") { drag = true; aim(e); } };
    const up = () => { drag = false; };
    stage.addEventListener("pointerenter", enter);
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      stage.removeEventListener("pointerenter", enter);
      stage.removeEventListener("pointerleave", leave);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up);
    };
  }, []);

  // Lectura simulada: el teléfono baja, la tarjeta brilla y se confirma.
  useEffect(() => {
    if (!readKey) return;
    const card = cardRef.current;
    const phone = phoneRef.current;
    if (!card || !phone) return;
    let cancelled = false;
    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
    flip.current = 0;
    (async () => {
      const off = motionOff();
      if (!off) await phone.animate([{ transform: "translate(-50%,-120%)", opacity: 0 }, { transform: "translate(-50%,8px)", opacity: 1 }], { duration: 620, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" }).finished;
      if (cancelled) return;
      card.classList.add(styles.reading);
      setStatus("Leyendo tarjeta…");
      await wait(1200);
      if (cancelled) return;
      card.classList.remove(styles.reading);
      card.classList.add(styles.read);
      setStatus(`Tarjeta leída · ${name}`);
      burstFrom(card, 18);
      onReadRef.current?.();
      if (!off) await phone.animate([{ transform: "translate(-50%,8px)", opacity: 1 }, { transform: "translate(-50%,-120%)", opacity: 0 }], { duration: 480, easing: "cubic-bezier(.7,0,.84,0)", fill: "forwards" }).finished;
      await wait(900);
      if (cancelled) return;
      card.classList.remove(styles.read);
      setStatus("");
    })();
    return () => {
      cancelled = true;
    };
  }, [readKey, name]);

  const toggle = () => (flip.current = flip.current ? 0 : 1);

  return (
    <div ref={stageRef} className={cn(styles.stage, className)} data-finish={finish}>
      <ThriveWord ref={wordRef} className={styles.word} />
      <div ref={phoneRef} className={styles.phone} aria-hidden="true">
        <i />
      </div>
      <div className={styles.wrap}>
        <div
          ref={cardRef}
          className={styles.card}
          tabIndex={0}
          role="button"
          aria-label={`Tarjeta NFC de ${name}. Toca para girarla.`}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
        >
          <i className={styles.edge} style={{ ["--e" as string]: 1 }} />
          <i className={styles.edge} style={{ ["--e" as string]: 2 }} />
          <div className={cn(styles.face, styles.front)}>
            <div className={styles.deco}>
              <i className={styles.tex} />
              <i className={styles.slashes} />
            </div>
            <div className={styles.logo}>
              {Array.from({ length: 6 }, (_, z) => (
                <Lockup key={z} className={cn(styles.layer, z === 5 && styles.layerTop)} style={{ ["--z" as string]: z }} />
              ))}
            </div>
            <div className={styles.mid}>
              <svg className={styles.waves} viewBox="0 0 80 40" aria-hidden="true">
                <path d="M22 34a20 20 0 0 1 36 0" />
                <path d="M12 30a32 32 0 0 1 56 0" />
                <path d="M2 26a44 44 0 0 1 76 0" />
              </svg>
              <div className={styles.chip}>
                <svg viewBox="0 0 46 36" aria-hidden="true">
                  <path d="M0 12h14M0 24h14M32 12h14M32 24h14M14 0v36M32 0v36M14 18h18" />
                </svg>
              </div>
            </div>
            <div className={styles.foot}>
              <div>
                <b>{name}</b>
                <small>{role}</small>
              </div>
              <span className={styles.tag}>NFC</span>
            </div>
            <div className={styles.shine} />
          </div>
          <div className={cn(styles.face, styles.back)}>
            <div className={styles.deco}>
              <i className={styles.tex} />
            </div>
            <ThriveWord className={styles.thrive} />
            <i className={styles.line} />
            <div className={styles.backFoot}>
              <span>Acerca tu teléfono para conectar</span>
              <span className="font-mono">{code}</span>
            </div>
            <svg viewBox="394.83 239.93 734.96 634.25" className={styles.markBack} aria-hidden="true" fill="currentColor">
              <path d={N_PATH} />
            </svg>
            <div className={styles.shine} />
          </div>
        </div>
        <div ref={shadowRef} className={styles.shadow} />
      </div>
      <p className={styles.status} aria-live="polite">
        {status}
      </p>
    </div>
  );
}
