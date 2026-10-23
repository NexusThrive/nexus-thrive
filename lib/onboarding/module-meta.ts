import type { LucideIcon } from "lucide-react";
import type { ModuleValue } from "@/lib/admin/catalogs";
import { CAPABILITIES } from "@/lib/capabilities/registry";

/** Icono de cada módulo en el onboarding y la vista previa del negocio (del registro). */
export const MODULE_ICONS = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.icon])) as Record<ModuleValue, LucideIcon>;

export const MODULE_DESCRIPTIONS = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.pitch])) as Record<ModuleValue, string>;
