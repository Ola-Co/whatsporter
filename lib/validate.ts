//file: app/lib/validate.ts
import type { FlowResults, VehicleType } from "./types";

const E164 = /^\+?[1-9]\d{7,14}$/;
const VEHICLES: ReadonlyArray<VehicleType> = ["Bike", "Car", "Van"] as const;

export function isE164(phone: string): boolean {
  return E164.test(phone.trim());
}

function getRequiredString(
  obj: Record<string, unknown>,
  key: keyof FlowResults
): string {
  const v = obj[key];
  if (typeof v !== "string") throw new Error(`Field ${key} is required`);
  const s = v.trim();
  if (!s) throw new Error(`Field ${key} cannot be empty`);
  return s;
}

function sanitizeAddress(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function validateFlowResults(
  input: Record<string, unknown>
): FlowResults {
  const sender_phone = getRequiredString(input, "sender_phone");
  const recipient_phone = getRequiredString(input, "recipient_phone");
  const destination_phone = getRequiredString(input, "destination_phone");

  if (!isE164(sender_phone)) throw new Error("Sender phone must be E.164");
  if (!isE164(recipient_phone))
    throw new Error("Recipient phone must be E.164");
  if (!isE164(destination_phone))
    throw new Error("Destination phone must be E.164");

  const vehicle_type_raw = getRequiredString(input, "vehicle_type");
  if (!VEHICLES.includes(vehicle_type_raw as VehicleType))
    throw new Error("Invalid vehicle type");
  const vehicle_type = vehicle_type_raw as VehicleType;

  const pickup_location = sanitizeAddress(
    getRequiredString(input, "pickup_location")
  );
  const destination_address = sanitizeAddress(
    getRequiredString(input, "destination_address")
  );
  const order_details = getRequiredString(input, "order_details");

  return {
    sender_name: getRequiredString(input, "sender_name"),
    sender_phone,
    recipient_name: getRequiredString(input, "recipient_name"),
    recipient_phone,
    vehicle_type,
    order_details,
    pickup_location,
    destination_address,
    destination_phone,
  };
}
