import {
  ArrowRightLeft,
  Home,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { ActivityType } from "@/lib/constants";

export const ACTIVITY_TYPE_META: Record<
  ActivityType,
  { label: string; icon: LucideIcon; color: string }
> = {
  note: { label: "Note", icon: StickyNote, color: "#9B7FD1" },
  call: { label: "Call", icon: Phone, color: "#4A90C2" },
  email: { label: "Email", icon: Mail, color: "#4FAE8A" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "#3FA3A0" },
  viewing: { label: "Viewing", icon: Home, color: "#E0A339" },
  status_change: { label: "Status change", icon: ArrowRightLeft, color: "#7A8B84" },
};

/** Activity types a user can manually log (status_change is system-generated). */
export const LOGGABLE_ACTIVITY_TYPES: ActivityType[] = [
  "note",
  "call",
  "email",
  "whatsapp",
  "viewing",
];

/** Logging one of these activity types also bumps the lead's last_contact_at. */
export const CONTACT_ACTIVITY_TYPES: ActivityType[] = [
  "call",
  "email",
  "whatsapp",
  "viewing",
];
