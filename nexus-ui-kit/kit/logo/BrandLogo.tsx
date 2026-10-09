import type { SVGProps } from "react";

/**
 * Logo oficial NEXUS THRIVE — geometría exacta del archivo NEXUS_THRIVE.svg
 * (transformaciones ya aplanadas). Usa currentColor: se tiñe con `className`.
 *
 *  - variant="lockup": N + THRIVE debajo, tal cual el logo (uso principal).
 *  - variant="mark":   solo la N (sidebar colapsado, favicon, avatar, loaders).
 *
 * `size` es el ANCHO en px; el alto se calcula con la proporción real.
 */
export const N_PATH =
  "M394.83 874.18 L394.83 239.93 L699.27 239.93 L837.22 525.34 L864.18 511.07 L799.96 371.52 L799.96 239.93 L1129.79 239.93 L1129.79 874.18 L815.82 874.18 L704.04 614.93 L677.87 630.79 L725.44 741.77 L725.44 874.18 Z";

const THRIVE_LETTERS = [
  { x: 387.667002, y: 1017.189804, d: "M 24.6875 -61.484375 L 0.4375 -61.484375 L 0.4375 -75.78125 L 66.46875 -75.78125 L 66.46875 -61.484375 L 42.21875 -61.484375 L 42.21875 0 L 24.6875 0 Z M 24.6875 -61.484375" },
  { x: 520.270223, y: 1017.189804, d: "M 78.484375 -75.78125 L 78.484375 0 L 60.9375 0 L 60.9375 -31.0625 L 26.515625 -31.0625 L 26.515625 0 L 8.984375 0 L 8.984375 -75.78125 L 26.515625 -75.78125 L 26.515625 -45.890625 L 60.9375 -45.890625 L 60.9375 -75.78125 Z M 78.484375 -75.78125" },
  { x: 673.44019, y: 1017.189804, d: "M 57.265625 0 L 42.65625 -21.109375 L 26.515625 -21.109375 L 26.515625 0 L 8.984375 0 L 8.984375 -75.78125 L 41.78125 -75.78125 C 48.5 -75.78125 54.328125 -74.660156 59.265625 -72.421875 C 64.210938 -70.179688 68.019531 -67.003906 70.6875 -62.890625 C 73.351562 -58.773438 74.6875 -53.90625 74.6875 -48.28125 C 74.6875 -42.65625 73.332031 -37.800781 70.625 -33.71875 C 67.925781 -29.644531 64.085938 -26.523438 59.109375 -24.359375 L 76.09375 0 Z M 56.9375 -48.28125 C 56.9375 -52.539062 55.566406 -55.804688 52.828125 -58.078125 C 50.085938 -60.347656 46.082031 -61.484375 40.8125 -61.484375 L 26.515625 -61.484375 L 26.515625 -35.078125 L 40.8125 -35.078125 C 46.082031 -35.078125 50.085938 -36.226562 52.828125 -38.53125 C 55.566406 -40.84375 56.9375 -44.09375 56.9375 -48.28125 Z M 56.9375 -48.28125" },
  { x: 818.708225, y: 1017.189804, d: "M 8.984375 -75.78125 L 26.515625 -75.78125 L 26.515625 0 L 8.984375 0 Z M 8.984375 -75.78125" },
  { x: 919.487086, y: 1017.189804, d: "M 81.84375 -75.78125 L 49.03125 0 L 31.71875 0 L -0.96875 -75.78125 L 17.96875 -75.78125 L 41.03125 -21.65625 L 64.40625 -75.78125 Z M 81.84375 -75.78125" },
  { x: 1064.322078, y: 1017.189804, d: "M 67.65625 -14.078125 L 67.65625 0 L 8.984375 0 L 8.984375 -75.78125 L 66.25 -75.78125 L 66.25 -61.703125 L 26.40625 -61.703125 L 26.40625 -45.25 L 61.59375 -45.25 L 61.59375 -31.609375 L 26.40625 -31.609375 L 26.40625 -14.078125 Z M 67.65625 -14.078125" }
] as const;

const VIEW = {
  lockup: { box: "387.6 239.9 744.4 779.5", ratio: 779.5 / 744.4 },
  mark: { box: "394.83 239.93 734.96 634.25", ratio: 634.25 / 734.96 },
} as const;

type Props = Omit<SVGProps<SVGSVGElement>, "viewBox" | "width" | "height"> & {
  variant?: "lockup" | "mark";
  size?: number;
  title?: string;
};

export function BrandLogo({ variant = "lockup", size = 96, title = "NEXUS THRIVE", ...rest }: Props) {
  const v = VIEW[variant];
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={v.box}
      width={size}
      height={Math.round(size * v.ratio)}
      shapeRendering="geometricPrecision"
      {...rest}
    >
      <path d={N_PATH} fill="currentColor" />
      {variant === "lockup"
        ? THRIVE_LETTERS.map((l, i) => (
            <path key={i} transform={`translate(${l.x} ${l.y})`} d={l.d} fill="currentColor" />
          ))
        : null}
    </svg>
  );
}

export default BrandLogo;
