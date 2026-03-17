import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractReceipt } from "@/lib/extract-receipt";
import { getExchangeRate, convertToEur } from "@/lib/exchange-rates";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { imagePath } = await request.json();
    if (!imagePath) {
      return NextResponse.json(
        { error: "imagePath ist erforderlich" },
        { status: 400 }
      );
    }

    // Download image from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("receipts")
      .download(imagePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: "Bild konnte nicht geladen werden" },
        { status: 404 }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine MIME type
    const ext = imagePath.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/jpeg", // HEIC gets converted
      pdf: "application/pdf",
    };
    const mimeType = mimeMap[ext || ""] || "image/jpeg";

    // Extract receipt data via Claude Vision
    const extraction = await extractReceipt(base64, mimeType);

    // If foreign currency, fetch exchange rate
    let exchangeRate: number | null = null;
    let eurAmount: number | null = null;
    if (extraction.currency && extraction.currency !== "EUR" && extraction.total_amount) {
      exchangeRate = await getExchangeRate(extraction.currency);
      if (exchangeRate) {
        eurAmount = convertToEur(extraction.total_amount, exchangeRate);
      }
    }

    return NextResponse.json({ extraction, exchangeRate, eurAmount });
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      { error: "Extraktion fehlgeschlagen. Bitte versuche es erneut." },
      { status: 500 }
    );
  }
}
