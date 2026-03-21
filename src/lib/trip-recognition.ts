import Anthropic from "@anthropic-ai/sdk";
import type { TripAssignment } from "./types";

const client = new Anthropic();

interface ReceiptData {
  date: string | null;
  vendor_city: string | null;
  receipt_type: string;
}

interface ProfileData {
  city: string | null;
  primary_workplace: string | null;
}

interface ExistingTrip {
  id: string;
  destination: string;
  start_datetime: string;
  end_datetime: string;
}

function fuzzyMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-zäöüß]/g, "");
  return normalize(a) === normalize(b) || normalize(a).includes(normalize(b)) || normalize(b).includes(normalize(a));
}

function isDateInRange(date: string, start: string, end: string, bufferDays = 1): boolean {
  // Compare date-only (YYYY-MM-DD), ignoring time components
  const toDay = (s: string) => new Date(s.split("T")[0] + "T00:00:00");
  const d = toDay(date).getTime();
  const s2 = toDay(start).getTime() - bufferDays * 86400000;
  const e2 = toDay(end).getTime() + bufferDays * 86400000;
  return d >= s2 && d <= e2;
}

export async function recognizeTrip(
  receipt: ReceiptData,
  profile: ProfileData,
  existingTrips: ExistingTrip[]
): Promise<TripAssignment> {
  if (!receipt.date) {
    return { type: "none", confidence: 0 };
  }

  // Step 1: Check existing trips for match
  for (const trip of existingTrips) {
    const dateMatch = isDateInRange(receipt.date, trip.start_datetime, trip.end_datetime);
    const cityMatch = receipt.vendor_city && fuzzyMatch(receipt.vendor_city, trip.destination);

    if (dateMatch && cityMatch) {
      return { type: "existing", tripId: trip.id, tripTitle: trip.destination, confidence: 0.95 };
    }
    if (dateMatch) {
      return { type: "existing", tripId: trip.id, tripTitle: trip.destination, confidence: 0.7 };
    }
  }

  // Step 2: Ask Claude if this looks like a business trip
  if (!receipt.vendor_city || !profile.city) {
    return { type: "none", confidence: 0 };
  }

  // Skip if receipt is from home city
  if (fuzzyMatch(receipt.vendor_city, profile.city)) {
    return { type: "none", confidence: 0.8 };
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      system: `Du bist ein Assistent für Reisekostenabrechnungen. Antworte NUR mit validem JSON.`,
      messages: [
        {
          role: "user",
          content: `Gegeben dieser Beleg:
- Typ: ${receipt.receipt_type}
- Ort: ${receipt.vendor_city}
- Datum: ${receipt.date}

Homebase des Users: ${profile.city}
${profile.primary_workplace ? `Erste Tätigkeitsstätte: ${profile.primary_workplace}` : ""}

Ist das wahrscheinlich eine Dienstreise? Wenn ja, schlage Reiseziel und geschätzten Zeitraum vor.

Antworte als JSON: {"is_trip": boolean, "destination": string|null, "estimated_start": "YYYY-MM-DD"|null, "estimated_end": "YYYY-MM-DD"|null, "confidence": 0.0-1.0}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { type: "none", confidence: 0 };
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);

    if (result.is_trip && result.destination) {
      const dates = [
        result.estimated_start || receipt.date,
        result.estimated_end || receipt.date,
      ].join(" – ");

      return {
        type: "new_draft",
        confidence: result.confidence || 0.7,
        suggestedTrip: { destination: result.destination, dates },
      };
    }

    return { type: "none", confidence: result.confidence || 0.5 };
  } catch {
    return { type: "none", confidence: 0 };
  }
}
