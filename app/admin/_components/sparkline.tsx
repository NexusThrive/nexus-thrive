/**
 * Sparkline de la serie diaria de altas (SVG puro, sin dependencias).
 * Server component: el dato ya viene agregado desde la capa de datos.
 */
export default function Sparkline({
  series,
  className,
  ariaLabel = "Altas de los últimos 30 días",
}: {
  series: { date: string; count: number }[];
  className?: string;
  ariaLabel?: string;
}) {
  const width = 260;
  const height = 48;
  const pad = 3;

  const max = Math.max(1, ...series.map((point) => point.count));
  const step = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;

  const points = series.map((point, index) => {
    const x = pad + index * step;
    const y = height - pad - (point.count / max) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const lastX = (pad + Math.max(0, series.length - 1) * step).toFixed(1);
  const area = `${pad},${height - pad} ${line} ${lastX},${height - pad}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className={className}
    >
      <polygon points={area} fill="var(--surface-muted)" />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
