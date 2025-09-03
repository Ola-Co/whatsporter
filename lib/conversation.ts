// // app/lib/conversation.ts
// import type { VehicleType } from "./types";

// export type ConversationStep =
//   | "INIT"
//   | "WAIT_SENDER_DETAILS"
//   | "WAIT_VEHICLE"
//   | "WAIT_ORDER_DETAILS"
//   | "COMPLETE";

// export interface ConversationData {
//   step: ConversationStep;
//   sender_name?: string;
//   sender_phone?: string;
//   recipient_name?: string;
//   recipient_phone?: string;
//   destination_address?: string;
//   vehicle_type?: VehicleType;
//   order_details?: string;
//   pickup_location?: string;
// }

// // In-memory store (replace with Redis/DB in prod)
// const sessions = new Map<string, ConversationData>();

// export function getConversation(userId: string): ConversationData {
//   if (!sessions.has(userId)) {
//     sessions.set(userId, { step: "INIT" });
//   }
//   return sessions.get(userId)!;
// }

// export function updateConversation(
//   userId: string,
//   data: Partial<ConversationData>
// ): void {
//   const prev = getConversation(userId);
//   sessions.set(userId, { ...prev, ...data });
// }

// export function resetConversation(userId: string): void {
//   sessions.set(userId, { step: "INIT" });
// }
// app/lib/conversation.ts
import redis from "./redis";
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

const TTL_SECONDS = 60 * 60; // expire after 1h inactivity

function key(userId: string) {
  return `conv:${userId}`;
}

export async function getConversation(
  userId: string
): Promise<ConversationData> {
  const data = await redis.get(key(userId));
  if (data) {
    return JSON.parse(data) as ConversationData;
  }
  const initial: ConversationData = { step: "INIT" };
  await redis.set(key(userId), JSON.stringify(initial), "EX", TTL_SECONDS);
  return initial;
}

export async function updateConversation(
  userId: string,
  data: Partial<ConversationData>
): Promise<void> {
  const current = await getConversation(userId);
  const merged = { ...current, ...data };
  await redis.set(key(userId), JSON.stringify(merged), "EX", TTL_SECONDS);
}

export async function resetConversation(userId: string): Promise<void> {
  const initial: ConversationData = { step: "INIT" };
  await redis.set(key(userId), JSON.stringify(initial), "EX", TTL_SECONDS);
}
export async function archiveConversation(userId: string): Promise<void> {
  const data = await getConversation(userId);
  await redis.lpush(
    "orders",
    JSON.stringify({ userId, ...data, createdAt: Date.now() })
  );
}
