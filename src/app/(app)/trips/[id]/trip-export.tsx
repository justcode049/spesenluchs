"use client";

import { useState } from "react";
import { DayAllowance } from "@/lib/types";
import { useToast } from "@/components/toast";

interface TripExportProps {
  trip: {
    title: string | null;
    destination: string;
    start_datetime: string;
    end_datetime: string;
  };
  userName: string;
  allowances: DayAllowance[];
  receipts: Array<{
    date: string | null;
    vendor_name: string | null;
    total_amount: number | null;
    currency: string;
    receipt_type: string;
    vendor_city: string | null;
  }>;
  mileage: Array<{
    date: string;
    start_location: string;
    end_location: string;
    distance_km: number;
    is_round_trip: boolean;
    vehicle_type: string;
    rate_per_km: number;
    total_amount: number;
  }>;
}

export function TripExport({
  trip,
  userName,
  allowances,
  receipts,
  mileage,
}: TripExportProps) {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportData = {
    title: trip.title || trip.destination,
    destination: trip.destination,
    startDate: trip.start_datetime.split("T")[0],
    endDate: trip.end_datetime.split("T")[0],
    userName,
    allowances,
    receipts,
    mileage,
  };

  async function handlePdfExport() {
    setExporting(true);
    try {
      const { generatePDF } = await import("@/lib/export-pdf");
      const doc = generatePDF(exportData);
      const fileName = `Reisekosten_${exportData.title.replace(/\s+/g, "_")}_${exportData.startDate}.pdf`;
      doc.save(fileName);
      showToast("PDF exportiert!");
    } catch (err) {
      console.error(err);
      showToast("PDF-Export fehlgeschlagen.", "error");
    }
    setExporting(false);
  }

  function handleCsvExport() {
    try {
      const { generateCSV } = require("@/lib/export-csv");
      const csv = generateCSV(exportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reisekosten_${exportData.title.replace(/\s+/g, "_")}_${exportData.startDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("CSV exportiert!");
    } catch (err) {
      console.error(err);
      showToast("CSV-Export fehlgeschlagen.", "error");
    }
  }

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Export</h2>
      <div className="flex gap-3">
        <button
          onClick={handlePdfExport}
          disabled={exporting}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? "Wird erstellt..." : "PDF Export"}
        </button>
        <button
          onClick={handleCsvExport}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          CSV Export
        </button>
      </div>
    </div>
  );
}
