/** Sustituto de `@clerk/nextjs` en Storybook: sin sesión ni red. */
export function UserButton() {
  return (
    <span
      aria-label="Cuenta"
      className="grid size-8 place-items-center rounded bg-primary text-xs font-semibold text-primary-foreground"
    >
      SN
    </span>
  );
}
