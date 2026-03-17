import Anthropic from "@anthropic-ai/sdk";
import { ReceiptExtraction } from "./types";

const client = new Anthropic();

const SYSTEM_PROMPT = `Du bist ein Experte für die Extraktion von Daten aus deutschen Belegen und Rechnungen.
Analysiere das Belegbild und extrahiere strukturierte Daten.

Regeln:
- Datumsformat: YYYY-MM-DD (ISO)
- Beträge als Zahlen (nicht als Strings), in der Währung des Belegs
- Identifiziere ALLE MwSt-Positionen separat (7% und 19% sind üblich in Deutschland)
- Klassifiziere den Belegtyp: hotel, restaurant, taxi, public_transport, gas_station, parking, train, flight, other
- Gib Konfidenz-Scores (0-100) für jedes Feld an
- Wenn ein Feld unleserlich oder nicht vorhanden ist, setze es auf null mit Konfidenz 0
- HALLUZINIERE NICHT. Ein niedriger Konfidenz-Score ist besser als falsche Daten.
- vendor_city: Die Stadt in der der Händler/das Restaurant etc. sich befindet (aus Adresse auf dem Beleg)

Antworte NUR mit validem JSON, ohne Markdown-Formatierung, ohne Code-Blocks. Das JSON muss diesem Schema entsprechen:
{
  "date": "YYYY-MM-DD" | null,
  "total_amount": number | null,
  "currency": "EUR" | string,
  "vat_positions": [{"rate": number, "net": number, "vat": number, "gross": number}],
  "vendor_name": string | null,
  "vendor_city": string | null,
  "receipt_type": "hotel"|"restaurant"|"taxi"|"public_transport"|"gas_station"|"parking"|"train"|"flight"|"other",
  "confidence": {
    "date": number,
    "total_amount": number,
    "vendor_name": number,
    "vat_positions": number,
    "receipt_type": number
  }
}`;

export async function extractReceipt(
  imageBase64: string,
  mimeType: string
): Promise<ReceiptExtraction> {
  const isPdf = mimeType === "application/pdf";

  // Build the content block depending on file type
  const fileBlock: Anthropic.Messages.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: imageBase64,
        },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: imageBase64,
        },
      };

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          fileBlock,
          {
            type: "text",
            text: "Extrahiere alle Daten aus diesem Beleg.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Clean potential markdown formatting
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const extraction: ReceiptExtraction = JSON.parse(jsonStr);
  return extraction;
}
