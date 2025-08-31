//file: app/lib/googleMaps.ts
function enc(s: string): string {
  return encodeURIComponent(s);
}

/** Returns travel time in seconds between origin and destination. */
export async function getTravelSeconds(
  origin: string,
  destination: string,
  apiKey: string
): Promise<number> {
  try {
    if (!apiKey) throw new Error("Missing GOOGLE_MAPS_API_KEY");
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${enc(
      origin
    )}&destinations=${enc(destination)}&key=${apiKey}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`Distance Matrix HTTP ${res.status}`);
    const data = (await res.json()) as {
      status?: string;
      rows?: Array<{
        elements: Array<{ status?: string; duration?: { value: number } }>;
      }>;
    };

    if (data.status !== "OK" || !data.rows?.[0]?.elements?.[0]) {
      throw new Error("Distance Matrix returned no route");
    }
    const el = data.rows[0].elements[0];
    if (el.status && el.status !== "OK") throw new Error("No viable route");
    if (!el.duration?.value) throw new Error("Missing duration");

    return el.duration.value; // seconds
  } catch (err) {
    console.log(err);
    return 0;
  }
}
