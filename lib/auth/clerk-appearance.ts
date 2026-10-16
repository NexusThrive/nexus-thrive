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
    colorPrimary: "#0a0a0b",
    colorDanger: "#b3261e",
    colorSuccess: "#2e7d5b",
    colorText: "#0a0a0b",
    colorTextSecondary: "#6b6b73",
    colorInputBackground: "#ffffff",
    colorInputText: "#0a0a0b",
    borderRadius: "4px",
    fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
    fontSize: "14px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full max-w-none border-0 bg-transparent shadow-none",
    card: "w-full gap-[18px] border-0 bg-transparent p-0 shadow-none",
    header: "gap-1.5 items-start text-left",
    headerTitle: "font-display text-[clamp(24px,5vw,28px)] font-bold leading-tight tracking-[-0.02em] text-foreground",
    headerSubtitle: "text-[14.5px] text-muted-foreground",
    socialButtons: "grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]!",
    socialButtonsBlockButton:
      "h-[42px] rounded-md border border-border-strong bg-surface text-[13.5px] font-medium text-foreground shadow-none transition-colors hover:border-border-input hover:bg-surface-muted",
    socialButtonsBlockButtonText: "font-medium",
    dividerLine: "bg-border",
    dividerText: "text-[12.5px] text-muted-foreground",
    formFieldLabel: "text-[13px] font-medium text-foreground",
    formFieldAction: "text-[12.5px] font-medium text-accent-text hover:underline",
    formFieldInput:
      "h-11 rounded-md border border-border-input bg-surface px-3 text-[15px] text-foreground shadow-none transition-[border-color,box-shadow] focus:border-ring focus:shadow-[0_0_0_3px_rgba(212,175,55,.2)] focus:outline-none",
    formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
    formFieldErrorText: "text-[12.5px] text-danger",
    formFieldHintText: "text-xs text-muted-foreground",
    formButtonPrimary:
      "h-[46px] rounded-md bg-primary bg-none text-sm font-semibold normal-case text-primary-foreground shadow-none transition-[filter] hover:brightness-[1.2] active:scale-[.98]",
    formResendCodeLink: "text-[13px] font-semibold text-accent-text",
    otpCodeFieldInput:
      "h-14 w-full rounded-md border border-border-input bg-surface font-display text-2xl font-bold tabular-nums text-foreground caret-[var(--nx-gold-500)] focus:border-ring focus:shadow-[0_0_0_3px_rgba(212,175,55,.2)]",
    identityPreview: "rounded-md border border-border bg-surface-muted",
    identityPreviewEditButton: "text-muted-foreground hover:text-foreground",
    alert: "rounded-md border-0 border-l-[3px] border-l-danger bg-danger-subtle text-[13px]",
    footer: "bg-none bg-transparent [&>*]:bg-transparent",
    footerAction: "justify-center",
    footerActionText: "text-[13.5px] text-muted-foreground",
    footerActionLink:
      "border-b border-accent text-[13.5px] font-semibold text-foreground no-underline hover:text-accent-text",
  },
} as const;
