import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { validateFlowResults } from "@/lib/validate";
import { getTravelSeconds } from "@/lib/googleMaps";
import { sendButtons, sendFlow, sendText } from "@/lib/whatsapphelper";
import type { FlowResults, PriceQuote } from "@/lib/types";

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

// X-Hub-Signature-256 verification (recommended)
function verifySignature(
  header: string | null,
  rawBody: string,
  appSecret: string
): boolean {
  if (!header) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// --- Webhook Events (POST) ---
export async function POST(req: NextRequest): Promise<NextResponse> {
  debugger;
  const raw = await req.text();

  // const appSecret = process.env.WHATSAPP_APP_SECRET ?? "";
  // const sig = req.headers.get("x-hub-signature-256");
  // if (appSecret) {
  //   const ok = verifySignature(sig, raw, appSecret);
  //   if (!ok) return new NextResponse("Invalid signature", { status: 401 });
  // }

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

      const phoneNumberId = value.metadata?.phone_number_id; // for sending replies (optional)
      for (const m of value.messages) {
        const from = m.from;

        try {
          if (m.type === "text") {
            const body = m.text?.body?.trim().toLowerCase() ?? "";
            if (
              body === "start" ||
              body.includes("book") ||
              body.includes("delivery")
            ) {
              await sendFlow({
                to: from,
                headerText: "Porter Booking",
                bodyText: "Fill in your delivery details to get a quote.",
                flowId: process.env.WHATSAPP_FLOW_ID ?? "",
                phoneNumberId,
              });
            } else {
              await sendText({
                to: from,
                body: 'Send "book" to start the delivery flow.',
                phoneNumberId,
              });
            }
            continue;
          }

          if (m.type === "interactive" && m.interactive) {
            // --- Flow submission path ---
            if (
              (m.interactive as WAMessageInteractiveFlowReply).type ===
              "flow_reply"
            ) {
              const i = m.interactive as WAMessageInteractiveFlowReply;
              const results = i.results ?? i.flow_reply?.results ?? {};
              const valid: FlowResults = validateFlowResults(results ?? {});

              // Google Maps time
              const seconds = await getTravelSeconds(
                valid.pickup_location,
                valid.destination_address,
                process.env.GOOGLE_MAPS_API_KEY ?? ""
              );
              const minutes = Math.max(1, Math.ceil(seconds / 60));
              const quote: PriceQuote = {
                seconds,
                minutes,
                amountUsd: minutes * 1,
              };

              // reply with estimate + confirm/cancel
              await sendButtons({
                to: from,
                body:
                  `🚚 *Delivery Quote*\n` +
                  `Sender: ${valid.sender_name} (${valid.sender_phone})\n` +
                  `Recipient: ${valid.recipient_name} (${valid.recipient_phone})\n` +
                  `Vehicle: ${valid.vehicle_type}\n` +
                  `Item: ${valid.order_details}\n` +
                  `From: ${valid.pickup_location}\n` +
                  `To: ${valid.destination_address}\n\n` +
                  `⏱️ ETA: ~${minutes} min\n` +
                  `💵 Price: $${quote.amountUsd}\n\n` +
                  `Confirm booking?`,
                buttons: [
                  { id: "confirm_booking", title: "Confirm" },
                  { id: "cancel_booking", title: "Cancel" },
                ],
                phoneNumberId,
              });
              continue;
            }

            // --- Button reply path ---
            if (
              (m.interactive as WAMessageInteractiveButtonReply).type ===
              "button_reply"
            ) {
              const btn = (m.interactive as WAMessageInteractiveButtonReply)
                .button_reply;
              if (btn.id === "confirm_booking") {
                await sendText({
                  to: from,
                  body: "✅ Booking confirmed. We'll assign a porter and update you shortly.",
                  phoneNumberId,
                });
              } else if (btn.id === "cancel_booking") {
                await sendText({
                  to: from,
                  body: '❌ Booking cancelled. Send "book" to start again.',
                  phoneNumberId,
                });
              }
              continue;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unexpected error";
          await sendText({
            to: from,
            body: `Sorry, something went wrong: ${msg}`,
            phoneNumberId,
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
