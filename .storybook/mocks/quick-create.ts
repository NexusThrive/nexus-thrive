/** Datos de los mini-modales de «Crear» en Storybook: muestra, sin servidor ni base. */
export type QuickCreateData = {
  customers: { id: string; name: string; email: string; phone: string | null }[];
  cashOpen: boolean;
  business: { name: string; subtitle?: string };
};

export async function loadQuickCreateDataAction(): Promise<QuickCreateData> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    customers: [
      { id: "c1", name: "Carlos Peña", email: "carlos@ejemplo.co", phone: "3001234567" },
      { id: "c2", name: "Laura Gómez", email: "", phone: null },
    ],
    cashOpen: true,
    business: { name: "Constructora Andina", subtitle: "Medellín" },
  };
}
