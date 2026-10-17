import type { LucideIcon } from "lucide-react";
import {
  Banknote, Bell, Bike, Box, Briefcase, CalendarDays, Clock, Coins, Construction, CreditCard, Dumbbell,
  FileText, Globe, HardHat, HeartPulse, Home, Image, KeyRound, Layers, LayoutGrid, LineChart, MessageCircle,
  Package, PenLine, Pill, QrCode, ScanBarcode, Scissors, Signature, Truck, User, Users, UtensilsCrossed,
} from "lucide-react";

/** Clave de icono del catálogo de precios → icono lucide. */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  user: User, calendar: CalendarDays, coins: Coins, home: Home, message: MessageCircle, file: FileText,
  box: Box, cash: Banknote, chart: LineChart, team: Users, bell: Bell, card: CreditCard, key: KeyRound,
  dumbbell: Dumbbell, grid: LayoutGrid, scissors: Scissors, package: Package, image: Image, heart: HeartPulse,
  pen: PenLine, prescription: Pill, table: UtensilsCrossed, qr: QrCode, bike: Bike, pos: ScanBarcode,
  globe: Globe, truck: Truck, crane: Construction, layers: Layers, helmet: HardHat, briefcase: Briefcase,
  clock: Clock, signature: Signature,
};
