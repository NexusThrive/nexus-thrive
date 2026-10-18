export type AgendaBooking = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  productId: string | null;
  staffUserId: string | null;
  staffName: string | null;
  start: number;
  end: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  partySize: number;
  amount: number;
  notes: string | null;
  reminderSent: boolean;
};
export type AgendaService = { id: string; name: string; price: number; durationMinutes: number | null; capacity: number | null };
export type AgendaOption = { id: string; name: string };
