import type { FlowStep } from "./flow";

/** Una frase de AURI y la cara que pone al decirla. */
export type GuideLine = { text: string; mood: "neutral" | "joy" | "wink" | "surprise" | "think" | "curious" | "sad" };

export type GuideContext = {
  firstName?: string;
  /** Nombre del negocio que lleva escrito (AURI lo comenta). */
  businessName?: string;
  /** Perfil elegido en el paso 2. */
  tenantType?: "INDIVIDUAL" | "COMPANY" | null;
  /** Hay un beneficio de acceso (mes gratis, código) aplicado. */
  hasBenefit?: boolean;
};

/**
 * Lo que AURI dice en cada paso del onboarding: explica qué se pide y para qué sirve, con una cara distinta según el momento. Puras (sin
 * DOM) para probarlas. Reaccionan a lo que la persona ya escribió (su nombre, el perfil que eligió), sin inventar datos.
 */
export function guideLine(step: FlowStep, slide: number, ctx: GuideContext = {}): GuideLine {
  const who = ctx.firstName?.trim();
  switch (step) {
    case "intro":
      if (slide === 0) return { text: who ? `¡Hola ${who}! Soy AURI. Te voy a ayudar a crear tu espacio.` : "¡Hola! Soy AURI. Te voy a ayudar a crear tu espacio.", mood: "joy" };
      if (slide === 1) return { text: "Mira: registras un cobro y yo actualizo la caja, tus finanzas y la ficha del cliente.", mood: "curious" };
      return { text: "Son pocos pasos y menos de tres minutos. Empiezas gratis y sin tarjeta.", mood: "wink" };
    case "profile":
      if (ctx.tenantType === "COMPANY") return { text: "Empresa, perfecto. Te pediré los datos fiscales para dejarte lista la facturación.", mood: "surprise" };
      if (ctx.tenantType === "INDIVIDUAL") return { text: "Emprendedor, genial. Puedes empezar sin NIT ni local; lo demás lo agregas después.", mood: "joy" };
      return { text: "Cuéntame en qué etapa está tu negocio. Así te pregunto solo lo necesario.", mood: "curious" };
    case "business":
      if (ctx.businessName?.trim()) return { text: `¡${ctx.businessName.trim()}! Me gusta. Mira cómo se va armando tu espacio aquí al lado.`, mood: "joy" };
      return { text: "Escribe el nombre de tu negocio y mira cómo se arma tu espacio mientras tanto.", mood: "curious" };
    case "operation":
      return { text: "Cuéntame cómo trabajas. Con eso dejo listo lo que vas a usar desde el primer día.", mood: "think" };
    case "plan":
      if (ctx.hasBenefit) return { text: "Tu beneficio ya está listo. Lo activo cuando crees tu negocio, sin tarjeta ni cobro.", mood: "surprise" };
      return { text: "Elige cómo empezar. Puedes probar 15 días gratis sin tarjeta y cambiar cuando quieras.", mood: "joy" };
    case "confirm":
      return { text: "Último repaso. Si todo está bien, creo tu negocio y entramos juntos.", mood: "wink" };
  }
}

/** La barra de progreso del paso: «Paso 2 de 5 · Tu negocio». */
export function stepCaption(current: number, total: number, label: string | undefined): string {
  return `Paso ${current} de ${total}${label ? ` · ${label}` : ""}`;
}
