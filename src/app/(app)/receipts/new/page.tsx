"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ReceiptExtraction, ReceiptType } from "@/lib/types";
import { ReceiptUpload } from "@/components/receipt-upload";
import { ReceiptReviewForm } from "@/components/receipt-review-form";
import { useToast } from "@/components/toast";

type Step = "upload" | "extracting" | "review" | "error";

export default function NewReceiptPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ReceiptExtraction | null>(null);
  const [exchangeInfo, setExchangeInfo] = useState<{ rate: number; eurAmount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFileSelected(file: File) {
    setStep("extracting");
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Nicht angemeldet");
      }

      // Generate unique filename
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
      }

      setImagePath(fileName);

      // Call extraction API
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: fileName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Extraktion fehlgeschlagen");
      }

      const { extraction, exchangeRate, eurAmount } = await response.json();
      setExtraction(extraction);
      if (exchangeRate && eurAmount) {
        setExchangeInfo({ rate: exchangeRate, eurAmount });
      }
      setStep("review");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      setStep("error");
    }
  }

  async function handleConfirm(data: {
    date: string;
    total_amount: number;
    currency: string;
    vendor_name: string;
    vendor_city: string;
    receipt_type: ReceiptType;
    vat_positions: ReceiptExtraction["vat_positions"];
    confidence: ReceiptExtraction["confidence"];
    raw_extraction: ReceiptExtraction;
    hospitality_occasion?: string;
    hospitality_attendees?: string;
    hospitality_tip?: number;
  }) {
    setSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !imagePath) {
        throw new Error("Nicht angemeldet oder kein Bild");
      }

      const { error: insertError } = await supabase.from("receipts").insert({
        user_id: user.id,
        image_path: imagePath,
        date: data.date,
        total_amount: data.total_amount,
        currency: data.currency,
        vendor_name: data.vendor_name,
        vendor_city: data.vendor_city,
        receipt_type: data.receipt_type,
        vat_positions: data.vat_positions,
        confidence: data.confidence,
        raw_extraction: data.raw_extraction,
        hospitality_occasion: data.hospitality_occasion || null,
        hospitality_attendees: data.hospitality_attendees || null,
        hospitality_tip: data.hospitality_tip || null,
        status: "confirmed",
      });

      if (insertError) {
        throw new Error(`Speichern fehlgeschlagen: ${insertError.message}`);
      }

      showToast("Beleg gespeichert!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "Speichern fehlgeschlagen", "error");
      setSaving(false);
    }
  }

  function handleDiscard() {
    setStep("upload");
    setImagePath(null);
    setExtraction(null);
    setError(null);
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Beleg erfassen</h1>

      {step === "upload" && (
        <ReceiptUpload onFileSelected={handleFileSelected} />
      )}

      {step === "extracting" && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-medium text-gray-700">
            Beleg wird analysiert...
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Dies kann einige Sekunden dauern.
          </p>
        </div>
      )}

      {step === "review" && extraction && (
        <>
          {exchangeInfo && (
            <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
              Fremdwährung erkannt: {extraction.total_amount?.toFixed(2)} {extraction.currency}
              {" = "}<strong>{exchangeInfo.eurAmount.toFixed(2)} EUR</strong>
              {" "}(Kurs: 1 EUR = {exchangeInfo.rate.toFixed(4)} {extraction.currency})
            </div>
          )}
          <ReceiptReviewForm
            extraction={extraction}
            onConfirm={handleConfirm}
            onDiscard={handleDiscard}
            saving={saving}
          />
        </>
      )}

      {step === "error" && (
        <div className="space-y-4">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error || "Ein Fehler ist aufgetreten."}
          </div>
          <button
            onClick={handleDiscard}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Erneut versuchen
          </button>
        </div>
      )}
    </div>
  );
}
