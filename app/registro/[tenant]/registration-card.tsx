import RegistrationForm from "./registration-form";

/**
 * Tarjeta del registro de clientes: logotipo, nombre del negocio y formulario.
 * La usa la página pública y, con `preview`, la vista previa del panel del
 * negocio (los campos se ven pero no se pueden enviar).
 */
export default function RegistrationCard({ slug, name, logoUrl, preview = false }: { slug: string; name: string; logoUrl: string | null; preview?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <header className="mb-6 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`Logotipo de ${name}`} className="mx-auto size-20 rounded-2xl border border-border bg-card object-contain p-2" />
        ) : (
          <span aria-hidden="true" className="mx-auto grid size-20 place-items-center rounded-2xl bg-primary font-display text-2xl font-bold text-primary-foreground">
            {name.trim().charAt(0).toUpperCase() || "G"}
          </span>
        )}
        <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">{name}</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Regístrate y el equipo te contactará para activar tu membresía.</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <RegistrationForm slug={slug} business={name} preview={preview} />
      </div>

      <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Tus datos se usan solo para gestionar tu registro en {name}.</p>
    </div>
  );
}
