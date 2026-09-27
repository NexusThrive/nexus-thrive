import type { HTMLAttributes } from "react";
import starlogo from "../assets/starlogo.png";

const starSrc = typeof starlogo === "string" ? starlogo : starlogo.src;

export type LogoSize = "sm" | "md" | "lg";

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  /** sm = header compacto · md = default · lg = pantallas de bienvenida/marketing */
  size?: LogoSize;
  /** Rotación de la estrella en grados (positivo = hacia la derecha). */
  starRotation?: number;
  /** Tamaño de la estrella como % del alto del texto (default 100). */
  starSize?: number;
  /** Clases extra para afinar la posición de la estrella (top/left con Tailwind arbitrario). */
  starClassName?: string;
}

const sizeClasses: Record<LogoSize, string> = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
};

/** Wordmark NEXUS — tipografía Public Stunt con la estrella sobre la esquina de la N. */
export function Logo({
  size = "md",
  starRotation = 150,
  starSize = 120,
  starClassName = "",
  className = "",
  ...props
}: LogoProps) {
  return (
    <div
      className={`relative inline-block leading-none ${sizeClasses[size]} ${className}`}
      {...props}
    >
      <img
        src={starSrc}
        alt=""
        aria-hidden
        className={`pointer-events-none absolute object-contain ${starClassName}`}
        style={{
          width: `${starSize / 79}em`,
          height: "auto",
          top: "-0.6em",
          left: "-0.7em",
          transform: `rotate(${starRotation / 100}deg)`,
        }}
      />
      <span
        className="uppercase"
        style={{
          fontFamily:
            'var(--font-public-stunt, "Public Stunt"), "Space Grotesk", sans-serif',
          fontWeight: 400,
          letterSpacing: "0.02em",
        }}
      >
        Nexus
      </span>
    </div>
  );
}
