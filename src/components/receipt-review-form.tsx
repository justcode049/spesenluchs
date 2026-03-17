"use client";

import { useState } from "react";
import { ReceiptExtraction, ReceiptType } from "@/lib/types";
import { ConfidenceField } from "./confidence-field";

const RECEIPT_TYPES: { value: ReceiptType; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "taxi", label: "Taxi" },
  { value: "public_transport", label: "ÖPNV" },
  { value: "gas_station", label: "Tankstelle" },
  { value: "parking", label: "Parken" },
  { value: "train", label: "Bahn" },
  { value: "flight", label: "Flug" },
  { value: "other", label: "Sonstiges" },
];

interface ReceiptReviewFormProps {
  extraction: ReceiptExtraction;
  onConfirm: (data: {
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
  }) => void;
  onDiscard: () => void;
  saving?: boolean;
}

export function ReceiptReviewForm({
  extraction,
  onConfirm,
  onDiscard,
  saving,
}: ReceiptReviewFormProps) {
  const [date, setDate] = useState(extraction.date || "");
  const [totalAmount, setTotalAmount] = useState(
    extraction.total_amount?.toString() || ""
  );
  const [currency, setCurrency] = useState(extraction.currency || "EUR");
  const [vendorName, setVendorName] = useState(extraction.vendor_name || "");
  const [vendorCity, setVendorCity] = useState(extraction.vendor_city || "");
  const [receiptType, setReceiptType] = useState<ReceiptType>(
    extraction.receipt_type || "other"
  );
  const [hospitalityOccasion, setHospitalityOccasion] = useState("");
  const [hospitalityAttendees, setHospitalityAttendees] = useState("");
  const [hospitalityTip, setHospitalityTip] = useState("");

  const isRestaurant = receiptType === "restaurant";

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!date || !totalAmount || !receiptType) {
      alert("Bitte fülle alle Pflichtfelder aus.");
      return;
    }

    onConfirm({
      date,
      total_amount: parseFloat(totalAmount),
      currency,
      vendor_name: vendorName,
      vendor_city: vendorCity,
      receipt_type: receiptType,
      vat_positions: extraction.vat_positions,
      confidence: extraction.confidence,
      raw_extraction: extraction,
      ...(isRestaurant && {
        hospitality_occasion: hospitalityOccasion || undefined,
        hospitality_attendees: hospitalityAttendees || undefined,
        hospitality_tip: hospitalityTip ? parseFloat(hospitalityTip) : undefined,
      }),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
        KI-Extraktion abgeschlossen. Bitte prüfe die Daten und korrigiere bei Bedarf.
      </div>

      <ConfidenceField
        label="Datum"
        confidence={extraction.confidence.date}
        required
      >
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={inputClass}
        />
      </ConfidenceField>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <ConfidenceField
            label="Betrag"
            confidence={extraction.confidence.total_amount}
            required
          >
            <input
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
              className={inputClass}
            />
          </ConfidenceField>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Währung
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputClass}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CHF">CHF</option>
          </select>
        </div>
      </div>

      <ConfidenceField
        label="Händler"
        confidence={extraction.confidence.vendor_name}
      >
        <input
          type="text"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          className={inputClass}
          placeholder="z.B. Restaurant Zum Wirt"
        />
      </ConfidenceField>

      <ConfidenceField label="Stadt">
        <input
          type="text"
          value={vendorCity}
          onChange={(e) => setVendorCity(e.target.value)}
          className={inputClass}
          placeholder="z.B. München"
        />
      </ConfidenceField>

      <ConfidenceField
        label="Belegart"
        confidence={extraction.confidence.receipt_type}
        required
      >
        <select
          value={receiptType}
          onChange={(e) => setReceiptType(e.target.value as ReceiptType)}
          required
          className={inputClass}
        >
          {RECEIPT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </ConfidenceField>

      {/* Bewirtungsbeleg-Felder */}
      {isRestaurant && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-orange-700">
            Bewirtungsbeleg (steuerlich: 70% absetzbar)
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Anlass der Bewirtung
            </label>
            <input
              type="text"
              value={hospitalityOccasion}
              onChange={(e) => setHospitalityOccasion(e.target.value)}
              className={inputClass}
              placeholder="z.B. Geschäftsessen mit Kunde XY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Teilnehmer (Name, Firma)
            </label>
            <textarea
              value={hospitalityAttendees}
              onChange={(e) => setHospitalityAttendees(e.target.value)}
              className={inputClass + " resize-none"}
              rows={2}
              placeholder="z.B. Max Müller, Firma ABC&#10;Anna Schmidt, Firma XYZ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Trinkgeld
            </label>
            <input
              type="number"
              step="0.01"
              value={hospitalityTip}
              onChange={(e) => setHospitalityTip(e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      {extraction.vat_positions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            MwSt-Positionen
          </label>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-1">
            {extraction.vat_positions.map((vat, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-600">
                <span>{(vat.rate * 100).toFixed(0)}% MwSt</span>
                <span>
                  Netto {vat.net.toFixed(2)} + {vat.vat.toFixed(2)} MwSt ={" "}
                  {vat.gross.toFixed(2)} {currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Wird gespeichert..." : "Bestätigen & Speichern"}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="rounded-md border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Verwerfen
        </button>
      </div>
    </form>
  );
}
