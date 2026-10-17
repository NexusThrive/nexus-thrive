/**
 * Se vuelve a montar en cada navegación del negocio: la vista nueva entra
 * con un enfoque corto (opacidad + desenfoque, 360 ms) en lugar de aparecer
 * de golpe.
 */
export default function TenantViewTemplate({ children }: { children: React.ReactNode }) {
  return <div className="nx-view-in">{children}</div>;
}
