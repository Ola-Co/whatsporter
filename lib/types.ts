//file: app/lib/types.ts
export type VehicleType = "Bike" | "Car" | "Van";

export interface FlowResults {
  sender_name: string;
  sender_phone: string; // E.164
  recipient_name: string;
  recipient_phone: string; // E.164
  vehicle_type: VehicleType;
  order_details: string; // what is being picked up
  pickup_location: string; // known place or address
  destination_address: string;
  destination_phone: string; // E.164
}

export interface PriceQuote {
  seconds: number; // from Google
  minutes: number; // Math.ceil(seconds/60)
  amountUsd: number; // $1 per minute
}
