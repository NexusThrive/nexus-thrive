/**
 * Apariencia de Clerk con la marca NEXUS THRIVE, sin tarjeta ("flush"): el
 * formulario se apoya directo sobre la página como en el diseño de acceso.
 * Clerk acepta clases en `elements`; Tailwind las encuentra porque escanea
 * este archivo. Mantiene la lógica de Clerk (correo → contraseña → código,
 * Google/Microsoft, restablecer contraseña) y solo cambia el aspecto.
 */
import { esMX } from "@clerk/localizations";

/**
 * Textos de Clerk en español con el tono del producto (esMX como base y los
 * títulos del diseño de acceso encima).
 */
export const clerkLocalization = {
  ...esMX,
  signIn: {
    ...esMX.signIn,
    start: {
      ...esMX.signIn?.start,
      title: "Inicia sesión",
      subtitle: "Continúa a NEXUS THRIVE con tu cuenta.",
      actionText: "¿No tienes cuenta?",
      actionLink: "Regístrate",
    },
    password: {
      ...esMX.signIn?.password,
      title: "Introduce tu contraseña",
      subtitle: "Usa la contraseña asociada a tu cuenta.",
    },
  },
  signUp: {
    ...esMX.signUp,
    start: {
      ...esMX.signUp?.start,
      title: "Crea tu cuenta",
      subtitle: "Empieza a ordenar tu negocio hoy.",
      actionText: "¿Ya tienes cuenta?",
      actionLink: "Inicia sesión",
    },
  },
  formButtonPrimary: "Continuar",
  dividerText: "o",
  formFieldLabel__emailAddress_username: "Correo electrónico",
  formFieldLabel__emailAddress: "Correo electrónico",
  formFieldInputPlaceholder__emailAddress_username: "tu@negocio.com",
  formFieldInputPlaceholder__emailAddress: "tu@negocio.com",
};

/** Opciones globales para <ClerkProvider>: estilos de Clerk en su propia capa. */
export const clerkProviderAppearance = {
  // Sin capa, el CSS de Clerk le gana a cualquier utilidad de Tailwind; en la
  // capa "clerk" (declarada antes de utilities en globals.css) pierde.
  cssLayerName: "clerk",
} as const;

export const clerkAppearance = {
  layout: {
    logoPlacement: "none",
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
    showOptionalFields: true,
  },
  variables: {
    colorPrimary: "#d4af37",
    colorDanger: "#b3261e",
    colorSuccess: "#2e7d5b",
    colorText: "#0a0a0b",
    colorTextSecondary: "#6b6b73",
    colorInputBackground: "#ffffff",
    colorInputText: "#0a0a0b",
    borderRadius: "16px",
    fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
    fontSize: "14px",
  },
  elements: {
    // Clerk recorta con overflow:hidden y sus campos dibujan el borde con una
    // sombra que cae fuera del contenedor: sin esto se corta el borde izquierdo.
    rootBox: "w-full overflow-visible",
    cardBox: "w-full max-w-none overflow-visible! border-0 bg-transparent shadow-none!",
    card: "w-full gap-[18px] overflow-visible! border-0 bg-transparent p-0 shadow-none!",
    main: "overflow-visible!",
    form: "overflow-visible!",
    header: "gap-1.5 items-start text-left",
    headerTitle: "font-display text-[clamp(24px,5vw,28px)] font-semibold leading-tight tracking-[-0.02em] text-foreground",
    headerSubtitle: "text-[14.5px] text-muted-foreground",
    socialButtons: "grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]!",
    socialButtonsBlockButton:
      "h-14 rounded-full border border-border/60 bg-card text-[14px] font-medium text-foreground shadow-none! transition-colors hover:border-accent/60 hover:bg-accent-subtle",
    socialButtonsBlockButtonText: "font-medium",
    dividerLine: "bg-border",
    dividerText: "text-[12.5px] text-muted-foreground",
    formFieldLabel: "text-[13px] font-medium text-foreground",
    formFieldAction: "text-[12.5px] font-medium text-accent-text hover:underline",
    formFieldInput:
      "h-14 rounded-2xl border border-border/60 bg-card px-4 text-[15px] text-foreground shadow-none! transition-[border-color,box-shadow,background] hover:border-border-input-hover focus:border-accent focus:bg-card focus:shadow-[0_0_0_4px_rgba(212,175,55,.18)]! focus:outline-none",
    formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
    formFieldErrorText: "text-[12.5px] text-danger",
    formFieldHintText: "text-xs text-muted-foreground",
    formButtonPrimary:
      "h-14 rounded-full bg-accent bg-none! text-sm font-semibold normal-case text-ink shadow-none! transition-[filter,transform] after:hidden hover:brightness-[1.06] active:scale-[.98]",
    formResendCodeLink: "text-[13px] font-semibold text-accent-text",
    otpCodeFieldInput:
      "h-16 w-full rounded-2xl border border-border/60 bg-card font-display text-2xl font-semibold tabular-nums text-foreground caret-[var(--nx-gold-500)] focus:border-accent focus:bg-card focus:shadow-[0_0_0_4px_rgba(212,175,55,.18)]",
    identityPreview: "rounded-2xl border border-border/60 bg-surface-muted/60",
    identityPreviewEditButton: "text-muted-foreground hover:text-foreground",
    alert: "rounded-2xl border-0 bg-danger-subtle text-[13px]",
    footer: "bg-none bg-transparent [&>*]:bg-transparent",
    footerAction: "justify-center",
    footerActionText: "text-[13.5px] text-muted-foreground",
    footerActionLink:
      "border-b border-accent text-[13.5px] font-semibold text-foreground no-underline hover:text-accent-text",
  },
} as const;
