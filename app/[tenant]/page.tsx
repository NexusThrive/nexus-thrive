export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  return (
    <div>
      <h1>Panel del Negocio (Tenant)</h1>

      <p>
        Subdominio detectado: <strong>{tenant}</strong>
      </p>
    </div>
  );
}
