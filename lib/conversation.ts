// app/lib/conversation.ts
import type { VehicleType } from "./types";

export type ConversationStep =
  | "INIT"
  | "WAIT_SENDER_DETAILS"
  | "WAIT_VEHICLE"
  | "WAIT_ORDER_DETAILS"
  | "COMPLETE";

export interface ConversationData {
  step: ConversationStep;
  sender_name?: string;
  sender_phone?: string;
  recipient_name?: string;
  recipient_phone?: string;
  destination_address?: string;
  vehicle_type?: VehicleType;
  order_details?: string;
  pickup_location?: string;
}

// In-memory store (replace with Redis/DB in prod)
const sessions = new Map<string, ConversationData>();

export function getConversation(userId: string): ConversationData {
  if (!sessions.has(userId)) {
    sessions.set(userId, { step: "INIT" });
  }
  return sessions.get(userId)!;
}

export function updateConversation(
  userId: string,
  data: Partial<ConversationData>
): void {
  const prev = getConversation(userId);
  sessions.set(userId, { ...prev, ...data });
}

export function resetConversation(userId: string): void {
  sessions.set(userId, { step: "INIT" });
}
