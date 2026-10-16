/** Sustituto de `@clerk/nextjs` en Storybook: sin sesión ni red. */
export function UserButton() {
  return (
    <span
      aria-label="Cuenta"
      className="grid size-[34px] place-items-center rounded-md bg-primary font-display text-xs font-bold text-primary-foreground"
    >
      SN
    </span>
  );
}

/** Vista estática del formulario de Clerk con la apariencia de marca. */
function MockAuthForm({ title, subtitle, cta }: { title: string; subtitle: string; cta: string }) {
  return (
    <div className="grid gap-[18px]">
      <div className="grid gap-1.5">
        <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">{title}</h2>
        <p className="text-[14.5px] text-muted-foreground">{subtitle}</p>
      </div>
      <button type="button" className="h-[42px] rounded-md border border-border-strong bg-surface text-[13.5px] font-medium">
        Continuar con Google
      </button>
      <div className="flex items-center gap-3 text-[12.5px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">o</div>
      <label className="grid gap-1.5 text-[13px] font-medium">
        Correo electrónico
        <input placeholder="tu@negocio.com" className="h-11 rounded-md border border-border-input bg-surface px-3 text-[15px] font-normal" />
      </label>
      <button type="button" className="h-[46px] rounded-md bg-primary text-sm font-semibold text-primary-foreground">
        {cta}
      </button>
    </div>
  );
}

export function SignIn() {
  return <MockAuthForm title="Inicia sesión" subtitle="Continúa a NEXUS THRIVE con tu cuenta." cta="Continuar" />;
}

export function SignUp() {
  return <MockAuthForm title="Crea tu cuenta" subtitle="Empieza a ordenar tu negocio hoy." cta="Crear cuenta" />;
}
