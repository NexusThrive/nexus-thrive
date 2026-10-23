"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { NMark } from "@/components/atoms/n-mark";
import { RevealText } from "@/components/atoms/reveal-text";
import { Button } from "@/components/atoms/button";
import styles from "./creation-cinematic.module.css";

const MESSAGES = ["Creando tu negocio…", "Activando tus módulos…", "Preparando tu panel…", "Últimos detalles…"];

export type CinematicStatus = "creating" | "ready" | "error";

type Stage = "creating" | "ready" | "welcome" | "error";

const delay = (ms: number) => ({ ["--delay" as string]: `${ms}ms` }) as CSSProperties;

/**
 * Cinemática al terminar el onboarding, a pantalla completa y con el tema
 * activo (claro u oscuro):
 *
 * 1. `creating`: la N se traza en bucle en el centro exacto de la pantalla,
 *    con el mensaje de lo que se está haciendo y una barra fina.
 * 2. `ready`: la N se llena y la cámara retrocede (la N se aleja en
 *    profundidad y sube); entra "Tu negocio está listo" y "Continuar".
 * 3. Al continuar: un paso más atrás y "Bienvenido a Thrive {plan}" con el
 *    botón para entrar (la recarga completa dispara la intro de la app).
 * 4. `error`: mensaje y volver a la confirmación.
 *
 * Composición fija: cada paso ocupa el mismo sitio, nada salta. Sin
 * movimiento (`prefers-reduced-motion` o Ajustes), todo aparece en su lugar.
 */
export function CreationCinematic({
  status,
  planName,
  businessName,
  error,
  onEnter,
  onBack,
}: {
  status: CinematicStatus;
  planName: string;
  businessName: string;
  error?: string;
  onEnter: () => void;
  onBack: () => void;
}) {
  const [welcome, setWelcome] = useState(false);
  const [message, setMessage] = useState(0);

  useEffect(() => {
    if (status !== "creating") return;
    const id = window.setInterval(() => setMessage((m) => (m + 1) % MESSAGES.length), 1400);
    return () => window.clearInterval(id);
  }, [status]);

  const stage: Stage = status === "ready" ? (welcome ? "welcome" : "ready") : status;
  const label = {
    creating: "Creando tu negocio",
    ready: "Tu negocio está listo",
    welcome: `Bienvenido a Thrive ${planName}`,
    error: "No pudimos crear tu negocio",
  }[stage];

  return (
    <div role="dialog" aria-modal="true" aria-label={label} data-stage={stage} className={styles.root}>
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.mark}>
          <NMark size={144} state={status === "creating" ? "loop" : "done"} />
        </div>
      </div>

      {stage === "creating" ? (
        <div className={styles.copy} data-slot="creating">
          <h1 className="sr-only">Creando tu negocio</h1>
          <p key={message} aria-live="polite" className={`${styles.status} ${styles.enter}`}>
            {MESSAGES[message]}
          </p>
          <span aria-hidden="true" className={styles.track} />
        </div>
      ) : null}

      {stage === "ready" ? (
        <div className={styles.copy} data-slot="ready">
          <RevealText
            as="h1"
            parts={["Tu negocio está listo"]}
            className="font-display text-[clamp(26px,4.2vw,36px)] font-bold leading-tight tracking-[-0.01em]"
          />
          <div className={styles.enter} style={delay(500)}>
            <Button variant="accent" size="lg" autoFocus onClick={() => setWelcome(true)} className="mt-7 min-w-48">
              Continuar
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {stage === "welcome" ? (
        <div className={styles.copy} data-slot="welcome">
          <p className={`${styles.eyebrow} ${styles.enter}`} style={delay(250)}>
            Bienvenido a
          </p>
          <RevealText
            as="h1"
            parts={["Thrive ", { text: planName, gold: true }]}
            className="mt-2 font-display text-[clamp(36px,7vw,64px)] font-bold leading-none tracking-[-0.02em]"
          />
          <p className={`${styles.detail} ${styles.enter} mt-3`} style={delay(650)}>
            {businessName} ya está en NEXUS.
          </p>
          <div className={styles.enter} style={delay(850)}>
            <Button variant="accent" size="lg" autoFocus onClick={onEnter} className="mt-7 min-w-56">
              Entrar a mi negocio
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {stage === "error" ? (
        <div className={styles.copy} data-slot="error">
          <h1 className={`font-display text-xl font-semibold ${styles.enter}`}>
            No pudimos crear tu negocio
          </h1>
          <p role="alert" className={`${styles.detail} ${styles.enter} mt-2 max-w-[42ch]`} style={delay(120)}>
            {error ?? "Inténtalo de nuevo en un momento."}
          </p>
          <div className={styles.enter} style={delay(240)}>
            <Button variant="outline" autoFocus onClick={onBack} className="mt-6">
              Volver a revisar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
