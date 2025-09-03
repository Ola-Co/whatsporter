//file: app/api/whatsapp/route.ts
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isE164 } from "@/lib/validate";
import { getTravelSeconds } from "@/lib/googleMaps";
import { sendButtons, sendText } from "@/lib/whatsapphelper";
import type { VehicleType } from "@/lib/types";
import {
  archiveConversation,
  getConversation,
  resetConversation,
  updateConversation,
} from "@/lib/conversation";

// --- Types for WhatsApp webhook (narrowed to what we use) ---
interface WAMessageInteractiveFlowReply {
  type: "flow_reply";
  // Some tenants receive results under interactive["results"], others under interactive["flow_reply"]["results"].
  // We'll support both shapes defensively.
  results?: Record<string, unknown>;
  flow_reply?: { results?: Record<string, unknown> };
}
interface WAMessageInteractiveButtonReply {
  type: "button_reply";
  button_reply: { id: string; title: string };
}
type WAMessageInteractive =
  | WAMessageInteractiveFlowReply
  | WAMessageInteractiveButtonReply;

interface WAMessage {
  from: string; // WA user id
  type: "text" | "interactive";
  text?: { body?: string };
  interactive?: WAMessageInteractive;
  id?: string;
  timestamp?: string;
}
interface WAChangeValue {
  metadata?: { phone_number_id?: string };
  messages?: WAMessage[];
}
interface WAChange {
  value?: WAChangeValue;
}
interface WAPayload {
  entry?: Array<{ changes?: WAChange[] }>;
}

// --- Webhook Verification (GET) ---
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw = await req.text();
  let payload: WAPayload;

  try {
    payload = JSON.parse(raw) as WAPayload;
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const entries = payload.entry ?? [];
  for (const e of entries) {
    const changes = e.changes ?? [];
    for (const ch of changes) {
      const value = ch.value;
      if (!value?.messages?.length) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      for (const m of value.messages) {
        const from = m.from;
        const session = await getConversation(from);

        console.log("📥 Incoming message:", JSON.stringify(m, null, 2));
        console.log("📌 Session:", JSON.stringify(session));
        try {
          // --- TEXT MESSAGES ---
          if (m.type === "text") {
            const text = m.text?.body?.trim();
            if (!text) continue;

            // Restart command
            if (
              ["start", "book", "delivery"].some((cmd) =>
                text.toLowerCase().includes(cmd)
              )
            ) {
              await resetConversation(from);
              await updateConversation(from, { step: "WAIT_SENDER_DETAILS" });
              await sendText({
                to: from,
                body: "🚚 Let's book your delivery!\nPlease send:\nSender Name; Sender Phone; Recipient Name; Recipient Phone; Drop-off Address\n(separated by semi-colon)",
                phoneNumberId,
              });
              continue;
            }

            // Step: WAIT_SENDER_DETAILS
            if (session.step === "WAIT_SENDER_DETAILS") {
              const parts = text.split(";").map((p) => p.trim());
              if (parts.length < 5) {
                await sendText({
                  to: from,
                  body: "⚠️ Please provide all details in format:\nName; Phone; Recipient Name; Recipient Phone; Drop-off Address",
                  phoneNumberId,
                });
                continue;
              }

              const [
                sender_name,
                sender_phone,
                recipient_name,
                recipient_phone,
                destination_address,
              ] = parts;

              if (!isE164(sender_phone) || !isE164(recipient_phone)) {
                await sendText({
                  to: from,
                  body: "📱 Phone numbers must be in E.164 format (e.g., +14155552671). Try again.",
                  phoneNumberId,
                });
                continue;
              }

              await updateConversation(from, {
                step: "WAIT_VEHICLE",
                sender_name,
                sender_phone,
                recipient_name,
                recipient_phone,
                destination_address,
              });

              await sendButtons({
                to: from,
                body: "Select vehicle type:",
                buttons: [
                  { id: "veh_bike", title: "Bike" },
                  { id: "veh_car", title: "Car" },
                  { id: "veh_van", title: "Van" },
                ],
                phoneNumberId,
              });
              continue;
            }

            // Step: WAIT_ORDER_DETAILS
            if (session.step === "WAIT_ORDER_DETAILS") {
              const parts = text.split(";").map((p) => p.trim());
              if (parts.length < 2) {
                await sendText({
                  to: from,
                  body: "⚠️ Please provide both fields:\nItem Description; Pickup Address",
                  phoneNumberId,
                });
                continue;
              }

              const [order_details, pickup_location] = parts;
              await updateConversation(from, {
                step: "COMPLETE",
                order_details,
                pickup_location,
              });

              // Calculate quote
              const seconds = await getTravelSeconds(
                pickup_location,
                session.destination_address!,
                process.env.GOOGLE_MAPS_API_KEY ?? ""
              );
              const minutes = Math.max(1, Math.ceil(seconds / 60));
              const price = minutes * 1;

              await sendButtons({
                to: from,
                body:
                  `🚚 *Delivery Quote*\n` +
                  `Sender: ${session.sender_name} (${session.sender_phone})\n` +
                  `Recipient: ${session.recipient_name} (${session.recipient_phone})\n` +
                  `Vehicle: ${session.vehicle_type}\n` +
                  `Item: ${order_details}\n` +
                  `From: ${pickup_location}\n` +
                  `To: ${session.destination_address}\n\n` +
                  `⏱️ ETA: ~${minutes} min\n` +
                  `💵 Price: $${price}\n\n` +
                  `Confirm booking?`,
                buttons: [
                  { id: "confirm_booking", title: "Confirm" },
                  { id: "cancel_booking", title: "Cancel" },
                ],
                phoneNumberId,
              });
              continue;
            }
          }

          // --- INTERACTIVE MESSAGES ---
          if (m.type === "interactive") {
            console.log(
              "📲 Interactive payload:",
              JSON.stringify(m.interactive, null, 2)
            );

            if (
              session.step === "WAIT_VEHICLE" &&
              m.interactive?.type === "button_reply"
            ) {
              const btn = m.interactive.button_reply;
              if (btn && btn.id.startsWith("veh_")) {
                const vehicle = btn.title as VehicleType;
                await updateConversation(from, {
                  step: "WAIT_ORDER_DETAILS",
                  vehicle_type: vehicle,
                });

                await sendText({
                  to: from,
                  body: "📦 Please provide item details and pickup location in format:\nItem Description, Pickup Address",
                  phoneNumberId,
                });
                continue;
              }
            }

            if (
              session.step === "COMPLETE" &&
              m.interactive?.type === "button_reply"
            ) {
              const btn = m.interactive.button_reply;
              if (btn?.id === "confirm_booking") {
                await sendText({
                  to: from,
                  body: "✅ Booking confirmed! We'll assign a porter shortly.",
                  phoneNumberId,
                });
                console.log("These are the order details we have ", session);
                await archiveConversation(from);
                await resetConversation(from);
                continue;
              } else if (btn?.id === "cancel_booking") {
                await sendText({
                  to: from,
                  body: "❌ Booking cancelled. Send 'book' to start again.",
                  phoneNumberId,
                });
                await resetConversation(from);
                continue;
              }
            }
          }

          // --- DEFAULT FALLBACK ---
          await sendText({
            to: from,
            body: 'Send "book" to start a delivery request.',
            phoneNumberId,
          });
        } catch (err) {
          console.log("errr in main method", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
